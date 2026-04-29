import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Share2, Copy, Phone, MessageSquare } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/shell/auth/AuthContext";
import { formatWon } from "../format";
import { shareOrCopy, copyText } from "./shareUtils";
import type { Consultation } from "../types";

type Settlement = Consultation & {
  settle_middle_principal?: number | null;
  settle_middle_interest?: number | null;
  settle_middle_bank?: string | null;
  settle_middle_account?: string | null;
  settle_balance_principal?: number | null;
  settle_balance_interest?: number | null;
  settle_balance_account?: string | null;
  settle_balcony?: number | null;
  settle_options?: number | null;
  settle_guarantee_fee?: number | null;
  settle_mgmt_fee?: number | null;
  settle_mgmt_account?: string | null;
  settle_moving_allowance?: number | null;
  settle_moving_account?: string | null;
  settle_moving_bank?: string | null;
  settle_stamp_duty?: number | null;
  settle_stamp_duty_additional?: number | null;
  additional_loan_amount?: number | null;
};

function num(v: unknown): number {
  return Number(v) || 0;
}

export default function RepaymentSharePage() {
  const { id } = useParams<{ id: string }>();
  const { auth } = useAuth();
  const { data, isLoading } = useQuery<Settlement>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<Settlement>(`/consultation/${id}`),
    enabled: !!id,
  });

  const text = useMemo(() => {
    if (!data) return "";
    return buildRepaymentText(data, auth?.bankName ?? "");
  }, [data, auth?.bankName]);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="상환 안내문" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  const phone = data.resident_phone;

  return (
    <>
      <PageHeader title="상환 안내문" />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2.5">
          📱 카카오톡·SMS·메일 등으로 입주민에게 공유 가능. 정산 내역과 입금 안내가 포함됩니다.
        </p>

        {/* 미리보기 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
            미리보기
          </p>
          <pre className="text-[12.5px] text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {text}
          </pre>
        </section>

        {/* 공유 액션 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => shareOrCopy({ title: "상환 안내문", text })}
            className="h-12"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            공유
          </Button>
          <Button variant="outline" onClick={() => copyText(text)} className="h-12">
            <Copy className="w-4 h-4 mr-1.5" />
            복사
          </Button>
        </div>

        {/* 직접 발송 */}
        {phone && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`sms:${phone}?body=${encodeURIComponent(text)}`}
              className="flex items-center justify-center gap-1.5 h-12 rounded-lg border border-border bg-card text-sm font-medium text-foreground active:bg-accent"
            >
              <MessageSquare className="w-4 h-4" />
              SMS로 발송
            </a>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-1.5 h-12 rounded-lg border border-border bg-card text-sm font-medium text-foreground active:bg-accent"
            >
              <Phone className="w-4 h-4" />
              전화
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function buildRepaymentText(d: Settlement, bankName: string): string {
  const lines: string[] = [];
  lines.push(`[상환 안내] ${d.resident_name}`);
  lines.push(`${d.complex_name ?? ""} ${d.dong ? `${d.dong}동` : ""} ${d.ho ? `${d.ho}호` : ""}`.trim());
  if (bankName) lines.push(`담당 은행: ${bankName}`);
  if (d.execution_date) lines.push(`실행일: ${d.execution_date}`);
  lines.push("");

  // 대출 정보
  lines.push("─ 대출 정보 ─");
  if (d.loan_amount) lines.push(`대출금: ${formatWon(d.loan_amount)}`);
  const additional = num(d.additional_loan_amount);
  if (additional > 0) lines.push(`추가 대출: ${formatWon(additional)}`);
  lines.push("");

  // 정산 항목
  const items: Array<[string, number, string?]> = [];
  const middleSum = num(d.settle_middle_principal) + num(d.settle_middle_interest);
  if (middleSum > 0) {
    const acc = d.settle_middle_account ?? "";
    const bank = d.settle_middle_bank ?? "";
    items.push(["중도금", middleSum, [bank, acc].filter(Boolean).join(" ")]);
  }
  const balanceSum = num(d.settle_balance_principal) + num(d.settle_balance_interest);
  if (balanceSum > 0) items.push(["분양잔금", balanceSum, d.settle_balance_account ?? ""]);
  if (num(d.settle_balcony) > 0) items.push(["발코니 확장", num(d.settle_balcony)]);
  if (num(d.settle_options) > 0) items.push(["유상옵션", num(d.settle_options)]);
  if (num(d.settle_guarantee_fee) > 0) items.push(["보증수수료", num(d.settle_guarantee_fee)]);
  if (num(d.settle_mgmt_fee) > 0) items.push(["선수관리비", num(d.settle_mgmt_fee), d.settle_mgmt_account ?? ""]);
  if (num(d.settle_moving_allowance) > 0) {
    const bank = d.settle_moving_bank ?? "";
    const acc = d.settle_moving_account ?? "";
    items.push(["이주비", num(d.settle_moving_allowance), [bank, acc].filter(Boolean).join(" ")]);
  }
  if (num(d.settle_stamp_duty) > 0) items.push(["인지대(대출)", num(d.settle_stamp_duty)]);
  if (num(d.settle_stamp_duty_additional) > 0) items.push(["인지대(추가)", num(d.settle_stamp_duty_additional)]);

  if (items.length > 0) {
    lines.push("─ 정산 항목 ─");
    for (const [label, amt, note] of items) {
      lines.push(`${label}: ${formatWon(amt)}${note ? ` (${note})` : ""}`);
    }
    const totalA = items.reduce((s, [, a]) => s + a, 0);
    lines.push(`합계: ${formatWon(totalA)}`);
    const totalB = num(d.loan_amount) + additional;
    const need = totalA - totalB;
    if (need > 0) {
      lines.push(`필요 자금: ${formatWon(need)} (입금 필요)`);
    }
    lines.push("");
  }

  lines.push("※ 실행일 12시 이전 입금 부탁드립니다.");
  lines.push(`문의: ${bankName || "담당 은행"}`);
  return lines.join("\n");
}
