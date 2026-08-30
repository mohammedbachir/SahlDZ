import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listRestaurantManagers,
  type RestaurantManagerRow,
} from "@/lib/manager-db.functions";
import { KeyRound, Download, Copy, Search, Users } from "lucide-react";

export const Route = createFileRoute("/internal/managers")({
  component: ManagersDb,
});

function toCsv(rows: RestaurantManagerRow[]): string {
  const header = [
    "restaurant_id",
    "restaurant_name",
    "owner_name",
    "owner_email",
    "owner_phone",
    "whatsapp_number",
    "phone",
    "marketing_consent",
    "created_at",
  ];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.restaurant_id,
      r.restaurant_name,
      r.owner_name,
      r.owner_email,
      r.owner_phone,
      r.whatsapp_number,
      r.phone,
      r.marketing_consent ? "نعم" : "لا",
      r.created_at,
    ]
      .map(esc)
      .join(","),
  );
  return "\uFEFF" + [header.map(esc).join(","), ...lines].join("\r\n");
}

function ManagersDb() {
  const listFn = useServerFn(listRestaurantManagers);
  const [key, setKey] = useState(
    () => localStorage.getItem("sahl_dz_admin_key") ?? "",
  );
  const [rows, setRows] = useState<RestaurantManagerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyConsented, setOnlyConsented] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    if (!key.trim()) {
      toast.error("أدخل مفتاح المدير أولاً");
      return;
    }
    localStorage.setItem("sahl_dz_admin_key", key.trim());
    setLoading(true);
    try {
      const res = await listFn({ headers: { "x-admin-key": key.trim() } });
      if (!res.ok) {
        toast.error(
          res.reason === "unauthorized"
            ? "المفتاح غير صحيح"
            : res.reason === "preview"
              ? "أداة الداخلية تعمل مع قاعدة بيانات حقيقية فقط"
              : res.reason || "تعذر الوصول",
        );
        return;
      }
      setRows(res.managers);
      toast.success(`تم جلب ${res.managers.length} مدير مطعم`);
    } catch (err) {
      toast.error((err as Error).message || "تعذر التواصل مع الخادم");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    const csv = toCsv(visibleRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sahldz-managers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(visibleRows, null, 2));
      toast.success("تم نسخ JSON");
    } catch {
      /* silent */
    }
  }

  const visibleRows = rows.filter((r) => {
    if (onlyConsented && !r.marketing_consent) return false;
    if (search.trim()) {
      const q = search.trim();
      const hay = `${r.restaurant_name} ${r.owner_name} ${r.owner_email} ${r.owner_phone} ${r.whatsapp_number}`;
      if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] p-4" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">قاعدة بيانات مدراء المطاعم</h1>
            <p className="text-xs text-muted-foreground">
              أداة داخلية — تُصفح للمديرين ومواصلة استغلال المستقبل (الإعلانات)
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="مفتاح الإدارة (SAHLDZ_ADMIN_KEY)"
              dir="ltr"
              className="flex-1 px-3 py-2 rounded-xl bg-muted/40 border border-border/40 text-sm"
            />
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "..." : "جلب البيانات"}
            </button>
          </div>

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyConsented}
                  onChange={(e) => setOnlyConsented(e.target.checked)}
                  className="accent-[var(--primary)]"
                />
                فقط الموافقون على التواصل
              </label>
              <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث باسم المطعم أو المدير أو البريد..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-sm"
                />
              </div>
              <button
                onClick={downloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-amber-600 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-amber-600 text-xs font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                JSON
              </button>
              <span className="text-xs text-muted-foreground">
                {visibleRows.length} من {rows.length}
              </span>
            </div>
          )}
        </div>

        {visibleRows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="text-right p-3">المطعم</th>
                  <th className="text-right p-3">المدير</th>
                  <th className="text-right p-3">البريد</th>
                  <th className="text-right p-3">الهاتف</th>
                  <th className="text-right p-3">واتساب</th>
                  <th className="text-right p-3">موافقة</th>
                  <th className="text-right p-3">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr
                    key={r.restaurant_id}
                    className="border-b border-border/20 last:border-0"
                  >
                    <td className="p-3 font-medium">{r.restaurant_name}</td>
                    <td className="p-3">{r.owner_name || "—"}</td>
                    <td className="p-3" dir="ltr">
                      {r.owner_email || "—"}
                    </td>
                    <td className="p-3" dir="ltr">
                      {r.owner_phone || r.phone || "—"}
                    </td>
                    <td className="p-3" dir="ltr">
                      {r.whatsapp_number || "—"}
                    </td>
                    <td className="p-3">
                      {r.marketing_consent ? (
                        <span className="text-green-500 font-semibold">
                          نعم
                        </span>
                      ) : (
                        <span className="text-muted-foreground">لا</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground" dir="ltr">
                      {r.created_at ? r.created_at.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
