import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Consultation } from "../types";
import { formatWon } from "../format";

export default function PreScreeningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data, isLoading } = useQuery<Consultation>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<Consultation>(`/consultation/${id}`),
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      api.patch(`/bank/consultations/${id}/status`, { loan_status: "consulting" }),
    onSuccess: () => {
      toast.success("가심사를 수용했습니다.");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
      qc.invalidateQueries({ queryKey: ["bank-consultations"] });
      navigate(`/inbox/${id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "수용 실패");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (msg: string) =>
      api.post(`/bank/consultations/${id}/message`, {
        text: `[보완 요청] ${msg}`,
        by: "은행",
      }),
    onSuccess: () => {
      toast.success("보완 요청을 보냈습니다.");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
      navigate(`/inbox/${id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "전송 실패");
    },
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="가심사 수용" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  const hasApplication = !!data.loan_application_at;

  return (
    <>
      <PageHeader title="가심사 수용" />

      <div className="px-4 py-4 space-y-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">{data.resident_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.complex_name}
            {data.dong && data.ho && ` · ${data.dong}-${data.ho}`}
          </p>

          <div className="grid grid-cols-2 gap-y-1 text-[12.5px] mt-3">
            <p className="text-muted-foreground">평형</p>
            <p className="text-foreground text-right">{data.apt_type || "-"}</p>
            <p className="text-muted-foreground">희망금액</p>
            <p className="text-foreground text-right font-semibold">{formatWon(data.loan_amount)}</p>
            <p className="text-muted-foreground">실행일</p>
            <p className="text-foreground text-right">{data.execution_date || "-"}</p>
            <p className="text-muted-foreground">신청서 제출</p>
            <p className="text-foreground text-right">
              {data.loan_application_at ? formatAt(data.loan_application_at) : "미제출"}
            </p>
          </div>
        </section>

        {!hasApplication && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">대출신청서 미제출</p>
              <p className="text-[12px] text-amber-800 mt-0.5">
                고객이 아직 신청서를 제출하지 않았습니다. 메시지로 안내해주세요.
              </p>
            </div>
          </section>
        )}

        {!showRejectForm ? (
          <section className="space-y-2">
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!hasApplication || acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              가심사 수용하고 상담 진행
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => setShowRejectForm(true)}
            >
              보완 요청 (메시지 발송)
            </Button>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">보완 요청 사유</p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예) 최근 2개년 소득자료가 누락되었습니다. 추가 제출 부탁드립니다."
              className="min-h-[120px] text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setReason("");
                }}
              >
                취소
              </Button>
              <Button
                disabled={!reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(reason.trim())}
              >
                보완 요청 보내기
              </Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function formatAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
