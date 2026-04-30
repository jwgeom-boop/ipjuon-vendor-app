import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * 빈 상태 일러스트 — 모든 페이지 빈 화면 통일.
 * 큰 이모지 + 친근한 메시지 + (선택) 액션 버튼.
 */
export function EmptyState({ emoji = "📭", title, description, action, className }: Props) {
  return (
    <div className={cn("text-center py-14 px-6", className)}>
      <p className="text-5xl mb-3">{emoji}</p>
      <p className="text-base font-bold text-foreground">{title}</p>
      {description && (
        <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
