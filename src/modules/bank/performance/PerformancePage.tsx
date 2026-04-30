import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Briefcase, Trophy, Users } from "lucide-react";
import { api } from "@/shell/api/client";
import { useAuth } from "@/shell/auth/AuthContext";
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

type ScopeKey = "team" | "self" | string; // string = 팀원 이름 (manager 필드)

function ymOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ymOf(d);
}

export default function PerformancePage() {
  const { auth } = useAuth();
  const isManager = auth?.bankRole === "bank_manager";
  const myName = (auth?.displayName || "").trim();

  const [scope, setScope] = useState<ScopeKey>(isManager ? "team" : "self");

  const { data, isLoading } = useQuery<DoneRow[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<DoneRow[]>("/bank/consultations"),
  });

  const today = new Date();
  const thisYm = ymOf(today);
  const lastYm = shiftMonth(thisYm, -1);
  const lastYearYm = shiftMonth(thisYm, -12);

  const memberNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.manager?.trim()) set.add(r.manager.trim());
    }
    return Array.from(set).sort();
  }, [data]);

  // 선택된 scope에 따라 필터링한 rows
  const scopedRows = useMemo(() => {
    const rows = data ?? [];
    if (scope === "team" || !isManager) {
      // 팀장의 "팀 전체" 또는 상담사 본인
      if (!isManager) return rows; // 상담사는 백엔드가 이미 본인 것만 줌
      return rows;
    }
    if (scope === "self") {
      return rows.filter((r) => (r.manager ?? "").trim() === myName);
    }
    // 특정 팀원 이름
    return rows.filter((r) => (r.manager ?? "").trim() === scope);
  }, [data, scope, isManager, myName]);

  const stats = useMemo(() => ({
    thisMonth: aggregate(scopedRows, thisYm),
    lastMonth: aggregate(scopedRows, lastYm),
    lastYear: aggregate(scopedRows, lastYearYm),
    pipeline: pipelineCount(scopedRows),
    avgDays: avgProcessDays(scopedRows, thisYm),
  }), [scopedRows, thisYm, lastYm, lastYearYm]);

  // 팀원별 비교 (이번달, manager만 계산)
  const memberRanking = useMemo(() => {
    if (!isManager) return [];
    const rows = data ?? [];
    return memberNames
      .map((name) => ({
        name,
        ...aggregate(
          rows.filter((r) => (r.manager ?? "").trim() === name),
          thisYm
        ),
      }))
      .sort((a, b) => b.amount - a.amount || b.count - a.count);
  }, [data, memberNames, isManager, thisYm]);

  if (isLoading) {
    return (
      <>
        <PageHeader title={isManager ? "팀 실적" : "이번달 실적"} />
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
      <PageHeader title={isManager ? "팀 실적" : "이번달 실적"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground">
          기준: {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} (실행 완료 건)
        </p>

        {/* 팀장: scope 토글 */}
        {isManager && (
          <div className="overflow-x-auto -mx-1">
            <div className="flex gap-1.5 px-1 min-w-max">
              <ScopeChip
                active={scope === "team"}
                onClick={() => setScope("team")}
                icon={Users}
                label="팀 전체"
              />
              <ScopeChip
                active={scope === "self"}
                onClick={() => setScope("self")}
                label="본인"
              />
              {memberNames.map((name) => (
                <ScopeChip
                  key={name}
                  active={scope === name}
                  onClick={() => setScope(name)}
                  label={name}
                />
              ))}
            </div>
          </div>
        )}

        {/* 메인 KPI */}
        <section className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {scopeLabel(scope, isManager)} · 이번달 실행
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

        {/* 팀원 랭킹 (팀장 + 팀 전체 보기 시만) */}
        {isManager && scope === "team" && memberRanking.length > 0 && (
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-foreground">팀원별 실적 — 이번달</p>
            </div>
            {memberRanking.map((m, i) => {
              const total = stats.thisMonth.amount;
              const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
              return (
                <button
                  key={m.name}
                  onClick={() => setScope(m.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 active:bg-accent text-left",
                    i > 0 && "border-t border-border"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-gray-100 text-gray-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground truncate">{m.name}</p>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-bold tabular-nums text-foreground">{m.count}건</p>
                    <p className="text-[10.5px] text-muted-foreground tabular-nums">
                      {formatWon(m.amount)}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* 처리 평균 */}
        {stats.avgDays != null && (
          <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">평균 처리 기간 ({scopeLabel(scope, isManager)})</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{stats.avgDays}일</p>
            </div>
          </section>
        )}

        {/* 진행 중 파이프라인 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">
              진행 중 파이프라인 ({scopeLabel(scope, isManager)})
            </p>
          </div>
          {Object.keys(stats.pipeline).length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-2">진행 중인 건 없음</p>
          ) : (
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
          )}
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

function scopeLabel(scope: ScopeKey, isManager: boolean): string {
  if (!isManager) return "본인";
  if (scope === "team") return "팀 전체";
  if (scope === "self") return "본인";
  return scope; // 팀원 이름
}

function ScopeChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Users;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
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
