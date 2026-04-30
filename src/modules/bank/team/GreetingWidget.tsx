import { Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/shell/auth/AuthContext";
import { daysUntil } from "../format";
import type { Consultation, LoanStatus } from "../types";

type Props = {
  rows: Consultation[];
};

export function GreetingWidget({ rows }: Props) {
  const { auth } = useAuth();
  const name = auth?.displayName || auth?.loginId || "님";

  const hour = new Date().getHours();
  const greeting = (() => {
    if (hour < 6) return { text: "이른 새벽", Icon: Moon, tone: "indigo" };
    if (hour < 12) return { text: "좋은 아침", Icon: Sunrise, tone: "amber" };
    if (hour < 18) return { text: "오후", Icon: Sun, tone: "blue" };
    if (hour < 22) return { text: "수고 많으셨", Icon: Sunset, tone: "orange" };
    return { text: "늦은 시간", Icon: Moon, tone: "indigo" };
  })();

  const stats = (() => {
    let signing = 0;
    let execution = 0;
    let pendingApply = 0;
    for (const r of rows) {
      const s = (r.loan_status ?? "apply") as LoanStatus;
      if ((s === "signing" || s === "signing_reservation") && daysUntil(r.signing_date) === 0) signing++;
      if (s === "executing" && daysUntil(r.execution_date) === 0) execution++;
      if (s === "apply" && r.loan_application_at) pendingApply++;
    }
    return { signing, execution, pendingApply };
  })();

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const toneStyles = {
    indigo: "from-indigo-50 to-indigo-100/30 border-indigo-200",
    amber: "from-amber-50 to-amber-100/30 border-amber-200",
    blue: "from-blue-50 to-blue-100/30 border-blue-200",
    orange: "from-orange-50 to-orange-100/30 border-orange-200",
  }[greeting.tone];

  const iconStyles = {
    indigo: "text-indigo-500",
    amber: "text-amber-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
  }[greeting.tone];

  const total = stats.signing + stats.execution + stats.pendingApply;

  return (
    <section
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4",
        toneStyles
      )}
    >
      <div className="flex items-start gap-3">
        <greeting.Icon className={cn("w-7 h-7 flex-shrink-0", iconStyles)} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-muted-foreground">{today}</p>
          <p className="text-[15px] font-bold text-foreground mt-0.5">
            {greeting.text}{name}님 👋
          </p>
          {total === 0 ? (
            <p className="text-[12.5px] text-muted-foreground mt-1.5">
              오늘 처리할 자서·실행 건이 없습니다.
            </p>
          ) : (
            <div className="text-[12.5px] text-foreground/85 mt-1.5 space-x-2">
              {stats.signing > 0 && (
                <span>
                  자서 <span className="font-bold text-foreground tabular-nums">{stats.signing}</span>건
                </span>
              )}
              {stats.execution > 0 && (
                <span>
                  실행 <span className="font-bold text-foreground tabular-nums">{stats.execution}</span>건
                </span>
              )}
              {stats.pendingApply > 0 && (
                <span>
                  신청서 <span className="font-bold text-foreground tabular-nums">{stats.pendingApply}</span>건 대기
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
