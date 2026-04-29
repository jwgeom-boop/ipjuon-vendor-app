import { ClipboardList, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, ddayLabel } from "../format";
import type { Consultation, LoanStatus } from "../types";

type Props = { data: Consultation };

type TaskInfo = {
  title: string;
  body: string;
  tone: "info" | "warning" | "danger" | "success" | "neutral";
};

function deriveTask(c: Consultation): TaskInfo {
  const status = (c.loan_status ?? "apply") as LoanStatus;

  switch (status) {
    case "apply":
      return c.loan_application_at
        ? {
            title: "신청서 도착 — 가심사 수용 처리",
            body: "고객이 대출신청서를 제출했습니다. 내용 확인 후 수용 또는 보완 요청을 보내세요.",
            tone: "warning",
          }
        : {
            title: "신청서 제출 안내",
            body: "고객에게 메시지·전화로 대출신청서 작성을 안내해주세요.",
            tone: "info",
          };

    case "consulting":
      return {
        title: "상담 진행 — 서류 안내",
        body: "필요 서류(소득자료·신분증·계약서) 안내 및 수령 후 심사 단계로 이동.",
        tone: "info",
      };

    case "reviewing":
      return {
        title: "심사 진행 중",
        body: "내부 심사 완료 후 결과를 고객에게 통보하세요.",
        tone: "neutral",
      };

    case "result":
      return {
        title: "심사결과 통보 — 자서 일정 잡기",
        body: "심사 결과를 고객에게 안내하고 자서 캘린더를 공개해주세요.",
        tone: "warning",
      };

    case "signing_reservation":
      if (c.signing_confirmed_at) {
        const d = daysUntil(c.signing_date);
        return {
          title: `자서 일정 확정 — ${ddayLabel(c.signing_date)}`,
          body: `${c.signing_date} ${c.signing_selected_time ?? ""} · ${c.signing_selected_location_str ?? ""}`,
          tone: d != null && d <= 1 ? "danger" : d != null && d <= 3 ? "warning" : "success",
        };
      }
      if (c.signing_selected_date) {
        return {
          title: "👤 고객이 시간 선택 — 확정 필요",
          body: `선택: ${c.signing_selected_date} ${c.signing_selected_time ?? ""} · ${c.signing_selected_location_str ?? ""}. 확정 버튼을 눌러 진행하세요.`,
          tone: "danger",
        };
      }
      return {
        title: "자서 캘린더 공개 필요",
        body: "고객이 자서일을 선택할 수 있도록 캘린더를 공개해주세요.",
        tone: "warning",
      };

    case "signing": {
      const d = daysUntil(c.signing_date);
      return {
        title: d === 0 ? "오늘 자서 진행" : `자서 예정 — ${ddayLabel(c.signing_date)}`,
        body: `${c.signing_date ?? ""} ${c.signing_time ?? ""}. 자서 후 서류 취합을 잊지 마세요.`,
        tone: d != null && d <= 0 ? "danger" : "warning",
      };
    }

    case "executing": {
      const d = daysUntil(c.execution_date);
      return {
        title: d === 0 ? "오늘 실행 — 정산 확정" : `실행 예정 — ${ddayLabel(c.execution_date)}`,
        body: `${c.execution_date ?? ""}. 정산서 확인 후 실행 처리.`,
        tone: d != null && d <= 0 ? "danger" : d != null && d <= 2 ? "warning" : "info",
      };
    }

    case "done":
      return {
        title: "실행 완료 ✓",
        body: "모든 절차가 완료되었습니다.",
        tone: "success",
      };

    case "cancel_requested":
      return {
        title: "🚨 입주민 취소 요청",
        body: "고객이 앱에서 취소 요청을 보냈습니다. 확인 후 처리해주세요.",
        tone: "danger",
      };

    case "cancel":
      return {
        title: "취소 처리됨",
        body: "이 상담 건은 취소되었습니다.",
        tone: "neutral",
      };
  }
}

const TONE_STYLES: Record<TaskInfo["tone"], { bg: string; border: string; iconColor: string; titleColor: string }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200", iconColor: "text-blue-600", titleColor: "text-blue-900" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", iconColor: "text-amber-600", titleColor: "text-amber-900" },
  danger: { bg: "bg-rose-50", border: "border-rose-300", iconColor: "text-rose-600", titleColor: "text-rose-900" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", iconColor: "text-emerald-600", titleColor: "text-emerald-900" },
  neutral: { bg: "bg-muted/40", border: "border-border", iconColor: "text-muted-foreground", titleColor: "text-foreground" },
};

export function TaskBox({ data }: Props) {
  const task = deriveTask(data);
  const styles = TONE_STYLES[task.tone];
  const Icon = task.tone === "danger" ? AlertTriangle : ClipboardList;
  return (
    <section className={cn("rounded-xl border-2 p-4", styles.bg, styles.border)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn("w-4 h-4", styles.iconColor)} />
        <span className={cn("text-[10.5px] font-bold uppercase tracking-wide", styles.iconColor)}>
          지금 할 일
        </span>
      </div>
      <p className={cn("text-[14.5px] font-bold leading-snug", styles.titleColor)}>{task.title}</p>
      <p className="text-[12.5px] text-foreground/80 mt-1.5 leading-relaxed">{task.body}</p>
    </section>
  );
}

export function DDayBadges({ data }: Props) {
  const items: Array<{ label: string; iso?: string }> = [];
  if (data.signing_date) items.push({ label: "자서", iso: data.signing_date });
  if (data.execution_date) items.push({ label: "실행", iso: data.execution_date });
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2">
      {items.map((it) => {
        const d = daysUntil(it.iso);
        if (d == null) return null;
        const tone =
          d < 0
            ? "bg-gray-100 text-gray-500 border-gray-200"
            : d === 0
            ? "bg-rose-100 text-rose-700 border-rose-300"
            : d <= 3
            ? "bg-amber-100 text-amber-700 border-amber-300"
            : d <= 7
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-card text-muted-foreground border-border";
        return (
          <div
            key={it.label}
            className={cn("flex-1 rounded-lg border px-3 py-2", tone)}
          >
            <p className="text-[10.5px] font-medium opacity-80">{it.label}</p>
            <p className="text-base font-bold tabular-nums">{ddayLabel(it.iso)}</p>
          </div>
        );
      })}
    </div>
  );
}
