// Ported from supabase-connect/src/v4/dsr/calculator.ts
// Same formula and rules — kept intact for result parity with PC tool.

import {
  DSR_CONSTANTS,
  type FinancialSector,
  type RateType,
  type RepaymentType,
  getStressBaseRate,
  getStressRatio,
} from "./constants";
import {
  mortgagePayment,
  principalOnlyFirstYearPayment,
  interestOnlyAnnual,
} from "./formulas";

export interface NewMortgage {
  amount: number;
  years: number;
  rate: number;
  rateType: RateType;
  repaymentType: RepaymentType;
}

export type ExistingLoan =
  | {
      id: string;
      type: "주택담보대출";
      balance: number;
      rate: number;
      remainingYears: number;
      rateType?: RateType;
    }
  | {
      id: string;
      type: "신용대출";
      balance: number;
      rate: number;
    }
  | {
      id: string;
      type: "마이너스통장";
      limit: number;
      rate: number;
    }
  | {
      id: string;
      type: "전세대출";
      balance: number;
      rate: number;
    };

export interface BorrowerProfile {
  income: number;
  spouseIncome?: number;
  property: { isCapitalArea: boolean; isRegulated: boolean };
  sector?: FinancialSector;
  existingLoans: ExistingLoan[];
  newLoan?: NewMortgage;
}

export interface DSRBreakdownItem {
  id: string;
  label: string;
  annual: number;
  note?: string;
}

export interface DSRResult {
  dsr: number;
  totalAnnual: number;
  income: number;
  breakdown: DSRBreakdownItem[];
  passed: boolean;
  limit: number;
  headroom: number;
  stressedRate: number; // 신규대출 스트레스 금리 (없으면 0)
  baseRate: number;
}

function mortgageStressRate(
  rate: number,
  rateType: RateType,
  isCapital: boolean,
  isRegulated: boolean
): number {
  return rate + getStressBaseRate(isCapital, isRegulated) * getStressRatio(rateType);
}

function newMortgageAnnual(
  loan: NewMortgage,
  isCapital: boolean,
  isRegulated: boolean
): number {
  const stressed = mortgageStressRate(loan.rate, loan.rateType, isCapital, isRegulated);
  const months = loan.years * 12;
  switch (loan.repaymentType) {
    case "principal_interest":
      return mortgagePayment(loan.amount, stressed, months) * 12;
    case "principal_only":
      return principalOnlyFirstYearPayment(loan.amount, stressed, months);
    case "maturity_only":
      return mortgagePayment(loan.amount, stressed, months) * 12;
  }
}

function existingMortgageAnnual(
  loan: Extract<ExistingLoan, { type: "주택담보대출" }>,
  isCapital: boolean,
  isRegulated: boolean
): number {
  const rateType = loan.rateType ?? "variable";
  const stressed = mortgageStressRate(loan.rate, rateType, isCapital, isRegulated);
  const months = Math.max(1, loan.remainingYears) * 12;
  return mortgagePayment(loan.balance, stressed, months) * 12;
}

function creditLoanAnnual(loan: Extract<ExistingLoan, { type: "신용대출" }>): number {
  const overThreshold = loan.balance > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD;
  const rate = loan.rate + (overThreshold ? DSR_CONSTANTS.STRESS_RATE_NON_MORTGAGE : 0);
  const months = DSR_CONSTANTS.REGULATED_MATURITY_CREDIT * 12;
  return mortgagePayment(loan.balance, rate, months) * 12;
}

function creditLineAnnual(loan: Extract<ExistingLoan, { type: "마이너스통장" }>): number {
  const overThreshold = loan.limit > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD;
  const rate = loan.rate + (overThreshold ? DSR_CONSTANTS.STRESS_RATE_NON_MORTGAGE : 0);
  const months = DSR_CONSTANTS.REGULATED_MATURITY_CREDIT_LINE * 12;
  return mortgagePayment(loan.limit, rate, months) * 12;
}

function jeonseAnnual(loan: Extract<ExistingLoan, { type: "전세대출" }>): number {
  return interestOnlyAnnual(loan.balance, loan.rate);
}

export function calculateDSR(profile: BorrowerProfile): DSRResult {
  const isCapital = profile.property.isCapitalArea;
  const isRegulated = profile.property.isRegulated;
  const sector: FinancialSector = profile.sector ?? "bank";
  const breakdown: DSRBreakdownItem[] = [];

  let stressedRate = 0;
  let baseRate = 0;

  if (profile.newLoan && profile.newLoan.amount > 0) {
    const annual = newMortgageAnnual(profile.newLoan, isCapital, isRegulated);
    breakdown.push({
      id: "new",
      label: "신규 잔금대출",
      annual,
      note:
        profile.newLoan.repaymentType === "maturity_only"
          ? "만기일시 → 원리금균등 환산"
          : undefined,
    });
    stressedRate = mortgageStressRate(
      profile.newLoan.rate,
      profile.newLoan.rateType,
      isCapital,
      isRegulated
    );
    baseRate = profile.newLoan.rate;
  }

  for (const loan of profile.existingLoans) {
    if ((DSR_CONSTANTS.EXCLUDED_LOAN_TYPES as readonly string[]).includes(loan.type)) continue;
    let annual = 0;
    let note: string | undefined;
    switch (loan.type) {
      case "주택담보대출":
        annual = existingMortgageAnnual(loan, isCapital, isRegulated);
        break;
      case "신용대출":
        annual = creditLoanAnnual(loan);
        note = "규제상 5년 균등분할";
        if (loan.balance > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD) note += " · 1억 초과 +1.5%";
        break;
      case "마이너스통장":
        annual = creditLineAnnual(loan);
        note = "한도 전액 · 5년 균등분할";
        if (loan.limit > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD) note += " · 1억 초과 +1.5%";
        break;
      case "전세대출":
        annual = jeonseAnnual(loan);
        note = "이자만 반영";
        break;
    }
    breakdown.push({ id: loan.id, label: `기존 ${loan.type}`, annual, note });
  }

  const income = profile.income + (profile.spouseIncome ?? 0);
  const totalAnnual = breakdown.reduce((sum, b) => sum + b.annual, 0);
  const dsr = income > 0 ? totalAnnual / income : 0;
  const limit = sector === "nbfi" ? DSR_CONSTANTS.DSR_LIMIT_NBFI : DSR_CONSTANTS.DSR_LIMIT_BANK;
  const headroom = Math.max(0, income * limit - totalAnnual);

  return {
    dsr,
    totalAnnual,
    income,
    breakdown,
    passed: income > 0 && dsr <= limit,
    limit,
    headroom,
    stressedRate,
    baseRate,
  };
}
