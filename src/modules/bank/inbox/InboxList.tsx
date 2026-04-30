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
      const at = a.stage_changed_at || a.created_at || "";
      const bt = b.stage_changed_at || b.created_at || "";
      return bt.localeCompare(at);
    });
  }, [data, stage, search, kpiFilter, assigneeFilter, isManager]);

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

      <div className="px-3 py-3 space-y-2">
        {isLoading && <ConsultationListSkeleton count={5} />}
        {isError && <ErrorState error={error} onRetry={refetch} context="인박스 조회 실패" />}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">표시할 상담 건이 없습니다.</p>
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
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
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
        </div>
        <Badge variant="outline" className={cn("flex-shrink-0 text-[10px] px-2 py-0 h-5", STAGE_TONE[status])}>
          {STAGE_LABEL[status]}
        </Badge>
      </div>
      {row.loan_amount ? (
        <p className="text-[12px] text-foreground mt-1.5">
          희망 <span className="font-semibold">{formatWon(row.loan_amount)}</span>
        </p>
      ) : null}
    </button>
  );
}
