import { useMemo } from "react";
import { CalendarClock, Rocket, MessageSquare, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil } from "../format";
import type { Consultation, LoanStatus } from "../types";

type KpiKey = "signing_today" | "execution_today" | "new_message" | "new_application" | "stuck";

type Props = {
  rows: Consultation[];
  active?: KpiKey | null;
  onSelect?: (key: KpiKey | null) => void;
};

const STAGE_WARN_DAYS: Partial<Record<LoanStatus, number>> = {
  apply: 3,
  consulting: 5,
  reviewing: 7,
  result: 3,
  signing_reservation: 5,
};

export function KpiStrip({ rows, active, onSelect }: Props) {
  const stats = useMemo(() => {
    let signingToday = 0;
    let executionToday = 0;
    let newMessage = 0;
    let newApplication = 0;
    let stuck = 0;
    const now = Date.now();
    for (const r of rows) {
      const status = (r.loan_status ?? "apply") as LoanStatus;
      // 자서 D-0 (signing_reservation 또는 signing 단계, 자서일이 오늘)
      if ((status === "signing_reservation" || status === "signing") && daysUntil(r.signing_date) === 0) {
        signingToday++;
      }
      // 실행 D-0
      if (status === "executing" && daysUntil(r.execution_date) === 0) {
        executionToday++;
      }
      // 새 메시지 (resident_last_action_type === "message")
      if (r.resident_last_action_type === "message") newMessage++;
      // 신청서 도착
      if (status === "apply" && r.loan_application_at) newApplication++;
      // 정체
      if (r.stage_changed_at) {
        const dwell = Math.floor((now - new Date(r.stage_changed_at).getTime()) / 86_400_000);
        const warnAt = STAGE_WARN_DAYS[status];
        if (warnAt != null && dwell >= warnAt) stuck++;
      }
    }
    return { signingToday, executionToday, newMessage, newApplication, stuck };
  }, [rows]);

  const items: Array<{ key: KpiKey; label: string; count: number; icon: typeof Rocket; tone: string }> = [
    { key: "signing_today", label: "자서 D-0", count: stats.signingToday, icon: CalendarClock, tone: "indigo" },
    { key: "execution_today", label: "실행 D-0", count: stats.executionToday, icon: Rocket, tone: "rose" },
    { key: "new_application", label: "신청 도착", count: stats.newApplication, icon: FileText, tone: "blue" },
    { key: "new_message", label: "새 메시지", count: stats.newMessage, icon: MessageSquare, tone: "emerald" },
    { key: "stuck", label: "정체", count: stats.stuck, icon: AlertTriangle, tone: "amber" },
  ];

  const total = items.reduce((s, it) => s + it.count, 0);
  if (total === 0) return null;

  return (
    <div className="px-2 py-2 bg-card border-b border-border overflow-x-auto">
      <div className="flex gap-1.5 min-w-max">
        {items
          .filter((it) => it.count > 0)
          .map((it) => {
            const Icon = it.icon;
            const isActive = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => onSelect?.(isActive ? null : it.key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors",
                  isActive
                    ? toneActive(it.tone)
                    : tonePassive(it.tone)
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", toneIcon(it.tone))} />
                <span className="text-[11px] font-semibold whitespace-nowrap">{it.label}</span>
                <span className={cn("text-[12.5px] font-bold tabular-nums", toneText(it.tone))}>
                  {it.count}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function filterByKpi(rows: Consultation[], key: KpiKey): Consultation[] {
  switch (key) {
    case "signing_today":
      return rows.filter((r) => {
        const s = r.loan_status as LoanStatus;
        return (s === "signing_reservation" || s === "signing") && daysUntil(r.signing_date) === 0;
      });
    case "execution_today":
      return rows.filter((r) => r.loan_status === "executing" && daysUntil(r.execution_date) === 0);
    case "new_message":
      return rows.filter((r) => r.resident_last_action_type === "message");
    case "new_application":
      return rows.filter((r) => r.loan_status === "apply" && r.loan_application_at);
    case "stuck":
      return rows.filter((r) => {
        if (!r.stage_changed_at) return false;
        const dwell = Math.floor((Date.now() - new Date(r.stage_changed_at).getTime()) / 86_400_000);
        const warnAt = STAGE_WARN_DAYS[(r.loan_status ?? "apply") as LoanStatus];
        return warnAt != null && dwell >= warnAt;
      });
  }
}

function tonePassive(t: string): string {
  return {
    indigo: "bg-indigo-50 border-indigo-100",
    rose: "bg-rose-50 border-rose-100",
    blue: "bg-blue-50 border-blue-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
  }[t] || "bg-card border-border";
}
function toneActive(t: string): string {
  return {
    indigo: "bg-indigo-100 border-indigo-300",
    rose: "bg-rose-100 border-rose-300",
    blue: "bg-blue-100 border-blue-300",
    emerald: "bg-emerald-100 border-emerald-300",
    amber: "bg-amber-100 border-amber-300",
  }[t] || "bg-accent border-border";
}
function toneIcon(t: string): string {
  return {
    indigo: "text-indigo-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }[t] || "text-foreground";
}
function toneText(t: string): string {
  return {
    indigo: "text-indigo-700",
    rose: "text-rose-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  }[t] || "text-foreground";
}

export type { KpiKey };
