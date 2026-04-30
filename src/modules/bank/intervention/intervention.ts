import type { Consultation, LoanStatus } from "../types";
import { daysUntil, ddayLabel } from "../format";
import { STAGE_LABEL } from "../types";

export type InterventionTone = "delayed" | "execution" | "cancel" | "intake";

export type InterventionItem = Consultation & {
  tone: InterventionTone;
  label: string;
  reason: string;
  priority: number; // 낮을수록 위
};

export const STAGE_WARN_DAYS: Partial<Record<LoanStatus, number>> = {
  apply: 3,
  consulting: 5,
  reviewing: 7,
  result: 3,
  signing_reservation: 5,
};

/**
 * 개입 필요 큐 — 정체·실행임박·취소요청·미상담 건들 수집.
 * 우선순위:
 *   0: 입주민 취소요청 (즉시 응답 필요)
 *   1: 실행 임박 (D-1 / 경과)
 *   2: 자서 임박
 *   3: 정체 (단계별 임계치 + 2일)
 *   4: 미상담 (apply 단계 3일+)
 */
export function deriveInterventionQueue(rows: Consultation[]): InterventionItem[] {
  const out: InterventionItem[] = [];
  for (const r of rows) {
    const status = (r.loan_status ?? "apply") as LoanStatus;

    // 입주민 취소요청
    if (status === "cancel_requested") {
      out.push({
        ...r,
        tone: "cancel",
        label: "취소요청",
        reason: "입주민이 앱에서 취소 요청 — 즉시 확인 필요",
        priority: 0,
      });
      continue;
    }

    // 실행 임박
    if (status === "executing") {
      const d = daysUntil(r.execution_date);
      if (d != null && d <= 1) {
        out.push({
          ...r,
          tone: "execution",
          label: "사고",
          reason:
            d < 0
              ? `실행일 경과 — 즉시 확인 · ${ddayLabel(r.execution_date)}`
              : d === 0
              ? "오늘 실행 — 정산 확정 필요"
              : "내일 실행 — 사전 점검",
          priority: 1,
        });
        continue;
      }
    }

    // 자서 임박
    if (status === "signing" || status === "signing_reservation") {
      const d = daysUntil(r.signing_date);
      if (d != null && d <= 1) {
        out.push({
          ...r,
          tone: "execution",
          label: "자서임박",
          reason: d === 0 ? "오늘 자서" : d < 0 ? "자서일 경과" : "내일 자서",
          priority: 2,
        });
        continue;
      }
    }

    // 정체
    if (r.stage_changed_at) {
      const dwell = Math.floor(
        (Date.now() - new Date(r.stage_changed_at).getTime()) / 86_400_000
      );
      const warnAt = STAGE_WARN_DAYS[status];
      if (warnAt != null && dwell >= warnAt + 2) {
        out.push({
          ...r,
          tone: "delayed",
          label: "지연",
          reason: `${STAGE_LABEL[status]} 단계 ${dwell}일 정체 (임계 ${warnAt}일)`,
          priority: 3,
        });
        continue;
      }
    }

    // 미상담 (apply 단계 N일+)
    if (status === "apply" && r.stage_changed_at) {
      const dwell = Math.floor(
        (Date.now() - new Date(r.stage_changed_at).getTime()) / 86_400_000
      );
      if (dwell >= 3) {
        out.push({
          ...r,
          tone: "intake",
          label: "미상담",
          reason: `신청 ${dwell}일 경과 — 첫 컨택 필요`,
          priority: 4,
        });
      }
    }
  }
  return out.sort((a, b) => a.priority - b.priority);
}

export function groupByTone(items: InterventionItem[]): Record<InterventionTone, InterventionItem[]> {
  const out: Record<InterventionTone, InterventionItem[]> = {
    cancel: [],
    execution: [],
    delayed: [],
    intake: [],
  };
  for (const it of items) {
    out[it.tone].push(it);
  }
  return out;
}

export const TONE_META: Record<
  InterventionTone,
  { label: string; emoji: string; bg: string; border: string; text: string; icon: string }
> = {
  cancel: {
    label: "입주민 취소요청",
    emoji: "🚨",
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-900",
    icon: "text-rose-600",
  },
  execution: {
    label: "실행·자서 임박",
    emoji: "🔥",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-900",
    icon: "text-amber-600",
  },
  delayed: {
    label: "정체",
    emoji: "⏰",
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    icon: "text-orange-600",
  },
  intake: {
    label: "미상담",
    emoji: "📞",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-900",
    icon: "text-blue-600",
  },
};
