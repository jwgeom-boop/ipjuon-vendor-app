import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Users } from "lucide-react";
import { api } from "@/shell/api/client";
import { useAuth } from "@/shell/auth/AuthContext";
import { PageHeader } from "@/shell/layout/PageHeader";
import { usePullToRefresh, PullToRefreshIndicator } from "@/shell/ui/PullToRefresh";
import { cn } from "@/lib/utils";
import type { Consultation } from "../types";
import {
  deriveInterventionQueue,
  groupByTone,
  TONE_META,
  type InterventionTone,
} from "./intervention";

export default function InterventionPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isManager = auth?.bankRole === "bank_manager";

  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  const { data, isLoading, refetch } = useQuery<Consultation[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<Consultation[]>("/bank/consultations"),
  });

  const { pulling, refreshing } = usePullToRefresh(() => refetch());

  const memberNames = useMemo(() => {
    if (!isManager) return [];
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.manager?.trim()) set.add(r.manager.trim());
    }
    return Array.from(set).sort();
  }, [data, isManager]);

  const items = useMemo(() => {
    let rows = data ?? [];
    if (isManager && assigneeFilter !== "ALL") {
      rows = rows.filter((r) => (r.manager ?? "").trim() === assigneeFilter);
    }
    return deriveInterventionQueue(rows);
  }, [data, isManager, assigneeFilter]);

  const groups = useMemo(() => groupByTone(items), [items]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="개입 큐" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  const toneOrder: InterventionTone[] = ["cancel", "execution", "delayed", "intake"];

  return (
    <>
      <PullToRefreshIndicator pulling={pulling} refreshing={refreshing} />
      <PageHeader title={isManager ? "내가 챙길 것" : "개입 큐"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground">
          긴급도 순 — 취소요청 → 실행/자서 임박 → 정체 → 미상담
        </p>

        {/* 팀장: 팀원 필터 */}
        {isManager && memberNames.length > 0 && (
          <div className="overflow-x-auto -mx-1">
            <div className="flex gap-1.5 px-1 min-w-max">
              <FilterChip
                active={assigneeFilter === "ALL"}
                onClick={() => setAssigneeFilter("ALL")}
                icon={Users}
                label="팀 전체"
              />
              {memberNames.map((name) => (
                <FilterChip
                  key={name}
                  active={assigneeFilter === name}
                  onClick={() => setAssigneeFilter(name)}
                  label={name}
                />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {items.length === 0 && (
          <section className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-3xl mb-2">✨</p>
            <p className="text-sm font-bold text-emerald-900">개입 필요 항목 없음</p>
            <p className="text-[11.5px] text-emerald-700 mt-1">
              모든 진행 건이 정상 흐름에 있습니다.
            </p>
          </section>
        )}

        {/* 카테고리별 섹션 */}
        {toneOrder.map((tone) => {
          const list = groups[tone];
          if (list.length === 0) return null;
          const meta = TONE_META[tone];
          return (
            <section
              key={tone}
              className={cn("rounded-xl border-2 overflow-hidden", meta.bg, meta.border)}
            >
              <div className={cn("flex items-center gap-1.5 px-4 py-2.5 border-b-2", meta.border)}>
                <span className="text-base">{meta.emoji}</span>
                <p className={cn("text-sm font-bold", meta.text)}>
                  {meta.label}{" "}
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-white/70 text-[11px] tabular-nums">
                    {list.length}
                  </span>
                </p>
              </div>
              {list.map((it, i) => (
                <button
                  key={`${it.id}-${it.tone}`}
                  onClick={() => navigate(`/inbox/${it.id}`)}
                  className={cn(
                    "w-full flex items-start gap-2 px-4 py-3 text-left active:bg-black/5",
                    i > 0 && "border-t border-black/5"
                  )}
                >
                  <AlertTriangle className={cn("w-4 h-4 mt-0.5 flex-shrink-0", meta.icon)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={cn("text-[13.5px] font-semibold", meta.text)}>
                        {it.resident_name || "(미상)"}
                      </p>
                      {it.manager && (
                        <span className="text-[10.5px] text-foreground/60">· {it.manager}</span>
                      )}
                      <span
                        className={cn(
                          "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold border bg-white/80",
                          meta.text
                        )}
                      >
                        {it.label}
                      </span>
                    </div>
                    <p className={cn("text-[11.5px] mt-0.5", meta.text, "opacity-90")}>
                      {it.reason}
                    </p>
                    {(it.complex_name || (it.dong && it.ho)) && (
                      <p className="text-[10.5px] text-foreground/55 mt-0.5 truncate">
                        {it.complex_name}
                        {it.dong && it.ho && ` · ${it.dong}-${it.ho}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className={cn("w-4 h-4 flex-shrink-0 mt-0.5", meta.icon)} />
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

function FilterChip({
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
