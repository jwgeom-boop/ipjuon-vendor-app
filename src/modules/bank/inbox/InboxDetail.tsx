import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Phone,
  MessageSquare,
  FileCheck2,
  ChevronRight,
  Calendar,
  Calculator,
  CheckCircle2,
  Scale,
  Receipt,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGE_TONE, type Consultation, type LoanStatus } from "../types";
import { formatWon, maskRrn, formatDateKo } from "../format";
import { TaskBox, DDayBadges } from "./TaskBox";
import { PinButton } from "./PinButton";
import { PersonalNoteCard } from "./PersonalNoteCard";
import { ErrorState } from "@/shell/ui/ErrorState";
import { DetailHeaderSkeleton } from "@/shell/ui/Skeleton";

const STAGE_ORDER: LoanStatus[] = [
  "apply",
  "consulting",
  "reviewing",
  "result",
  "signing_reservation",
  "signing",
  "executing",
  "done",
];

export default function InboxDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<Consultation>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<Consultation>(`/consultation/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (next: LoanStatus) =>
      api.patch(`/bank/consultations/${id}/status`, { loan_status: next }),
    onSuccess: () => {
      toast.success("단계가 변경되었습니다.");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
      qc.invalidateQueries({ queryKey: ["bank-consultations"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "변경 실패");
    },
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="상세" />
        <div className="px-4 py-4 space-y-4">
          <DetailHeaderSkeleton />
          <DetailHeaderSkeleton />
        </div>
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <PageHeader title="상세" />
        <ErrorState error={error || new Error("상담을 찾을 수 없습니다")} onRetry={refetch} context="상담 상세 조회" />
      </>
    );
  }

  const status = (data.loan_status ?? "apply") as LoanStatus;
  const currentIdx = STAGE_ORDER.indexOf(status);
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null;

  const hasJointOwner = !!(data.joint_owner_name || data.joint_owner_tel);
  const hasApplicationInfo =
    !!(data.sale_price_amount || data.annual_income_y1 || data.existing_credit_loan || data.existing_collateral_loan || data.existing_homes || data.loan_period);

  return (
    <>
      <PageHeader title={data.resident_name} right={<PinButton consultationId={data.id} />} />

      <div className="px-4 py-4 space-y-4">
        {/* 기본 카드 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-base font-bold text-foreground">{data.resident_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.complex_name}
                {data.dong && data.ho && ` · ${data.dong}-${data.ho}`}
              </p>
            </div>
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5", STAGE_TONE[status])}>
              {STAGE_LABEL[status]}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-[12.5px] mt-3">
            <p className="text-muted-foreground">평형</p>
            <p className="text-foreground text-right">{data.apt_type || "-"}</p>
            <p className="text-muted-foreground">희망금액</p>
            <p className="text-foreground text-right font-semibold">{formatWon(data.loan_amount)}</p>
            <p className="text-muted-foreground">실행일</p>
            <p className="text-foreground text-right">{data.execution_date || "-"}</p>
            {data.moving_in_date && (
              <>
                <p className="text-muted-foreground">입주 예정일</p>
                <p className="text-foreground text-right">{data.moving_in_date}</p>
              </>
            )}
            {data.manager && (
              <>
                <p className="text-muted-foreground">담당자</p>
                <p className="text-foreground text-right">{data.manager}</p>
              </>
            )}
          </div>

          {data.resident_phone && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <a
                href={`tel:${data.resident_phone}`}
                className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground active:bg-accent"
              >
                <Phone className="w-4 h-4" />
                전화
              </a>
              <a
                href={`sms:${data.resident_phone}`}
                className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground active:bg-accent"
              >
                <MessageSquare className="w-4 h-4" />
                문자
              </a>
            </div>
          )}
        </section>

        {/* 지금 할 일 */}
        <TaskBox data={data} />

        {/* D-day */}
        <DDayBadges data={data} />

        {/* 자서 확정 정보 (확정된 건만) */}
        {data.signing_confirmed_at && (
          <section className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">
                자서 확정
              </span>
            </div>
            <p className="text-[14px] font-bold text-emerald-900">
              {formatDateKo(data.signing_date)}
              {data.signing_time && ` · ${data.signing_time}`}
            </p>
            {data.signing_selected_location_str && (
              <p className="text-[12.5px] text-emerald-800 mt-0.5">{data.signing_selected_location_str}</p>
            )}
          </section>
        )}

        {/* 메모 (공용) */}
        {data.memo && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-medium text-amber-700 mb-1">🔖 메모 (공용)</p>
            <p className="text-[13px] text-amber-900 whitespace-pre-wrap">{data.memo}</p>
          </section>
        )}

        {/* 개인 메모 (본인만) */}
        <PersonalNoteCard consultationId={data.id} />

        {/* 액션 카드들 */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          {status === "apply" && (
            <>
              <button
                onClick={() => navigate(`/inbox/${id}/pre-screening`)}
                className="w-full flex items-center justify-between p-4 active:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileCheck2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">가심사 수용</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {data.loan_application_at ? "신청서 도착 — 수용 또는 보완 요청" : "고객의 신청서 제출 대기 중"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />
            </>
          )}

          {(status === "result" || status === "signing_reservation") && (
            <>
              <button
                onClick={() => navigate(`/inbox/${id}/signing`)}
                className="w-full flex items-center justify-between p-4 active:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">자서 일정</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {data.signing_confirmed_at
                        ? "확정됨 — 상세보기"
                        : data.signing_selected_date
                        ? "고객이 시간 선택 — 확정 필요"
                        : "캘린더 공개·관리"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />
            </>
          )}

          {status === "signing" && (
            <>
              <button
                onClick={() => statusMutation.mutate("executing")}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-between p-4 active:bg-accent disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">자서 완료 처리</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {statusMutation.isPending ? "처리 중..." : "자서 완료 → 실행 단계로 진행"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />
            </>
          )}

          {(status === "executing" || status === "done") && (
            <>
              <button
                onClick={() => navigate(`/inbox/${id}/settlement`)}
                className="w-full flex items-center justify-between p-4 active:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">정산서</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">대출금·정산 항목·필요자금 확인</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />

              <button
                onClick={() => navigate(`/inbox/${id}/repayment-share`)}
                className="w-full flex items-center justify-between p-4 active:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">상환 안내문</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">고객에게 정산·입금 안내 공유</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />
            </>
          )}

          {(status === "signing" || status === "executing" || status === "done") && (
            <>
              <button
                onClick={() => navigate(`/inbox/${id}/legal-share`)}
                className="w-full flex items-center justify-between p-4 active:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">법무사 송부</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">자서 후 법무사 등기 안내 공유</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />
            </>
          )}

          <button
            onClick={() => navigate(`/inbox/${id}/messages`)}
            className="w-full flex items-center justify-between p-4 active:bg-accent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">메시지</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">고객과 양방향 메시지</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </section>

        {/* 공동명의자 */}
        {hasJointOwner && (
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2.5">공동명의자</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
              {data.joint_owner_name && (
                <>
                  <p className="text-muted-foreground">이름</p>
                  <p className="text-foreground text-right">{data.joint_owner_name}</p>
                </>
              )}
              {data.joint_owner_rrn && (
                <>
                  <p className="text-muted-foreground">주민번호</p>
                  <p className="text-foreground text-right tabular-nums">{maskRrn(data.joint_owner_rrn)}</p>
                </>
              )}
              {data.joint_owner_tel && (
                <>
                  <p className="text-muted-foreground">연락처</p>
                  <a
                    href={`tel:${data.joint_owner_tel}`}
                    className="text-primary text-right font-medium underline-offset-2 hover:underline"
                  >
                    {data.joint_owner_tel}
                  </a>
                </>
              )}
            </div>
          </section>
        )}

        {/* 신청서 자가 입력 정보 */}
        {hasApplicationInfo && (
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2.5">신청서 정보</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
              {data.sale_price_amount && (
                <>
                  <p className="text-muted-foreground">분양가</p>
                  <p className="text-foreground text-right tabular-nums">{formatWon(data.sale_price_amount)}</p>
                </>
              )}
              {data.annual_income_y1 && (
                <>
                  <p className="text-muted-foreground">작년 소득</p>
                  <p className="text-foreground text-right tabular-nums">{formatWon(data.annual_income_y1)}</p>
                </>
              )}
              {data.annual_income_y2 && (
                <>
                  <p className="text-muted-foreground">재작년 소득</p>
                  <p className="text-foreground text-right tabular-nums">{formatWon(data.annual_income_y2)}</p>
                </>
              )}
              {data.existing_credit_loan != null && data.existing_credit_loan > 0 && (
                <>
                  <p className="text-muted-foreground">신용대출 잔액</p>
                  <p className="text-foreground text-right tabular-nums">{formatWon(data.existing_credit_loan)}</p>
                </>
              )}
              {data.existing_collateral_loan != null && data.existing_collateral_loan > 0 && (
                <>
                  <p className="text-muted-foreground">담보대출 잔액</p>
                  <p className="text-foreground text-right tabular-nums">{formatWon(data.existing_collateral_loan)}</p>
                </>
              )}
              {data.loan_period && (
                <>
                  <p className="text-muted-foreground">상환기간</p>
                  <p className="text-foreground text-right">{data.loan_period}</p>
                </>
              )}
              {data.existing_homes && (
                <>
                  <p className="text-muted-foreground">주택 보유</p>
                  <p className="text-foreground text-right">{data.existing_homes}</p>
                </>
              )}
            </div>
          </section>
        )}

        {/* 단계 진행 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">단계 진행</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGE_ORDER.map((s, i) => (
              <div key={s} className="flex items-center flex-shrink-0">
                <div
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10.5px] font-medium border",
                    i <= currentIdx ? STAGE_TONE[s] : "bg-card text-muted-foreground border-border"
                  )}
                >
                  {STAGE_LABEL[s]}
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <span className="text-muted-foreground mx-0.5 text-[10px]">›</span>
                )}
              </div>
            ))}
          </div>

          <StageDwellInfo data={data} status={status} />

          {nextStage && (
            <Button
              className="w-full h-11 mt-3 text-sm font-semibold"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(nextStage)}
            >
              다음 단계로 → {STAGE_LABEL[nextStage]}
            </Button>
          )}
        </section>
      </div>
    </>
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
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

const STAGE_WARN_DAYS: Partial<Record<LoanStatus, number>> = {
  apply: 3,
  consulting: 5,
  reviewing: 7,
  result: 3,
  signing_reservation: 5,
};

function StageDwellInfo({ data, status }: { data: Consultation; status: LoanStatus }) {
  if (!data.stage_changed_at) return null;
  const changedTime = new Date(data.stage_changed_at).getTime();
  const dwellDays = Math.floor((Date.now() - changedTime) / 86_400_000);
  const warnAt = STAGE_WARN_DAYS[status];
  const isStuck = warnAt != null && dwellDays >= warnAt;

  const changedDate = new Date(data.stage_changed_at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mt-3 flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">
        마지막 변경 <span className="text-foreground font-medium">{changedDate}</span>
      </span>
      <span
        className={cn(
          "px-2 py-0.5 rounded-full font-bold tabular-nums",
          isStuck
            ? "bg-rose-100 text-rose-700 border border-rose-200"
            : dwellDays >= 1
            ? "bg-blue-50 text-blue-700 border border-blue-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        )}
      >
        {isStuck && "⚠️ "}
        체류 {dwellDays}일{isStuck && " (정체)"}
      </span>
    </div>
  );
}
