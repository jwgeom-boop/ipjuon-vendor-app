import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { formatWon } from "../format";
import type { Consultation } from "../types";

type SettlementData = Consultation & Record<string, number | string | null | undefined>;

const SETTLE_ITEMS = [
  { label: "중도금", principalKey: "settle_middle_principal", interestKey: "settle_middle_interest" },
  { label: "분양잔금", principalKey: "settle_balance_principal", interestKey: "settle_balance_interest" },
  { label: "발코니 확장", principalKey: "settle_balcony" },
  { label: "유상옵션", principalKey: "settle_options" },
  { label: "보증수수료", interestKey: "settle_guarantee_fee" },
  { label: "선수관리비", principalKey: "settle_mgmt_fee" },
  { label: "이주비", principalKey: "settle_moving_allowance" },
  { label: "인지대 (대출)", principalKey: "settle_stamp_duty" },
  { label: "인지대 (추가)", principalKey: "settle_stamp_duty_additional" },
] as const;

function num(v: unknown): number {
  return Number(v) || 0;
}

export default function SettlementPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery<SettlementData>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<SettlementData>(`/consultation/${id}`),
    enabled: !!id,
  });

  const totals = useMemo(() => {
    if (!data) return { A: 0, B: 0, need: 0 };
    const A = SETTLE_ITEMS.reduce((sum, it) => {
      const p = it.principalKey ? num(data[it.principalKey]) : 0;
      const i = "interestKey" in it && it.interestKey ? num(data[it.interestKey]) : 0;
      return sum + p + i;
    }, 0);
    const B = num(data.loan_amount) + num(data.additional_loan_amount);
    return { A, B, need: A - B };
  }, [data]);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="정산서" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="정산서" />
      <div className="px-4 py-4 space-y-4 pb-8">
        {/* 요약 */}
        <section className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">자동 계산</p>
          <div className="space-y-2">
            <Row label="상환 합계 (A)" value={formatWon(totals.A)} />
            <Row label="대출 합계 (B)" value={formatWon(totals.B)} />
            <div className="h-px bg-border my-2" />
            <Row
              label="필요 자금 (A - B)"
              value={formatWon(totals.need)}
              emphasized
              tone={totals.need > 0 ? "rose" : "emerald"}
            />
          </div>
        </section>

        {/* 대출 정보 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-bold text-foreground mb-2">대출 정보</p>
          <Row label="대출금" value={formatWon(num(data.loan_amount))} />
          <Row label="추가 대출" value={formatWon(num(data.additional_loan_amount))} />
        </section>

        {/* 정산 항목 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <p className="text-sm font-bold text-foreground mb-2">정산 항목</p>
          {SETTLE_ITEMS.map((it) => {
            const p = it.principalKey ? num(data[it.principalKey]) : 0;
            const i = "interestKey" in it && it.interestKey ? num(data[it.interestKey]) : 0;
            const total = p + i;
            return (
              <div key={it.label} className="flex justify-between items-baseline">
                <span className="text-[12.5px] text-muted-foreground">{it.label}</span>
                <span className={`text-[13px] tabular-nums ${total > 0 ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}>
                  {total > 0 ? formatWon(total) : "-"}
                </span>
              </div>
            );
          })}
        </section>

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground px-1 leading-relaxed">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          편집은 PC 관리자 사이트에서 진행해주세요. 모바일에서는 현재 정산 상태만 확인 가능합니다.
        </p>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  emphasized,
  tone,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  tone?: "rose" | "emerald";
}) {
  const valueColor = tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="flex justify-between items-baseline">
      <span className={`${emphasized ? "text-sm font-bold" : "text-[13px]"} text-muted-foreground`}>{label}</span>
      <span className={`${emphasized ? "text-base font-bold" : "text-[14px] font-medium"} tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
