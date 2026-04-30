import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Menu as MenuIcon, Search, Users } from "lucide-react";
import { api } from "@/shell/api/client";
import { useAuth } from "@/shell/auth/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGE_TONE, type Consultation, type LoanStatus } from "../types";
import { formatWon } from "../format";
import { KpiStrip, filterByKpi, type KpiKey } from "./KpiStrip";
import { NewCustomerSheet } from "../customers/NewCustomerSheet";
import { ProfileSheet } from "../profile/ProfileSheet";
import { ErrorState } from "@/shell/ui/ErrorState";
import { ConsultationListSkeleton } from "@/shell/ui/Skeleton";
import { usePullToRefresh, PullToRefreshIndicator } from "@/shell/ui/PullToRefresh";
import { EmptyState } from "@/shell/ui/EmptyState";
import { QuickActionsFab } from "@/shell/ui/QuickActionsFab";
import { PipelineStrip } from "./PipelineStrip";
import { PinIndicator } from "./PinButton";
import { Button } from "@/components/ui/button";
import { readPinnedIds } from "@/shell/storage/userPrefs";

const STAGE_FILTERS: Array<{ key: LoanStatus | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "apply", label: "신청" },
  { key: "consulting", label: "상담" },
  { key: "reviewing", label: "심사" },
  { key: "result", label: "결과" },
  { key: "signing_reservation", label: "예약" },
  { key: "signing", label: "자서" },
  { key: "executing", label: "실행중" },
];

