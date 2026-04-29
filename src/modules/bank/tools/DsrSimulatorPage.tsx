import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWon } from "../format";
import {
  calculateDSR,
  type ExistingLoan,
  type NewMortgage,
} from "../dsr/calculator";
import {
  DSR_CONSTANTS,
  RATE_TYPE_LABEL,
  REPAYMENT_TYPE_LABEL,
  FINANCIAL_SECTOR_LABEL,
  type FinancialSector,
  type RateType,
  type RepaymentType,
} from "../dsr/constants";

type Region = "capital_reg" | "capital_nonreg" | "non_capital";

const REGION_TO_FLAGS: Record<Region, { isCapitalArea: boolean; isRegulated: boolean }> = {
  capital_reg: { isCapitalArea: true, isRegulated: true },
  capital_nonreg: { isCapitalArea: true, isRegulated: false },
  non_capital: { isCapitalArea: false, isRegulated: false },
};

export default function DsrSimulatorPage() {
  const [params] = useSearchParams();

  // 신청자
  const [income, setIncome] = useState<number>(() => Number(params.get("income")) || 0);
  const [spouseIncome, setSpouseIncome] = useState<number>(0);

  // 조건
  const [region, setRegion] = useState<Region>("capital_reg");
  const [sector, setSector] = useState<FinancialSector>("bank");

  // 신규 잔금대출
  const [amount, setAmount] = useState<number>(() => Number(params.get("amount")) || 0);
  const [years, setYears] = useState<number>(30);
  const [rate, setRate] = useState<number>(4.5);
  const [rateType, setRateType] = useState<RateType>("variable");
  const [repaymentType, setRepaymentType] = useState<RepaymentType>("principal_interest");

  // 기존 주담대
  const [showExistingMortgage, setShowExistingMortgage] = useState(false);
  const [exMortgageBalance, setExMortgageBalance] = useState<number>(0);
  const [exMortgageRate, setExMortgageRate] = useState<number>(4.3);
  const [exMortgageYears, setExMortgageYears] = useState<number>(25);
  const [exMortgageType, setExMortgageType] = useState<RateType>("variable");

  // 기존 신용대출
  const [showCreditLoan, setShowCreditLoan] = useState(false);
  const [creditLoan, setCreditLoan] = useState<number>(() => Number(params.get("credit")) || 0);
  const [creditRate, setCreditRate] = useState<number>(5.5);

  // 마이너스통장
  const [showCreditLine, setShowCreditLine] = useState(false);
  const [creditLineLimit, setCreditLineLimit] = useState<number>(0);
  const [creditLineRate, setCreditLineRate] = useState<number>(5.5);

  // 전세대출
  const [showJeonse, setShowJeonse] = useState(false);
  const [jeonseBalance, setJeonseBalance] = useState<number>(0);
  const [jeonseRate, setJeonseRate] = useState<number>(3.5);

  const result = useMemo(() => {
    const newLoan: NewMortgage | undefined =
      amount > 0
        ? {
            amount,
            years: years || 30,
            rate: rate / 100,
            rateType,
            repaymentType,
          }
        : undefined;

    const existing: ExistingLoan[] = [];
    if (exMortgageBalance > 0) {
      existing.push({
        id: "em",
        type: "주택담보대출",
        balance: exMortgageBalance,
        rate: exMortgageRate / 100,
        remainingYears: exMortgageYears || 25,
        rateType: exMortgageType,
      });
    }
    if (creditLoan > 0) {
      existing.push({ id: "cl", type: "신용대출", balance: creditLoan, rate: creditRate / 100 });
    }
    if (creditLineLimit > 0) {
      existing.push({ id: "ln", type: "마이너스통장", limit: creditLineLimit, rate: creditLineRate / 100 });
    }
    if (jeonseBalance > 0) {
      existing.push({ id: "je", type: "전세대출", balance: jeonseBalance, rate: jeonseRate / 100 });
    }

    return calculateDSR({
      income,
      spouseIncome: spouseIncome > 0 ? spouseIncome : undefined,
      property: REGION_TO_FLAGS[region],
      sector,
      existingLoans: existing,
      newLoan,
    });
  }, [
    income,
    spouseIncome,
    region,
    sector,
    amount,
    years,
    rate,
    rateType,
    repaymentType,
    exMortgageBalance,
    exMortgageRate,
    exMortgageYears,
    exMortgageType,
    creditLoan,
    creditRate,
    creditLineLimit,
    creditLineRate,
    jeonseBalance,
    jeonseRate,
  ]);

  const dsrPct = result.income > 0 ? result.dsr * 100 : 0;
  const limitPct = result.limit * 100;
  const limitAmount = result.income * result.limit;
  const overage = Math.max(0, result.totalAnnual - limitAmount);
  const tone: "ok" | "near" | "over" =
    !result.income || amount <= 0
      ? "ok"
      : result.dsr > result.limit
      ? "over"
      : dsrPct >= limitPct - 5
      ? "near"
      : "ok";

  return (
    <div>
      <PageHeader title="DSR 시뮬레이터" showBack={false} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          ⚠️ 개략치 · 스트레스 DSR (10.15 대책 / 2025.10.16 시행 기준 · {DSR_CONSTANTS.LAST_UPDATED}). 실제 은행 심사와 다를 수 있습니다.
        </p>

        {/* 결과 */}
        <section
          className={cn(
            "rounded-xl border-2 p-4",
            tone === "over"
              ? "bg-rose-50 border-rose-300"
              : tone === "near"
              ? "bg-amber-50 border-amber-300"
              : "bg-emerald-50 border-emerald-300"
          )}
        >
          {result.income > 0 && amount > 0 ? (
            <>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                예상 DSR · {FINANCIAL_SECTOR_LABEL[sector]}
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums",
                    tone === "over" ? "text-rose-700" : tone === "near" ? "text-amber-700" : "text-emerald-700"
                  )}
                >
                  {dsrPct.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">/ 한도 {limitPct.toFixed(0)}%</span>
              </div>
              <p
                className={cn(
                  "text-[13px] font-semibold mt-1",
                  tone === "over" ? "text-rose-700" : tone === "near" ? "text-amber-700" : "text-emerald-700"
                )}
              >
                {tone === "over"
                  ? "한도 초과 예상"
                  : tone === "near"
                  ? `한도 ${limitPct.toFixed(0)}% 근접`
                  : "한도 내 · 여유 있음"}
              </p>

              <div className="relative mt-3 mb-3 h-2 bg-white/60 rounded">
                <div
                  className={cn(
                    "h-full rounded transition-all",
                    tone === "over" ? "bg-rose-500" : tone === "near" ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min((dsrPct / Math.max(limitPct * 1.5, 1)) * 100, 100)}%` }}
                />
                <div
                  className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-foreground"
                  style={{ left: `${(limitPct / Math.max(limitPct * 1.5, 1)) * 100}%` }}
                />
              </div>

              <div className="space-y-1 text-[12.5px] mt-3">
                {spouseIncome > 0 ? (
                  <>
                    <Row label="합산 소득" value={formatWon(result.income)} bold />
                    <Row label="· 본인" value={formatWon(income)} dim />
                    <Row label="· 배우자" value={formatWon(spouseIncome)} dim />
                  </>
                ) : (
                  <Row label="연소득" value={formatWon(result.income)} />
                )}

                <div className="h-px bg-border my-1.5" />

                {result.breakdown.map((b) => (
                  <div key={b.id}>
                    <Row label={b.label} value={formatWon(Math.round(b.annual))} />
                    {b.note && <p className="text-[10.5px] text-muted-foreground pl-2">· {b.note}</p>}
                  </div>
                ))}
                {result.breakdown.length > 0 && (
                  <p className="text-[10.5px] text-muted-foreground pl-2 leading-relaxed">
                    스트레스 {(result.stressedRate * 100).toFixed(2)}% = 기준{" "}
                    {(result.baseRate * 100).toFixed(2)}% +{" "}
                    {((result.stressedRate - result.baseRate) * 100).toFixed(2)}%
                  </p>
                )}

                <div className="h-px bg-border my-1.5" />

                <Row label="연 원리금 합계" value={formatWon(Math.round(result.totalAnnual))} bold />
                <Row label={`DSR ${limitPct.toFixed(0)}% 한도`} value={formatWon(Math.round(limitAmount))} dim />
                {tone === "over" ? (
                  <Row label="초과 금액" value={`+${formatWon(Math.round(overage))}`} tone="rose" bold />
                ) : (
                  <Row label="여유 금액" value={formatWon(Math.round(result.headroom))} tone="emerald" />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              연소득과 신청금액을 입력해주세요.
            </p>
          )}
        </section>

        {/* 신청자 정보 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">신청자 소득</p>
          <Field label="본인 연소득">
            <MoneyInput value={income} onChange={setIncome} />
          </Field>
          <Field label="배우자 소득">
            <MoneyInput value={spouseIncome} onChange={setSpouseIncome} />
          </Field>
          <p className="text-[10.5px] text-muted-foreground">배우자 소득은 합산하여 DSR 계산</p>
        </section>

        {/* 신규 대출 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">신규 잔금대출</p>
          <Field label="신청 금액"><MoneyInput value={amount} onChange={setAmount} /></Field>
          <Field label="대출 기간"><YearInput value={years} onChange={setYears} /></Field>
          <Field label="예상 금리"><PctInput value={rate} onChange={setRate} /></Field>
          <Field label="금리 유형">
            <ChipGroup
              value={rateType}
              onChange={setRateType}
              options={[
                ["variable", RATE_TYPE_LABEL.variable],
                ["mixed_3y", RATE_TYPE_LABEL.mixed_3y],
                ["mixed_5y", RATE_TYPE_LABEL.mixed_5y],
              ]}
            />
          </Field>
          <Field label="상환 방식">
            <ChipGroup
              value={repaymentType}
              onChange={setRepaymentType}
              options={[
                ["principal_interest", REPAYMENT_TYPE_LABEL.principal_interest],
                ["principal_only", REPAYMENT_TYPE_LABEL.principal_only],
                ["maturity_only", REPAYMENT_TYPE_LABEL.maturity_only],
              ]}
            />
          </Field>
        </section>

        {/* 조건 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">규제 조건</p>
          <Field label="지역">
            <ChipGroup
              value={region}
              onChange={setRegion}
              options={[
                ["capital_reg", "수도권·규제"],
                ["capital_nonreg", "수도권·비규제"],
                ["non_capital", "지방"],
              ]}
            />
          </Field>
          <Field label="신청처">
            <ChipGroup
              value={sector}
              onChange={setSector}
              options={[
                ["bank", "1금융 (40%)"],
                ["nbfi", "상호금융 (50%)"],
              ]}
            />
          </Field>
        </section>

        {/* 기존 대출 (접힘) */}
        <CollapsibleSection
          title="기존 주택담보대출"
          open={showExistingMortgage || exMortgageBalance > 0}
          onToggle={() => setShowExistingMortgage((v) => !v)}
          summary={exMortgageBalance > 0 ? formatWon(exMortgageBalance) : undefined}
        >
          <Field label="잔액"><MoneyInput value={exMortgageBalance} onChange={setExMortgageBalance} /></Field>
          {exMortgageBalance > 0 && (
            <>
              <Field label="금리"><PctInput value={exMortgageRate} onChange={setExMortgageRate} /></Field>
              <Field label="잔여기간"><YearInput value={exMortgageYears} onChange={setExMortgageYears} /></Field>
              <Field label="금리 유형">
                <ChipGroup
                  value={exMortgageType}
                  onChange={setExMortgageType}
                  options={[
                    ["variable", "변동"],
                    ["mixed_3y", "혼합 3y"],
                    ["mixed_5y", "혼합 5y"],
                  ]}
                />
              </Field>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="기존 신용대출"
          open={showCreditLoan || creditLoan > 0}
          onToggle={() => setShowCreditLoan((v) => !v)}
          summary={creditLoan > 0 ? formatWon(creditLoan) : undefined}
        >
          <Field label="잔액"><MoneyInput value={creditLoan} onChange={setCreditLoan} /></Field>
          {creditLoan > 0 && <Field label="금리"><PctInput value={creditRate} onChange={setCreditRate} /></Field>}
          {creditLoan > 100_000_000 && (
            <p className="text-[10.5px] text-rose-600">⚠️ 1억 초과 — 스트레스 +1.5%p 자동 가산</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="마이너스통장"
          open={showCreditLine || creditLineLimit > 0}
          onToggle={() => setShowCreditLine((v) => !v)}
          summary={creditLineLimit > 0 ? `한도 ${formatWon(creditLineLimit)}` : undefined}
        >
          <Field label="한도"><MoneyInput value={creditLineLimit} onChange={setCreditLineLimit} /></Field>
          {creditLineLimit > 0 && (
            <Field label="금리"><PctInput value={creditLineRate} onChange={setCreditLineRate} /></Field>
          )}
          {creditLineLimit > 0 && (
            <p className="text-[10.5px] text-muted-foreground">한도 전액 · 5년 균등분할 가정</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="전세대출"
          open={showJeonse || jeonseBalance > 0}
          onToggle={() => setShowJeonse((v) => !v)}
          summary={jeonseBalance > 0 ? formatWon(jeonseBalance) : undefined}
        >
          <Field label="잔액"><MoneyInput value={jeonseBalance} onChange={setJeonseBalance} /></Field>
          {jeonseBalance > 0 && <Field label="금리"><PctInput value={jeonseRate} onChange={setJeonseRate} /></Field>}
          {jeonseBalance > 0 && (
            <p className="text-[10.5px] text-muted-foreground">이자만 반영</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  dim,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dim?: boolean;
  tone?: "rose" | "emerald";
}) {
  const valueColor =
    tone === "rose"
      ? "text-rose-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : dim
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="flex justify-between items-baseline">
      <span className={cn(bold ? "font-semibold" : "", "text-muted-foreground")}>{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold" : "font-medium", valueColor)}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        inputMode="numeric"
        value={value ? value.toLocaleString("ko-KR") : ""}
        placeholder="0"
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="h-9 text-right tabular-nums"
      />
      <span className="text-xs text-muted-foreground">원</span>
    </div>
  );
}

function PctInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        inputMode="decimal"
        value={value || ""}
        placeholder="0"
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d.]/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="h-9 text-right tabular-nums w-20"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

function YearInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="h-9 text-right tabular-nums w-20"
      />
      <span className="text-xs text-muted-foreground">년</span>
    </div>
  );
}

function ChipGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors",
            v === value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  summary,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-accent"
      >
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {summary && <span className="text-[11px] text-muted-foreground tabular-nums">{summary}</span>}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
}
