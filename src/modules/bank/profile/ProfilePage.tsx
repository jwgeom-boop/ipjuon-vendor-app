import { useNavigate } from "react-router-dom";
import { KeyRound, ChevronRight, Building2, BarChart3 } from "lucide-react";
import { PageHeader } from "@/shell/layout/PageHeader";
import { useAuth } from "@/shell/auth/AuthContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();

  return (
    <>
      <PageHeader title="프로필" />
      <div className="px-4 py-4 space-y-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              {(auth?.displayName || auth?.loginId || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {auth?.displayName || auth?.loginId}
              </p>
              <p className="text-xs text-muted-foreground">
                {auth?.bankRole === "bank_manager" ? "팀장" : "상담사"}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-[13px]">
            <Row label="아이디" value={auth?.loginId || "-"} />
            <Row label="소속 은행" value={auth?.bankName || "-"} />
            <Row label="역할" value={auth?.bankRole === "bank_manager" ? "팀장" : "상담사"} />
            {auth?.mustChangePassword && (
              <p className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px]">
                ⚠️ 임시 비밀번호로 로그인됨 — 변경 권장
              </p>
            )}
          </div>
        </section>

        <nav className="rounded-xl border border-border bg-card overflow-hidden">
          <MenuItem icon={KeyRound} label="비밀번호 변경" onClick={() => navigate("/profile/password")} />
          <Divider />
          <MenuItem icon={BarChart3} label="이번달 실적" onClick={() => navigate("/performance")} />
          <Divider />
          <MenuItem icon={Building2} label="단지 협약 정보" onClick={() => navigate("/complex-profiles")} />
        </nav>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof KeyRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-accent text-left"
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-border mx-4" />;
}
