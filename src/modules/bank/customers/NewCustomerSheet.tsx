import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, ApiError } from "@/shell/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewCustomerSheet({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [complex, setComplex] = useState("");
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [aptType, setAptType] = useState("");
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [memo, setMemo] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(`/bank/consultations`, {
        resident_name: name.trim(),
        resident_phone: phone.trim(),
        complex_name: complex.trim() || undefined,
        dong: dong.trim() || undefined,
        ho: ho.trim() || undefined,
        apt_type: aptType.trim() || undefined,
        loan_amount: loanAmount > 0 ? loanAmount : undefined,
        memo: memo.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("신규 고객이 등록되었습니다.");
      qc.invalidateQueries({ queryKey: ["bank-consultations"] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "등록 실패"),
  });

  function reset() {
    setName(""); setPhone(""); setComplex(""); setDong(""); setHo("");
    setAptType(""); setLoanAmount(0); setMemo("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("이름과 전화번호는 필수입니다.");
      return;
    }
    createMutation.mutate();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-card rounded-t-2xl px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">신규 고객 등록</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">이름 <span className="text-rose-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">전화번호 <span className="text-rose-500">*</span></Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              type="tel"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">단지</Label>
            <Input value={complex} onChange={(e) => setComplex(e.target.value)} placeholder="래미안 강남" className="h-11" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm">동</Label>
              <Input value={dong} onChange={(e) => setDong(e.target.value)} placeholder="101" className="h-11 tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">호</Label>
              <Input value={ho} onChange={(e) => setHo(e.target.value)} placeholder="1503" className="h-11 tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">평형</Label>
              <Input value={aptType} onChange={(e) => setAptType(e.target.value)} placeholder="84A" className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">희망 대출금액 (원)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={loanAmount > 0 ? loanAmount.toLocaleString("ko-KR") : ""}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "");
                setLoanAmount(cleaned ? Number(cleaned) : 0);
              }}
              placeholder="320,000,000"
              className="h-11 text-right tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">메모</Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 신규 접수, 상담 예약 필요"
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold mt-2"
            disabled={createMutation.isPending || !name.trim() || !phone.trim()}
          >
            {createMutation.isPending ? "등록 중..." : "등록하기"}
          </Button>
        </form>
      </div>
    </div>
  );
}
