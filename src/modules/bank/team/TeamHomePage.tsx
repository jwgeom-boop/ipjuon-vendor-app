import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Menu as MenuIcon,
  Users,
  CalendarClock,
  Rocket,
  ListChecks,
  Layers,
  AlertTriangle,
  ChevronRight,
  UserX,
  Clock3,
  Building2,
} from "lucide-react";
import { api } from "@/shell/api/client";
import { useAuth } from "@/shell/auth/AuthContext";
import { cn } from "@/lib/utils";
import { daysUntil, ddayLabel, formatWon } from "../format";
import {
  STAGE_LABEL,
  STAGE_TONE,
  type Consultation,
  type LoanStatus,
} from "../types";
import { NewCustomerSheet } from "../customers/NewCustomerSheet";
import { ProfileSheet } from "../profile/ProfileSheet";

const STAGE_WARN_DAYS: Partial<Record<LoanStatus, number>> = {
  apply: 3,
  consulting: 5,
  reviewing: 7,
  result: 3,
  signing_reservation: 5,
};

export default function TeamHomePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [complexFilter, setComplexFilter] = useState<string>("ALL");

  const { data: rows = [], isLoading } = useQuery<Consultation[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<Consultation[]>("/bank/consultations"),
  });

  const complexes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.complex_name) set.add(r.complex_name);
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [rows]);

  const scoped = useMemo(() => {
    if (complexFilter === "ALL") return rows;
    return rows.filter((r) => r.complex_name === complexFilter);
  }, [rows, complexFilter]);

  const stats = useMemo(() => deriveStats(scoped), [scoped]);
  const memberRows = useMemo(() => deriveMemberRows(scoped), [scoped]);
  const todaySchedule = useMemo(() => deriveTodaySchedule(scoped), [scoped]);
  const intakeQueue = useMemo(() => deriveIntakeQueue(scoped), [scoped]);
  const interventionQueue = useMemo(() => deriveInterventionQueue(scoped), [scoped]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div>
      <header className="sticky top-0 z-20 bg-card border-b border-border safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h1 className="text-base font-bold text-foreground truncate">
                  {auth?.bankName || "은행"} · 오늘의 팀
                </h1>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{today}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNewCustomerOpen(true)}
                className="p-2 -m-1 text-foreground rounded-lg active:bg-accent"
                aria-label="신규 고객"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 -m-1 text-foreground rounded-lg active:bg-accent"
                aria-label="메뉴"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 단지 필터 */}
          {complexes.length > 2 && (
            <div className="overflow-x-auto -mx-1 pb-1">
              <div className="flex gap-1.5 px-1 min-w-max">
                {complexes.map((c) => (
                  <button
                    key={c}
                    onClick={() => setComplexFilter(c)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap",
                      complexFilter === c
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    <Building2 className="w-3 h-3" />
                    {c === "ALL" ? "전체 아파트" : c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-8">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
        )}

        {!isLoading && (
          <>
            {/* KPI 4종 */}
            <section className="grid grid-cols-2 gap-2">
              <KpiCard
                label="상담 리스트"
                value={stats.totalActive}
                unit="건"
                icon={ListChecks}
                tone="indigo"
                onClick={() => navigate("/inbox")}
              />
              <KpiCard
                label="자서 예약"
                value={stats.signingToday}
                unit="건 오늘"
                icon={CalendarClock}
                tone="amber"
              />
              <KpiCard
                label="실행"
                value={stats.executionToday}
                unit="건 오늘"
                icon={Rocket}
                tone="rose"
              />
              <KpiCard
                label="전체 진행"
                value={scoped.length}
                unit="건"
                icon={Layers}
                tone="emerald"
                onClick={() => navigate("/inbox")}
              />
            </section>

            {/* 팀원별 현황 */}
            <section className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">팀원별 현황</p>
                <span className="text-[10.5px] text-muted-foreground">
                  탭 → 해당 담당자 인박스
                </span>
              </div>
              {memberRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">담당자 정보 없음</p>
              ) : (
                <div>
                  {memberRows.map((m, i) => (
                    <button
                      key={m.name}
                      onClick={() => navigate(`/inbox?assignee=${encodeURIComponent(m.name)}`)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 active:bg-accent text-left",
                        i > 0 && "border-t border-border"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {m.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13.5px] font-semibold text-foreground truncate">
                            {m.name}
                          </p>
                          {m.risky > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                              ⚠️ {m.risky}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          진행 {m.total} · 신규 {m.intake} · 자서 {m.signing} · 실행 {m.execution}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 신규·미상담 큐 */}
            {intakeQueue.length > 0 && (
              <section className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-foreground">
                    신규·미상담 큐 ({intakeQueue.length})
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    첫 컨택 또는 배정 재검토 필요
                  </p>
                </div>
                {intakeQueue.slice(0, 5).map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/inbox/${q.id}`)}
                    className={cn(
                      "w-full text-left px-4 py-3 active:bg-accent",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {q.resident_name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {STAGE_LABEL[(q.loan_status ?? "apply") as LoanStatus]}
                      </span>
                      {q.manager && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {q.manager}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {q.complex_name}
                      {q.dong && q.ho && ` · ${q.dong}-${q.ho}`}
                      {q.resident_phone && ` · ${q.resident_phone}`}
                    </p>
                  </button>
                ))}
                {intakeQueue.length > 5 && (
                  <button
                    onClick={() => navigate("/inbox?stage=apply")}
                    className="w-full px-4 py-2.5 text-[12px] text-primary font-medium border-t border-border"
                  >
                    전체 보기 →
                  </button>
                )}
              </section>
            )}

            {/* 오늘 일정 */}
            {todaySchedule.length > 0 && (
              <section className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">오늘 일정</p>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    자서 {stats.signingToday} · 실행 {stats.executionToday}
                  </span>
                </div>
                {todaySchedule.slice(0, 6).map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/inbox/${t.id}`)}
                    className={cn(
                      "w-full text-left px-4 py-3 active:bg-accent",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          t.kind === "signing"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {t.kind === "signing" ? "자서" : "실행"}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {t.timeLabel || "시간 미정"}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground ml-1">
                        {t.resident_name}
                      </span>
                      {t.manager && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          · {t.manager}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate pl-10">
                      {t.complex_name}
                      {t.dong && t.ho && ` · ${t.dong}-${t.ho}`}
                    </p>
                  </button>
                ))}
              </section>
            )}

            {/* 내가 챙길 것 (개입 큐) */}
            {interventionQueue.length > 0 && (
              <section className="rounded-xl border-2 border-rose-200 bg-rose-50/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <p className="text-sm font-bold text-rose-900">
                    내가 챙길 것 {interventionQueue.length}건
                  </p>
                </div>
                {interventionQueue.slice(0, 4).map((q, i) => {
                  const Icon = q.tone === "inactive" ? UserX : q.tone === "execution" ? Clock3 : AlertTriangle;
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigate(`/inbox/${q.id}`)}
                      className={cn(
                        "w-full flex items-start gap-2 px-4 py-3 active:bg-rose-100 text-left",
                        i > 0 && "border-t border-rose-200"
                      )}
                    >
                      <Icon className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-foreground">
                            {q.resident_name}
                          </p>
                          {q.manager && (
                            <span className="text-[10.5px] text-muted-foreground">· {q.manager}</span>
                          )}
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-bold">
                            {q.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-800 mt-0.5">{q.reason}</p>
                      </div>
                    </button>
                  );
                })}
                {interventionQueue.length > 4 && (
                  <button
                    onClick={() => navigate("/notifications")}
                    className="w-full px-4 py-2.5 text-[12px] text-rose-700 font-medium border-t border-rose-200"
                  >
                    전체 {interventionQueue.length}건 보기 →
                  </button>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <NewCustomerSheet open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} />
      <ProfileSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  unit: string;
  icon: typeof Users;
  tone: "indigo" | "amber" | "rose" | "emerald";
  onClick?: () => void;
}) {
  const tones = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-600", value: "text-indigo-900" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", value: "text-amber-900" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", value: "text-rose-900" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", value: "text-emerald-900" },
  }[tone];
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left",
        tones.bg,
        tones.border,
        onClick && "active:scale-[0.98] transition-transform"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-semibold", tones.icon)}>{label}</span>
        <Icon className={cn("w-4 h-4", tones.icon)} />
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn("text-2xl font-bold tabular-nums", tones.value)}>{value}</span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </div>
    </Wrapper>
  );
}

// === 통계 derive 함수들 ===

function deriveStats(rows: Consultation[]) {
  const ACTIVE: LoanStatus[] = [
    "apply",
    "consulting",
    "reviewing",
    "result",
    "signing_reservation",
    "signing",
    "executing",
  ];
  let totalActive = 0;
  let signingToday = 0;
  let executionToday = 0;
  for (const r of rows) {
    const s = (r.loan_status ?? "apply") as LoanStatus;
    if (ACTIVE.includes(s)) totalActive++;
    if ((s === "signing_reservation" || s === "signing") && daysUntil(r.signing_date) === 0) {
      signingToday++;
    }
    if (s === "executing" && daysUntil(r.execution_date) === 0) executionToday++;
  }
  return { totalActive, signingToday, executionToday };
}

type MemberRow = {
  name: string;
  total: number;
  intake: number;
  signing: number;
  execution: number;
  delayed: number;
  risky: number;
};

function deriveMemberRows(rows: Consultation[]): MemberRow[] {
  const ACTIVE: LoanStatus[] = [
    "apply",
    "consulting",
    "reviewing",
    "result",
    "signing_reservation",
    "signing",
    "executing",
  ];
  const map = new Map<string, MemberRow>();
  for (const r of rows) {
    const status = (r.loan_status ?? "apply") as LoanStatus;
    if (!ACTIVE.includes(status)) continue;
    const name = (r.manager ?? "").trim() || "(미지정)";
    if (!map.has(name)) {
      map.set(name, { name, total: 0, intake: 0, signing: 0, execution: 0, delayed: 0, risky: 0 });
    }
    const row = map.get(name)!;
    row.total++;
    if (status === "apply" || status === "consulting") row.intake++;
    if (status === "signing" || status === "signing_reservation") row.signing++;
    if (status === "executing") row.execution++;
    // 지연·위험 판정
    if (r.stage_changed_at) {
      const dwell = Math.floor((Date.now() - new Date(r.stage_changed_at).getTime()) / 86_400_000);
      const warnAt = STAGE_WARN_DAYS[status];
      if (warnAt != null && dwell >= warnAt) {
        row.delayed++;
        row.risky++;
      }
    }
    if (status === "executing" && daysUntil(r.execution_date) != null && daysUntil(r.execution_date)! <= 1) {
      row.risky++;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.risky - a.risky || b.total - a.total);
}

type ScheduleItem = Consultation & { kind: "signing" | "execution"; timeLabel: string };

function deriveTodaySchedule(rows: Consultation[]): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const r of rows) {
    const status = (r.loan_status ?? "apply") as LoanStatus;
    if ((status === "signing_reservation" || status === "signing") && daysUntil(r.signing_date) === 0) {
      items.push({ ...r, kind: "signing", timeLabel: r.signing_time ?? r.signing_selected_time ?? "" });
    }
    if (status === "executing" && daysUntil(r.execution_date) === 0) {
      items.push({ ...r, kind: "execution", timeLabel: "" });
    }
  }
  return items.sort((a, b) => (a.timeLabel || "99").localeCompare(b.timeLabel || "99"));
}

function deriveIntakeQueue(rows: Consultation[]): Consultation[] {
  return rows
    .filter((r) => {
      const s = (r.loan_status ?? "apply") as LoanStatus;
      return s === "apply" || (s === "consulting" && !r.resident_last_action_at);
    })
    .sort((a, b) => {
      const at = a.created_at ?? a.stage_changed_at ?? "";
      const bt = b.created_at ?? b.stage_changed_at ?? "";
      return bt.localeCompare(at);
    });
}

type InterventionItem = Consultation & {
  tone: "delayed" | "execution" | "inactive";
  label: string;
  reason: string;
};

function deriveInterventionQueue(rows: Consultation[]): InterventionItem[] {
  const out: InterventionItem[] = [];
  for (const r of rows) {
    const status = (r.loan_status ?? "apply") as LoanStatus;
    // 실행 임박
    if (status === "executing") {
      const d = daysUntil(r.execution_date);
      if (d != null && d <= 1) {
        out.push({
          ...r,
          tone: "execution",
          label: "사고",
          reason: d < 0 ? `실행일 경과 — 즉시 확인 · ${ddayLabel(r.execution_date)}` : "오늘 실행",
        });
        continue;
      }
    }
    // 정체
    if (r.stage_changed_at) {
      const dwell = Math.floor((Date.now() - new Date(r.stage_changed_at).getTime()) / 86_400_000);
      const warnAt = STAGE_WARN_DAYS[status];
      if (warnAt != null && dwell >= warnAt + 2) {
        out.push({
          ...r,
          tone: "delayed",
          label: "지연",
          reason: `${STAGE_LABEL[status]} 단계 ${dwell}일 정체`,
        });
      }
    }
  }
  return out.sort((a, b) => {
    if (a.tone === "execution" && b.tone !== "execution") return -1;
    if (a.tone !== "execution" && b.tone === "execution") return 1;
    return 0;
  });
}

// formatWon 사용을 위한 stub (필요시)
export const _ = formatWon;