export default function InboxList() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = auth?.bankRole === "bank_manager";
  const [stage, setStage] = useState<LoanStatus | "all">(
    () => (searchParams.get("stage") as LoanStatus | null) ?? "all"
  );
  const [search, setSearch] = useState("");
  const [kpiFilter, setKpiFilter] = useState<KpiKey | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(
    () => searchParams.get("assignee") || "ALL"
  );

  const { data, isLoading, isError, refetch, error } = useQuery<Consultation[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<Consultation[]>("/bank/consultations"),
  });

  const { pulling, refreshing } = usePullToRefresh(() => refetch());

  // URL search param 동기화 (팀 홈에서 팀원 선택 → 인박스로 진입 시 반영)
  useEffect(() => {
    const a = searchParams.get("assignee");
    if (a && a !== assigneeFilter) setAssigneeFilter(a);
  }, [searchParams, assigneeFilter]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.manager?.trim()) set.add(r.manager.trim());
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [data]);

  const pinnedIds = useMemo(() => readPinnedIds(auth?.loginId), [auth?.loginId, data]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isManager && assigneeFilter !== "ALL") {
      rows = rows.filter((r) => (r.manager ?? "").trim() === assigneeFilter);
    }
    if (kpiFilter) {
      rows = filterByKpi(rows, kpiFilter);
    } else if (stage !== "all") {
      rows = rows.filter((r) => (r.loan_status ?? "apply") === stage);
    }
    const s = search.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (r) =>
          r.resident_name?.toLowerCase().includes(s) ||
          r.resident_phone?.includes(s) ||
          r.complex_name?.toLowerCase().includes(s)
      );
    }
    return rows.sort((a, b) => {
      // 핀된 항목 최상단
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      // 그 외는 최근 단계 변경순
      const at = a.stage_changed_at || a.created_at || "";
      const bt = b.stage_changed_at || b.created_at || "";
      return bt.localeCompare(at);
    });
  }, [data, stage, search, kpiFilter, assigneeFilter, isManager, pinnedIds]);

  function changeAssignee(v: string) {
    setAssigneeFilter(v);
    if (v === "ALL") {
      searchParams.delete("assignee");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("assignee", v);
      setSearchParams(searchParams, { replace: true });
    }
  }

  return (
    <div>
      <PullToRefreshIndicator pulling={pulling} refreshing={refreshing} />
      <header className="sticky top-0 z-20 bg-card border-b border-border safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold text-foreground">인박스</h1>
              <p className="text-[11px] text-muted-foreground">
                {auth?.bankName ? `${auth.bankName} · ` : ""}
                {auth?.displayName || auth?.loginId}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNewCustomerOpen(true)}
                className="p-2 -m-1 text-foreground rounded-lg active:bg-accent"
                aria-label="신규 고객 등록"
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·전화·단지 검색"
              className="h-10 pl-9"
            />
          </div>

          {isManager && assigneeOptions.length > 2 && (
            <div className="mt-2 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {assigneeOptions.map((a) => (
                  <button
                    key={a}
                    onClick={() => changeAssignee(a)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap",
                      assigneeFilter === a
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    {a !== "ALL" && <Users className="w-3 h-3" />}
                    {a === "ALL" ? "팀 전체" : a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <KpiStrip rows={data ?? []} active={kpiFilter} onSelect={(k) => { setKpiFilter(k); if (k) setStage("all"); }} />

        <div className="px-2 pb-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStage(f.key); setKpiFilter(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                  !kpiFilter && stage === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <NewCustomerSheet open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} />
      <ProfileSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <QuickActionsFab onNewCustomer={() => setNewCustomerOpen(true)} />

      <div className="px-3 py-3 space-y-2">
        {isLoading && <ConsultationListSkeleton count={5} />}
        {isError && <ErrorState error={error} onRetry={refetch} context="인박스 조회 실패" />}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            emoji={search || stage !== "all" || kpiFilter ? "🔍" : "📭"}
            title={
              search || stage !== "all" || kpiFilter
                ? "조건에 맞는 상담 건이 없습니다"
                : "아직 상담 건이 없습니다"
            }
            description={
              search || stage !== "all" || kpiFilter
                ? "필터를 초기화하거나 다른 조건으로 검색해보세요."
                : "신규 고객 등록 또는 입주민 앱에서 동의서가 도착하면 여기에 표시됩니다."
            }
            action={
              !search && stage === "all" && !kpiFilter ? (
                <Button onClick={() => setNewCustomerOpen(true)} size="sm">
                  + 신규 고객 등록
                </Button>
              ) : undefined
            }
          />
        )}
        {filtered.map((row) => (
          <ConsultationRow
            key={row.id}
            row={row}
            showAssignee={isManager && assigneeFilter === "ALL"}
            onClick={() => navigate(`/inbox/${row.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

type LastMessage = { by: string; text: string; at: string } | null;

function getLastMessage(b2cMessages?: string): LastMessage {
  if (!b2cMessages) return null;
  try {
    const parsed = JSON.parse(b2cMessages);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const last = parsed[parsed.length - 1];
    if (!last?.text) return null;
    return last as LastMessage;
  } catch {
    return null;
  }
}

function ConsultationRow({
  row,
  showAssignee,
  onClick,
}: {
  row: Consultation;
  showAssignee?: boolean;
  onClick: () => void;
}) {
  const status = (row.loan_status ?? "apply") as LoanStatus;
  const hasResidentAction = !!row.resident_last_action_at;
  const lastMessage = getLastMessage(row.b2c_messages);
  // 7일 내 메시지만 미리보기 (그 이상은 너무 오래됨)
  const isRecent = lastMessage
    ? Date.now() - new Date(lastMessage.at).getTime() < 7 * 86_400_000
    : false;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PinIndicator consultationId={row.id} />
            <p className="text-[15px] font-semibold text-foreground truncate">{row.resident_name}</p>
            {hasResidentAction && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" aria-label="신규" />}
            {showAssignee && row.manager && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                {row.manager}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
            {row.complex_name || "-"}
            {row.dong && row.ho && ` · ${row.dong}-${row.ho}`}
          </p>
          {row.memo && (
            <p className="text-[11px] text-amber-700 mt-1 line-clamp-1">🔖 {row.memo}</p>
          )}
          {isRecent && lastMessage && (
            <p className="text-[11.5px] text-blue-700 mt-1 line-clamp-1 flex items-center gap-1">
              <span className="text-[10px]">💬</span>
              <span className="font-medium">
                {lastMessage.by === "resident" ? row.resident_name : "나"}:
              </span>
              <span className="text-foreground/80">{lastMessage.text}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5", STAGE_TONE[status])}>
            {STAGE_LABEL[status]}
          </Badge>
          <PipelineStrip status={status} size="xs" />
        </div>
      </div>
      {row.loan_amount ? (
        <p className="text-[12px] text-foreground mt-1.5">
          희망 <span className="font-semibold">{formatWon(row.loan_amount)}</span>
        </p>
      ) : null}
    </button>
  );
}
