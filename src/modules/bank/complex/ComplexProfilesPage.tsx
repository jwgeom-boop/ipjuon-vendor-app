import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, ChevronDown, ChevronUp, Info } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { formatWon } from "../format";
import { cn } from "@/lib/utils";

type ComplexTemplate = {
  id: string;
  complex_name: string;
  address?: string;
  builder?: string;
  total_household?: number;
  move_in_start?: string;
  move_in_end?: string;
  receive_start_date?: string;
  receive_end_date?: string;
  apt_fee_count?: number;
  contract_amount_fixed?: number;
  loan_limit_fixed?: number;
  notes?: string;
};

type AptFee = {
  apt_type: string;
  mgmt_fee_amount?: number;
  contract_amount?: number;
};

type SettlementItem = {
  label: string;
  amount?: number;
};

type ComplexDetail = ComplexTemplate & {
  apt_fees?: AptFee[];
  settlement_items?: SettlementItem[];
};

export default function ComplexProfilesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<ComplexTemplate[]>({
    queryKey: ["complex-templates"],
    queryFn: () => api.get<ComplexTemplate[]>("/v4/complex-templates"),
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.complex_name?.toLowerCase().includes(s) ||
        r.address?.toLowerCase().includes(s) ||
        r.builder?.toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <>
      <PageHeader title="단지 협약 정보" />
      <div className="px-4 py-3 sticky top-12 z-10 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="단지명·주소·시행사 검색"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 pb-8">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {data && data.length > 0 ? "검색 결과 없음" : "등록된 단지가 없습니다."}
            </p>
          </div>
        )}
        {filtered.map((t) => (
          <ComplexCard key={t.id} template={t} />
        ))}

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground px-1 leading-relaxed pt-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          편집은 PC 관리자 사이트에서 진행해주세요.
        </p>
      </div>
    </>
  );
}

function ComplexCard({ template }: { template: ComplexTemplate }) {
  const [open, setOpen] = useState(false);

  const { data: detail, isLoading } = useQuery<ComplexDetail>({
    queryKey: ["complex-template", template.id],
    queryFn: () => api.get<ComplexDetail>(`/v4/complex-templates/${template.id}`),
    enabled: open,
  });

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 active:bg-accent text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{template.complex_name}</p>
          {template.address && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{template.address}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {template.builder && (
              <span className="text-muted-foreground">{template.builder}</span>
            )}
            {template.total_household && (
              <span className="text-muted-foreground tabular-nums">{template.total_household}세대</span>
            )}
            {template.apt_fee_count != null && template.apt_fee_count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                평형 {template.apt_fee_count}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
          {isLoading && <p className="text-[12px] text-muted-foreground py-2">불러오는 중...</p>}
          {detail && (
            <>
              {/* 단지 기본 */}
              <div className="space-y-1 text-[12.5px]">
                {detail.move_in_start && (
                  <Row label="입주 시작" value={detail.move_in_start} />
                )}
                {detail.move_in_end && (
                  <Row label="입주 종료" value={detail.move_in_end} />
                )}
                {detail.receive_start_date && (
                  <Row label="잔금 시작" value={detail.receive_start_date} />
                )}
                {detail.receive_end_date && (
                  <Row label="잔금 종료" value={detail.receive_end_date} />
                )}
                {detail.contract_amount_fixed != null && detail.contract_amount_fixed > 0 && (
                  <Row label="계약금" value={formatWon(detail.contract_amount_fixed)} />
                )}
                {detail.loan_limit_fixed != null && detail.loan_limit_fixed > 0 && (
                  <Row label="대출 한도" value={formatWon(detail.loan_limit_fixed)} />
                )}
              </div>

              {/* 평형별 정보 */}
              {detail.apt_fees && detail.apt_fees.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase">
                    평형별 정보
                  </p>
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">평형</th>
                          <th className="text-right px-2.5 py-1.5 font-medium text-muted-foreground">계약금</th>
                          <th className="text-right px-2.5 py-1.5 font-medium text-muted-foreground">관리비</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.apt_fees.map((f) => (
                          <tr key={f.apt_type} className="border-t border-border">
                            <td className="px-2.5 py-1.5 font-medium">{f.apt_type}</td>
                            <td className="px-2.5 py-1.5 text-right tabular-nums">
                              {f.contract_amount ? formatWon(f.contract_amount) : "-"}
                            </td>
                            <td className="px-2.5 py-1.5 text-right tabular-nums">
                              {f.mgmt_fee_amount ? formatWon(f.mgmt_fee_amount) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 정산 항목 */}
              {detail.settlement_items && detail.settlement_items.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase">
                    정산 항목
                  </p>
                  <div className="space-y-1">
                    {detail.settlement_items.map((s, i) => (
                      <Row
                        key={i}
                        label={s.label}
                        value={s.amount ? formatWon(s.amount) : "-"}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 메모 */}
              {detail.notes && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                  <p className="text-[11px] font-medium text-amber-700 mb-1">📝 메모</p>
                  <p className="text-[12px] text-amber-900 whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex justify-between items-baseline text-[12.5px]")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </div>
  );
}
