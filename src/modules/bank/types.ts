export type LoanStatus =
  | "apply"
  | "consulting"
  | "reviewing"
  | "result"
  | "signing_reservation"
  | "signing"
  | "executing"
  | "done"
  | "cancel"
  | "cancel_requested";

export type Consultation = {
  id: string;
  resident_name: string;
  resident_phone?: string;
  complex_name?: string;
  complex_full_name?: string;
  dong?: string;
  ho?: string;
  apt_type?: string;
  loan_amount?: number;
  additional_loan_amount?: number;
  memo?: string;
  loan_status?: LoanStatus;
  vendor_name?: string;
  bank_name?: string;
  manager?: string;
  execution_date?: string;
  receive_date?: string;
  document_date?: string;
  signing_date?: string;
  signing_time?: string;
  signing_selected_date?: string;
  signing_selected_time?: string;
  signing_selected_location_str?: string;
  signing_confirmed_at?: string;
  moving_in_date?: string;
  stage_changed_at?: string;
  created_at?: string;
  resident_last_action_at?: string;
  resident_last_action_type?: string;
  b2c_messages?: string;
  reported_middle_interest?: number;
  reported_middle_interest_at?: string;
  loan_application_at?: string;
  // 입주민 자가 입력
  contractor?: string;
  resident_no?: string;
  joint_owner_name?: string;
  joint_owner_rrn?: string;
  joint_owner_tel?: string;
  desired_loan?: string;
  loan_period?: string;
  annual_income_y1?: number;
  annual_income_y2?: number;
  existing_credit_loan?: number;
  existing_collateral_loan?: number;
  sale_price_amount?: number;
  desired_date?: string;
  existing_homes?: string;
};

export type B2cMessage = {
  by: "resident" | "consultant" | "bank";
  text: string;
  at: string;
};

export const STAGE_LABEL: Record<LoanStatus, string> = {
  apply: "신청",
  consulting: "상담",
  reviewing: "심사",
  result: "결과",
  signing_reservation: "예약",
  signing: "자서",
  executing: "실행중",
  done: "완료",
  cancel: "취소",
  cancel_requested: "취소요청",
};

export const STAGE_TONE: Record<LoanStatus, string> = {
  apply: "bg-blue-50 text-blue-700 border-blue-200",
  consulting: "bg-amber-50 text-amber-700 border-amber-200",
  reviewing: "bg-purple-50 text-purple-700 border-purple-200",
  result: "bg-emerald-50 text-emerald-700 border-emerald-200",
  signing_reservation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  signing: "bg-indigo-50 text-indigo-800 border-indigo-300",
  executing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  done: "bg-gray-100 text-gray-600 border-gray-200",
  cancel: "bg-rose-50 text-rose-600 border-rose-200",
  cancel_requested: "bg-rose-50 text-rose-700 border-rose-300",
};
