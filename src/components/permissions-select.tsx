import { useState } from "react";
import {
  ChefHat,
  UtensilsCrossed,
  Calculator,
  ChevronDown,
  Check,
  Lock,
  Pencil,
} from "lucide-react";
import {
  INTERFACE_PERMISSIONS,
  OPS_AREAS,
  OPS_AREA_LABELS,
  permissionLabel,
  type StaffInterface,
  type StaffOpsArea,
} from "@/lib/staff-permissions";

const INTERFACE_ICONS: Record<StaffInterface, typeof ChefHat> = {
  kitchen: ChefHat,
  waiter: UtensilsCrossed,
  cashier: Calculator,
};

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

function hasInterface(value: string[], id: StaffInterface): boolean {
  return value.includes(id);
}

function hasArea(value: string[], area: StaffOpsArea): boolean {
  return value.includes(area) || value.includes(`${area}:write`);
}

function hasWrite(value: string[], area: StaffOpsArea): boolean {
  return value.includes(`${area}:write`);
}

export function PermissionsSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const toggleInterface = (id: StaffInterface) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange([...set]);
  };

  const toggleArea = (area: StaffOpsArea) => {
    const set = new Set(value);
    if (set.has(area) || set.has(`${area}:write`)) {
      set.delete(area);
      set.delete(`${area}:write`);
    } else {
      set.delete(area);
      set.add(`${area}:write`);
    }
    onChange([...set]);
  };

  const toggleWrite = (area: StaffOpsArea) => {
    const set = new Set(value);
    if (set.has(`${area}:write`)) {
      set.delete(`${area}:write`);
    } else {
      set.delete(area);
      set.add(`${area}:write`);
    }
    onChange([...set]);
  };

  const summary =
    value.length === 0
      ? "بدون صلاحيات"
      : value.length === 1
        ? permissionLabel(value[0])
        : `${value.length} صلاحيات`;

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-right">{summary}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="rounded-xl border bg-[var(--card)] shadow-sm p-2 space-y-3 text-right">
          <div>
            <div className="px-2 py-1 text-[11px] font-bold text-[var(--muted-foreground)]">
              واجهات التشغيل
            </div>
            <div className="space-y-1">
              {INTERFACE_PERMISSIONS.map((p) => {
                const Icon = INTERFACE_ICONS[p.id];
                const active = hasInterface(value, p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleInterface(p.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "hover:bg-[var(--muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {p.label}
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-2">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                أقسام الإدارة
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                <Lock className="inline h-3 w-3" /> إطلاع ·{" "}
                <Pencil className="inline h-3 w-3" /> تعديل
              </span>
            </div>
            <div className="space-y-1">
              {OPS_AREAS.map((area) => {
                const active = hasArea(value, area);
                const write = hasWrite(value, area);
                return (
                  <div
                    key={area}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1"
                  >
                    <label className="flex flex-1 items-center gap-2 text-sm cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        className="accent-[var(--primary)]"
                        checked={active}
                        onChange={() => toggleArea(area)}
                      />
                      <span className="truncate">{OPS_AREA_LABELS[area]}</span>
                    </label>
                    {active && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleWrite(area)}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                            write
                              ? "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                              : "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          }`}
                        >
                          {write ? "إطلاع فقط" : "تعديل"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
