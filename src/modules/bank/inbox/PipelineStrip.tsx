import { cn } from "@/lib/utils";
import type { LoanStatus } from "../types";

const PIPELINE_ORDER: LoanStatus[] = [
  "apply",
  "consulting",
  "reviewing",
  "result",
  "signing_reservation",
  "signing",
  "executing",
  "done",
];

const PIPELINE_LABELS: Record<LoanStatus, string> = {
  apply: "신",
  consulting: "상",
  reviewing: "심",
  result: "결",
  signing_reservation: "예",
  signing: "자",
  executing: "실",
  done: "완",
  cancel: "X",
  cancel_requested: "?",
};

/**
 * 단계 진행을 한눈에 — 작은 점 8개로 표시.
 * 인박스 행에 텍스트 라벨 대신 또는 함께 사용.
 */
export function PipelineStrip({
  status,
  size = "sm",
}: {
  status: LoanStatus;
  size?: "xs" | "sm" | "md";
}) {
  const currentIdx = PIPELINE_ORDER.indexOf(status);
  const isCancel = status === "cancel" || status === "cancel_requested";

  const dotSize = size === "xs" ? "w-1.5 h-1.5" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <div className="inline-flex items-center gap-0.5">
      {PIPELINE_ORDER.map((s, i) => {
        const reached = !isCancel && i <= currentIdx;
        const active = !isCancel && i === currentIdx;
        return (
          <span
            key={s}
            className={cn(
              "rounded-full transition-colors",
              dotSize,
              isCancel
                ? i === 0
                  ? "bg-rose-500"
                  : "bg-rose-100"
                : active
                ? "bg-primary ring-2 ring-primary/20"
                : reached
                ? "bg-primary/60"
                : "bg-muted-foreground/20"
            )}
            title={PIPELINE_LABELS[s]}
          />
        );
      })}
    </div>
  );
}
