import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess, useAreaPermission } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";
import {
  Archive,
  Loader2,
  RefreshCcw,
  FileText,
  Download,
  Eye,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tx } from "@/lib/ops-tx";
import {
  listReports,
  getReportFull,
  openReportPdf,
  downloadReportPdf,
  regenerateReport,
  REPORT_LABELS,
  type ReportType,
} from "@/lib/report-archive";

export const Route = createFileRoute("/ops/report-archive")({
  beforeLoad: requireOpsAccess("reportArchive"),
  component: ReportArchive,
});

type Row = {
  id: string;
  type: ReportType;
  month: string;
  restaurant_name: string;
  generated_at: string;
  summary: Record<string, unknown>;
};

function monthLabel(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  const names = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return `${names[m - 1]} ${y}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

const TYPE_COLORS: Record<ReportType, string> = {
  accounting: "bg-success/10 text-success border border-success/20",
  reports: "bg-[#3D6F9E]/10 text-[#3D6F9E] border border-[#3D6F9E]/20",
  staff_performance: "bg-primary/10 text-primary border border-primary/20",
};

function ReportArchive() {
  const { restaurantId } = useRestaurantId();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const reports = await listReports(restaurantId);
    setRows(
      reports
        .filter((r) => !!r.month)
        .map((r) => ({
          id: r.id,
          type: r.type,
          month: r.month,
          restaurant_name: r.restaurant_name ?? "",
          generated_at: r.generated_at ?? "",
          summary: r.summary ?? {},
        })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const handleRegenerate = async (type: ReportType, mk: string) => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle();
    const name = (data as any)?.name ?? "";
    setBusyId(`${type}-${mk}`);
    try {
      const rep = await regenerateReport(restaurantId, name, type, mk);
      if (rep) {
        toast.success(`تم إنشاء تقرير ${REPORT_LABELS[type]}`);
        await load();
      } else {
        toast.error("فشل إنشاء التقرير");
      }
    } catch (e) {
      console.error(e);
      toast.error("فشل إنشاء التقرير");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (row: Row) => {
    const report = await getReportFull(row.id);
    if (report?.pdf) openReportPdf(report);
    else toast.error("التقرير لا يملك ملف PDF محفوظ");
  };

  const handleDownload = async (row: Row) => {
    const report = await getReportFull(row.id);
    if (report?.pdf) downloadReportPdf(report);
    else toast.error("التقرير لا يملك ملف PDF محفوظ");
  };

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.month));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-lg font-bold">{tx("أرشيف التقارير")}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          className="gap-1.5"
        >
          <RefreshCcw className="w-4 h-4" />
          {tx("تحديث")}
        </Button>
      </div>

      <Card className="p-3 text-sm text-[var(--muted-foreground)]">
        تُحفظ تقارير (المحاسبة، التقارير، أداء الموظفين) تلقائياً بشكل PDF في
        بداية كل شهر. كما يمكنك إنشاء تقرير يدوياً في أي وقت.
      </Card>

      {loading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          لا توجد تقارير محفوظة بعد. قم بإنشاء تقرير للشهر الحالي.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{tx("الشهر")}</TableHead>
                <TableHead className="text-xs">{tx("نوع التقرير")}</TableHead>
                <TableHead className="text-xs">{tx("تاريخ الإنشاء")}</TableHead>
                <TableHead className="text-xs">{tx("الإجراءات")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.type}-${row.month}`}>
                  <TableCell className="text-sm font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-[var(--muted-foreground)]" />
                      {monthLabel(row.month)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${TYPE_COLORS[row.type]}`}
                    >
                      {REPORT_LABELS[row.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {formatDate(row.generated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => void handleOpen(row)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {tx("عرض")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => void handleDownload(row)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {tx("تحميل")}
                      </Button>
                      <CanWrite area="reportArchive">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled={busyId === `${row.type}-${row.month}`}
                        onClick={() =>
                          void handleRegenerate(row.type, row.month)
                        }
                      >
                        {busyId === `${row.type}-${row.month}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        {tx("إعادة توليد")}
                      </Button>
                      </CanWrite>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {months.length > 0 ? (
        <Card className="p-3">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">
            شهور متوفرة
          </div>
          <div className="flex flex-wrap gap-2">
            {months.map((m) => (
              <Badge key={m} variant="secondary" className="text-[11px]">
                {monthLabel(m)}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
