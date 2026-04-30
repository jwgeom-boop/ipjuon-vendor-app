import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, FileText, MessageSquare, Calendar, FileCheck2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { PushSettingsCard } from "@/shell/push/PushSettingsCard";
import { deriveInterventionQueue } from "../intervention/intervention";
import { usePullToRefresh, PullToRefreshIndicator } from "@/shell/ui/PullToRefresh";
import { EmptyState } from "@/shell/ui/EmptyState";
import type { Consultation } from "../types";

type NotificationItem = {
  id: string;
  consultationId: string;
  residentName: string;
  type: "loan_application" | "message" | "signing_select" | "doc_checks" | "report_middle_interest";
  title: string;
  detail: string;
  at: string;
};

const TYPE_META: Record<NotificationItem["type"], { icon: typeof Bell; bg: string; color: string; title: string }> = {
  loan_application: { icon: FileText, bg: "bg-blue-50", color: "text-blue-600", title: "대출신청서 제출" },
  message: { icon: MessageSquare, bg: "bg-emerald-50", color: "text-emerald-600", title: "메시지 도착" },
  signing_select: { icon: Calendar, bg: "bg-indigo-50", color: "text-indigo-600", title: "자서일 선택" },
  doc_checks: { icon: FileCheck2, bg: "bg-amber-50", color: "text-amber-600", title: "준비서류 체크" },
  report_middle_interest: { icon: CheckCircle2, bg: "bg-purple-50", color: "text-purple-600", title: "중간 이자 보고" },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery<Consultation[]>({
    queryKey: ["bank-consultations"],
    queryFn: () => api.get<Consultation[]>("/bank/consultations"),
  });

  const { pulling, refreshing } = usePullToRefresh(() => refetch());

  const interventionCount = useMemo(() => {
    return data ? deriveInterventionQueue(data).length : 0;
  }, [data]);

  const items = useMemo<NotificationItem[]>(() => {
    if (!data) return [];
    const list: NotificationItem[] = [];
    for (const r of data) {
      if (r.loan_application_at) {
        list.push({
          id: `${r.id}-loan_application`,
          consultationId: r.id,
          residentName: r.resident_name,
          type: "loan_application",
          title: "대출신청서가 도착했습니다",
          detail: `${r.complex_name || ""}${r.dong && r.ho ? ` ${r.dong}-${r.ho}` : ""}`,
          at: r.loan_application_at,
        });
      }
      if (r.resident_last_action_at && r.resident_last_action_type) {
        const t = r.resident_last_action_type;
        if (t === "message" || t === "signing_select" || t === "doc_checks" || t === "report_middle_interest") {
          list.push({
            id: `${r.id}-${t}-${r.resident_last_action_at}`,
            consultationId: r.id,
            residentName: r.resident_name,
            type: t as NotificationItem["type"],
            title: TYPE_META[t as NotificationItem["type"]].title,
            detail: `${r.complex_name || ""}${r.dong && r.ho ? ` ${r.dong}-${r.ho}` : ""}`,
            at: r.resident_last_action_at,
          });
        }
      }
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [data]);

  return (
    <div>
      <PullToRefreshIndicator pulling={pulling} refreshing={refreshing} />
      <PageHeader title="알림" showBack={false} />
      <div className="px-3 py-3 space-y-2">
        <PushSettingsCard />

        {/* 개입 큐 진입 카드 */}
        {interventionCount > 0 && (
          <button
            onClick={() => navigate("/intervention")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-rose-200 bg-rose-50 active:bg-rose-100 text-left"
          >
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900">내가 챙길 것</p>
              <p className="text-[11.5px] text-rose-700 mt-0.5">
                개입 필요 건 <span className="font-bold tabular-nums">{interventionCount}</span>건 — 취소요청·실행임박·정체·미상담
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-600 flex-shrink-0" />
          </button>
        )}

        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>}
        {!isLoading && items.length === 0 && (
          <EmptyState
            emoji="🔔"
            title="새 알림이 없습니다"
            description="입주민이 메시지를 보내거나 신청서·자서일 등을 변경하면 여기에 표시됩니다."
          />
        )}
        {items.map((it) => {
          const meta = TYPE_META[it.type];
          const Icon = meta.icon;
          return (
            <button
              key={it.id}
              onClick={() => {
                if (it.type === "message") navigate(`/inbox/${it.consultationId}/messages`);
                else if (it.type === "loan_application") navigate(`/inbox/${it.consultationId}/pre-screening`);
                else navigate(`/inbox/${it.consultationId}`);
              }}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-border bg-card text-left active:bg-accent"
            >
              <div className={`w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{it.residentName}</p>
                  <span className="text-[10.5px] text-muted-foreground flex-shrink-0">{formatRelative(it.at)}</span>
                </div>
                <p className="text-[12.5px] text-foreground mt-0.5">{it.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{it.detail}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}
