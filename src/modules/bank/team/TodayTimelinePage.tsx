import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileSignature, Rocket, ChevronRight } from "lucide-react";
import { api } from "@/shell/api/client";
import { useAuth } from "@/shell/auth/AuthContext";
import { PageHeader } from "@/shell/layout/PageHeader";
import { EmptyState } from "@/shell/ui/EmptyState";
import { ConsultationListSkeleton } from "@/shell/ui/Skeleton";
import { ErrorState } from "@/shell/ui/ErrorState";
import { usePullToRefresh, PullToRefreshIndicator } from "@/shell/ui/PullToRefresh";
import { daysUntil } from "../format";
import { cn } from "@/lib/utils";
import type { Consultation, LoanStatus } from "../types";

type Kind = "signing" | "execution";

type TimelineItem = Consultation & {
  kind: Kind;
  hour: number;
  minute: number;
  timeLabel: string;
};

function parseTime(...candidates: (string | undefined | null)[]): { h: number; m: number; label: string } | null {
  for (const raw of candidates) {
    if (!raw) continue;
    // HH:MM 형식
    const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
      const h = parseInt(hhmm[1], 10);
      const m = parseInt(hhmm[2], 10);
      if (h <= 23 && m <= 59) return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
    }
    // 오전/오후 X시 Y분
    const ampm = /오전/.test(raw) ? "am" : /오후/.test(raw) ? "pm" : null;
    const m = raw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if (m) {
      let h = parseInt(m[1], 10);
      const mn = m[2] ? parseInt(m[2], 10) : 0;
      if (Number.isNaN(h) || Number.isNaN(mn) || h > 23 || mn > 59) continue;
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      return { h, m: mn, label: `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}` };
    }
  }
  return null;
}

function deriveTimeline(rows: Consultation[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const r of rows) {
    const status = (r.loan_status ?? "apply") as LoanStatus;

    // 자서: signing_reservation 또는 signing 단계 + 자서일이 오늘
    if ((status === "signing_reservation" || status === "signing") && daysUntil(r.signing_date) === 0) {
      const t = parseTime(r.signing_time, r.signing_selected_time);
      items.push({
        ...r,
        kind: "signing",
        hour: t?.h ?? 99,
        minute: t?.m ?? 99,
        timeLabel: t?.label ?? "시간 미정",
      });
    }
    // 실행: executing 단계 + 실행일이 오늘
    if (status === "executing" && daysUntil(r.execution_date) === 0) {
      items.push({
        ...r,
        kind: "execution",
        hour: 99,
        minute: 99,
        timeLabel: "시간 미정",
      });
    }
  }
  // 시간순 정렬 (시간 미정은 맨 뒤)
  return items.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

export default function TodayTimelinePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery<Consultation[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<Consultation[]>("/bank/consultations"),
  });

  const { pulling, refreshing } = usePullToRefresh(() => refetch());

  const items = useMemo(() => deriveTimeline(data ?? []), [data]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const stats = useMemo(() => {
    const signing = items.filter((it) => it.kind === "signing").length;
    const execution = items.filter((it) => it.kind === "execution").length;
    return { signing, execution };
  }, [items]);

  return (
    <>
      <PullToRefreshIndicator pulling={pulling} refreshing={refreshing} />
      <PageHeader title="오늘 일정" />
      <div className="px-4 py-4 pb-8 space-y-4">
        {/* 헤더 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground">{today}</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {auth?.bankName ? `${auth.bankName} · ` : ""}
            {auth?.bankRole === "bank_manager" ? "팀 전체" : "본인"}
          </p>
          <div className="flex gap-3 mt-2">
            <span className="text-[12.5px] text-foreground">
              자서 <span className="font-bold tabular-nums">{stats.signing}</span>건
            </span>
            <span className="text-[12.5px] text-foreground">
              실행 <span className="font-bold tabular-nums">{stats.execution}</span>건
            </span>
          </div>
        </section>

        {isLoading && <ConsultationListSkeleton count={4} />}
        {isError && <ErrorState error={error} onRetry={refetch} context="오늘 일정 조회" />}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            emoji="🌤"
            title="오늘 자서·실행 일정이 없습니다"
            description="자서 또는 실행 예정인 건이 있으면 시간순으로 표시됩니다."
          />
        )}

        {/* 타임라인 */}
        {items.length > 0 && (
          <section className="relative">
            {/* 세로 라인 */}
            <div className="absolute left-[40px] top-3 bottom-3 w-0.5 bg-border" />

            <div className="space-y-2.5">
              {items.map((it) => (
                <button
                  key={`${it.id}-${it.kind}`}
                  onClick={() => navigate(`/inbox/${it.id}`)}
                  className="w-full flex items-stretch gap-2 active:opacity-70 text-left"
                >
                  {/* 시간 칸 */}
                  <div className="w-[80px] flex-shrink-0 flex flex-col items-center pt-2.5">
                    <span
                      className={cn(
                        "text-[11px] font-bold tabular-nums",
                        it.timeLabel === "시간 미정" ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {it.timeLabel}
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-3 h-3 rounded-full border-2 bg-card flex-shrink-0",
                        it.kind === "signing" ? "border-indigo-500" : "border-rose-500"
                      )}
                    />
                  </div>

                  {/* 카드 */}
                  <div
                    className={cn(
                      "flex-1 min-w-0 rounded-xl border-2 p-3",
                      it.kind === "signing"
                        ? "border-indigo-200 bg-indigo-50/40"
                        : "border-rose-200 bg-rose-50/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {it.kind === "signing" ? (
                        <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Rocket className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span
                        className={cn(
                          "text-[10.5px] font-bold uppercase tracking-wide",
                          it.kind === "signing" ? "text-indigo-700" : "text-rose-700"
                        )}
                      >
                        {it.kind === "signing" ? "자서" : "실행"}
                      </span>
                      {it.manager && (
                        <span className="ml-auto text-[10.5px] text-muted-foreground">
                          {it.manager}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-foreground">
                      {it.resident_name || "(미상)"}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                      {it.complex_name}
                      {it.dong && it.ho && ` · ${it.dong}-${it.ho}`}
                    </p>
                    {it.kind === "signing" && it.signing_selected_location_str && (
                      <p className="text-[11px] text-foreground/70 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {it.signing_selected_location_str}
                      </p>
                    )}
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
