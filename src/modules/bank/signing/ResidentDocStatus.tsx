import { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Consultation } from "../types";

/**
 * 자서 당일 누락 서류 사전 파악용 위젯.
 * 입주민이 ipjuon-app에서 체크한 서류 목록을 mirror.
 *
 * 데이터 소스: Consultation.resident_doc_checks (쉼표 구분 doc id)
 * 표준 서류 목록 (ipjuon-app과 동기화 필요):
 *   - id_card        주민등록증
 *   - sale_contract  분양계약서
 *   - income_y1      최근 1년 소득자료
 *   - income_y2      최근 2년 소득자료
 *   - bank_consent   대출 동의서
 */

const STANDARD_DOCS: Array<{ id: string; label: string; required: boolean }> = [
  { id: "id_card", label: "주민등록증", required: true },
  { id: "sale_contract", label: "분양계약서", required: true },
  { id: "income_y1", label: "최근 1년 소득자료", required: true },
  { id: "income_y2", label: "최근 2년 소득자료", required: false },
  { id: "bank_consent", label: "대출 동의서", required: true },
];

type Props = {
  data: Consultation;
};

export function ResidentDocStatus({ data }: Props) {
  const checked = useMemo(() => {
    const raw = data.resident_doc_checks;
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }, [data.resident_doc_checks]);

  const lastCheckAt = data.resident_doc_checks_at;

  const requiredDocs = STANDARD_DOCS.filter((d) => d.required);
  const checkedRequiredCount = requiredDocs.filter((d) => checked.has(d.id)).length;
  const totalRequiredCount = requiredDocs.length;
  const allRequired = checkedRequiredCount === totalRequiredCount;
  const noDataYet = checked.size === 0 && !lastCheckAt;

  return (
    <section
      className={cn(
        "rounded-xl border-2 p-4",
        noDataYet
          ? "bg-slate-50 border-slate-200"
          : allRequired
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex items-center gap-1.5 mb-3">
        {noDataYet ? (
          <AlertCircle className="w-4 h-4 text-slate-500" />
        ) : allRequired ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-600" />
        )}
        <p
          className={cn(
            "text-[13.5px] font-bold",
            noDataYet ? "text-slate-700" : allRequired ? "text-emerald-900" : "text-amber-900"
          )}
        >
          입주민 준비 서류
        </p>
        {!noDataYet && (
          <span className="ml-auto text-[11px] tabular-nums text-foreground/70">
            {checkedRequiredCount}/{totalRequiredCount} 필수
          </span>
        )}
      </div>

      {noDataYet ? (
        <p className="text-[12px] text-slate-700">
          입주민이 아직 서류 체크를 하지 않았습니다. 카톡·문자로 체크리스트 작성 안내를 보내주세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {STANDARD_DOCS.map((doc) => {
            const isChecked = checked.has(doc.id);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-2 text-[12.5px]"
              >
                {isChecked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    isChecked ? "text-foreground" : "text-muted-foreground",
                    !doc.required && "italic"
                  )}
                >
                  {doc.label}
                </span>
                {!doc.required && (
                  <span className="text-[10px] text-muted-foreground/60">선택</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lastCheckAt && (
        <p className="text-[10.5px] text-muted-foreground mt-2.5 pt-2.5 border-t border-current/10">
          마지막 업데이트: {new Date(lastCheckAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}
    </section>
  );
}
