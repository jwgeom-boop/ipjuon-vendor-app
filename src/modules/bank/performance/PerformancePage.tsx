import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Briefcase } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { formatWon } from "../format";
import type { Consultation, LoanStatus } from "../types";
import { STAGE_LABEL, STAGE_TONE } from "../types";
import { cn } from "@/lib/utils";

type DoneRow = Consultation & {
  loan_amount?: number;
  additional_loan_amount?: number;
  execution_date?: string;
};

function ymOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ymOf(d);
}

export default function PerformancePage() {
  const { data, isLoading } = useQuery<DoneRow[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<DoneRow[]>("/bank/consultations"),
  });

  const today = new Date();
  const thisYm = ymOf(today);
  const lastYm = shiftMonth(thisYm, -1);
  const lastYearYm = shiftMonth(thisYm, -12);

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      thisMonth: aggregate(rows, thisYm),
      lastMonth: aggregate(rows, lastYm),
      lastYear: aggregate(rows, lastYearYm),
      pipeline: pipelineCount(rows),
      avgDays: avgProcessDays(rows, thisYm),
    };
  }, [data, thisYm, lastYm, lastYearYm]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="이번달 실적" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  const momCount = diff(stats.thisMonth.count, stats.lastMonth.count);
  const momAmount = diff(stats.thisMonth.amount, stats.lastMonth.amount);
  const yoyCount = diff(stats.thisMonth.count, stats.lastYear.count);
  const yoyAmount = diff(stats.thisMonth.amount, stats.lastYear.amount);

  return (
    <>
      <PageHeader title="이번달 실적" />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground">
          기준: {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} (실행 완료 건)
        </p>

        {/* 메인 KPI */}
        <section className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            이번달 실행
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-bold tabular-nums text-primary">
              {stats.thisMonth.count}
              <span className="text-base text-muted-foreground ml-1">건</span>
            </span>
            <DiffBadge diff={momCount} />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground mt-1.5">
            {formatWon(stats.thisMonth.amount)}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-primary/15">
            <div>
              <p className="text-[10.5px] text-muted-foreground">전월 대비</p>
              <ChangeRow count={momCount} amount={momAmount} />
            </div>
            <div>
              <p className="text-[10.5px] text-muted-foreground">전년 동월 대비</p>
              <ChangeRow count={yoyCount} amount={yoyAmount} />
            </div>
          </div>
        </section>

        {/* 비교 카드 */}
        <section className="grid grid-cols-2 gap-3">
          <CompareCard label="지난달" count={stats.lastMonth.count} amount={stats.lastMonth.amount} />
          <CompareCard label="작년 동월" count={stats.lastYear.count} amount={stats.lastYear.amount} />
        </section>

        {/* 처리 평균 */}
        {stats.avgDays != null && (
          <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">평균 처리 기간 (이번달 실행 건)</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{stats.avgDays}일</p>
            </div>
          </section>
        )}

        {/* 진행 중 파이프라인 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">진행 중 파이프라인</p>
          </div>
          <div className="space-y-1.5">
            {(Object.keys(stats.pipeline) as LoanStatus[]).map((s) => {
              const count = stats.pipeline[s];
              if (!count) return null;
              return (
                <div key={s} className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10.5px] font-medium border",
                      STAGE_TONE[s]
                    )}
                  >
                    {STAGE_LABEL[s]}
                  </span>
                  <span className="text-[14px] font-bold tabular-nums text-foreground">{count}건</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 목표 (미정) */}
        <section className="rounded-xl border border-dashed border-border bg-card p-4 flex items-start gap-3">
          <Target className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">목표 설정</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              월 목표 건수·금액 설정은 PC 관리자 사이트에서 가능합니다.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function aggregate(rows: DoneRow[], ym: string): { count: number; amount: number } {
  let count = 0;
  let amount = 0;
  for (const r of rows) {
    if (r.loan_status === "done" && r.execution_date && r.execution_date.startsWith(ym)) {
      count++;
      amount += (Number(r.loan_amount) || 0) + (Number(r.additional_loan_amount) || 0);
    }
  }
  return { count, amount };
}

function pipelineCount(rows: DoneRow[]): Partial<Record<LoanStatus, number>> {
  const out: Partial<Record<LoanStatus, number>> = {};
  const ACTIVE: LoanStatus[] = [
    "apply",
    "consulting",
    "reviewing",
    "result",
    "signing_reservation",
    "signing",
    "executing",
  ];
  for (const r of rows) {
    const s = (r.loan_status ?? "apply") as LoanStatus;
    if (!ACTIVE.includes(s)) continue;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

function avgProcessDays(rows: DoneRow[], ym: string): number | null {
  const done = rows.filter(
    (r) => r.loan_status === "done" && r.execution_date && r.execution_date.startsWith(ym) && r.created_at
  );
  if (done.length === 0) return null;
  const totalDays = done.reduce((sum, r) => {
    const created = new Date(r.created_at!).getTime();
    const executed = new Date(r.execution_date!).getTime();
    return sum + Math.max(0, Math.round((executed - created) / 86_400_000));
  }, 0);
  return Math.round(totalDays / done.length);
}

function diff(curr: number, prev: number): { value: number; pct: number | null } {
  const value = curr - prev;
  const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
  return { value, pct };
}

function CompareCard({
  label,
  count,
  amount,
}: {
  label: string;
  count: number;
  amount: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{count}건</p>
      <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">{formatWon(amount)}</p>
    </div>
  );
}

function ChangeRow({
  count,
  amount,
}: {
  count: { value: number; pct: number | null };
  amount: { value: number; pct: number | null };
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[11.5px]">
        <span className="text-muted-foreground">건수</span>
        <DiffText diff={count} unit="건" />
      </div>
      <div className="flex items-center gap-1 text-[11.5px]">
        <span className="text-muted-foreground">금액</span>
        <DiffText diff={amount} unit="" />
      </div>
    </div>
  );
}

function DiffText({ diff, unit }: { diff: { value: number; pct: number | null }; unit: string }) {
  const cls = diff.value > 0 ? "text-emerald-600" : diff.value < 0 ? "text-rose-600" : "text-muted-foreground";
  const sign = diff.value > 0 ? "+" : "";
  const valueStr = unit === "건" ? `${sign}${diff.value}${unit}` : `${sign}${formatWon(diff.value)}`;
  return (
    <span className={cn("font-semibold tabular-nums", cls)}>
      {valueStr}
      {diff.pct != null && diff.pct !== 0 && ` (${sign}${diff.pct}%)`}
    </span>
  );
}

function DiffBadge({ diff }: { diff: { value: number; pct: number | null } }) {
  if (diff.value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
        동일
      </span>
    );
  }
  const positive = diff.value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", positive ? "text-emerald-600" : "text-rose-600")}>
      <Icon className="w-3.5 h-3.5" />
      {positive ? "+" : ""}
      {diff.value}건{diff.pct != null && ` (${positive ? "+" : ""}${diff.pct}%)`}
    </span>
  );
}
