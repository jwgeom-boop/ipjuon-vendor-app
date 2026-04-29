import { useState, useMemo, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Share2, Copy, Phone } from "lucide-react";
import { api } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/shell/auth/AuthContext";
import { formatWon, maskRrn } from "../format";
import { shareOrCopy, copyText } from "./shareUtils";
import type { Consultation } from "../types";

const STORAGE_KEY = "vendor_legal_agent_info";

type LegalAgentInfo = {
  name: string;
  tel: string;
  fax?: string;
};

export default function LegalAgentSharePage() {
  const { id } = useParams<{ id: string }>();
  const { auth } = useAuth();

  const [agent, setAgent] = useState<LegalAgentInfo>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { name: "", tel: "" };
    } catch {
      return { name: "", tel: "" };
    }
  });

  const { data, isLoading } = useQuery<Consultation>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<Consultation>(`/consultation/${id}`),
    enabled: !!id,
  });

  function updateAgent(patch: Partial<LegalAgentInfo>) {
    const next = { ...agent, ...patch };
    setAgent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const text = useMemo(() => {
    if (!data) return "";
    return buildLegalText(data, auth?.bankName ?? "", agent);
  }, [data, auth?.bankName, agent]);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="법무사 송부" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="법무사 송부" />
      <div className="px-4 py-4 space-y-4 pb-8">
        <p className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2.5">
          📱 자서 후 법무사에게 송부할 정보. 한 번 입력한 법무사 연락처는 저장되어 다음 건에 자동 반영됩니다.
        </p>

        {/* 법무사 정보 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">법무사 연락처</p>
          <form
            onSubmit={(e: FormEvent) => e.preventDefault()}
            className="space-y-2.5"
          >
            <div className="space-y-1">
              <Label className="text-xs">법무사명</Label>
              <Input
                value={agent.name}
                onChange={(e) => updateAgent({ name: e.target.value })}
                placeholder="예: ○○법무사사무소"
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">전화</Label>
              <Input
                value={agent.tel}
                onChange={(e) => updateAgent({ tel: e.target.value })}
                placeholder="02-0000-0000"
                type="tel"
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">팩스 (선택)</Label>
              <Input
                value={agent.fax || ""}
                onChange={(e) => updateAgent({ fax: e.target.value })}
                placeholder="02-0000-0000"
                className="h-10"
              />
            </div>
          </form>
        </section>

        {/* 미리보기 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
            송부 내용 미리보기
          </p>
          <pre className="text-[12.5px] text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {text}
          </pre>
        </section>

        {/* 공유 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => shareOrCopy({ title: "법무사 송부 안내", text })}
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

        {agent.tel && (
          <a
            href={`tel:${agent.tel}`}
            className="flex items-center justify-center gap-1.5 h-12 rounded-lg border border-border bg-card text-sm font-medium text-foreground active:bg-accent"
          >
            <Phone className="w-4 h-4" />
            법무사에게 전화
          </a>
        )}
      </div>
    </>
  );
}

function buildLegalText(d: Consultation, bankName: string, agent: LegalAgentInfo): string {
  const lines: string[] = [];
  lines.push(`[자서 완료 - 법무사 송부 요청]`);
  if (agent.name) lines.push(`수신: ${agent.name}`);
  lines.push("");

  lines.push("─ 차주 정보 ─");
  lines.push(`성명: ${d.resident_name}`);
  if (d.resident_no) lines.push(`주민번호: ${maskRrn(d.resident_no)}`);
  if (d.contractor && d.contractor !== d.resident_name) lines.push(`계약자: ${d.contractor}`);
  if (d.resident_phone) lines.push(`연락처: ${d.resident_phone}`);
  if (d.joint_owner_name) {
    lines.push(`공동명의자: ${d.joint_owner_name}${d.joint_owner_tel ? ` (${d.joint_owner_tel})` : ""}`);
    if (d.joint_owner_rrn) lines.push(`           ${maskRrn(d.joint_owner_rrn)}`);
  }
  lines.push("");

  lines.push("─ 부동산 ─");
  lines.push(`${d.complex_name ?? ""} ${d.dong ? `${d.dong}동` : ""} ${d.ho ? `${d.ho}호` : ""}`.trim());
  if (d.apt_type) lines.push(`평형: ${d.apt_type}`);
  if (d.moving_in_date) lines.push(`입주 예정: ${d.moving_in_date}`);
  lines.push("");

  lines.push("─ 대출 ─");
  if (bankName) lines.push(`은행: ${bankName}`);
  if (d.loan_amount) lines.push(`대출금: ${formatWon(d.loan_amount)}`);
  if (d.signing_date) {
    lines.push(`자서일: ${d.signing_date}${d.signing_selected_time ? ` ${d.signing_selected_time}` : ""}`);
  }
  if (d.signing_selected_location_str) lines.push(`자서 장소: ${d.signing_selected_location_str}`);
  if (d.execution_date) lines.push(`실행 예정일: ${d.execution_date}`);
  lines.push("");

  lines.push(`※ 등기 절차 진행 부탁드립니다.`);
  if (bankName) lines.push(`발신: ${bankName}`);

  return lines.join("\n");
}
