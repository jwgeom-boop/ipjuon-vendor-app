import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, User, KeyRound, BarChart3, Building2, LogOut, ChevronRight, Users, Inbox } from "lucide-react";
import { useAuth } from "@/shell/auth/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!open) return null;

  function go(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-card rounded-t-2xl px-5 pt-5 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">메뉴</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 사용자 정보 */}
        <section className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
              {(auth?.displayName || auth?.loginId || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground truncate">
                {auth?.displayName || auth?.loginId}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {auth?.bankName ? `${auth.bankName} · ` : ""}
                {auth?.bankRole === "bank_manager" ? "팀장" : "상담사"}
              </p>
            </div>
          </div>
        </section>

        {/* 메뉴 항목 */}
        <nav className="rounded-xl border border-border bg-card overflow-hidden mb-4">
          {auth?.bankRole === "bank_manager" && (
            <>
              <MenuItem icon={Users} label="팀 홈" onClick={() => go("/team")} />
              <Divider />
              <MenuItem icon={Inbox} label="전체 상담 (팀)" onClick={() => go("/inbox")} />
              <Divider />
            </>
          )}
          <MenuItem icon={User} label="프로필" onClick={() => go("/profile")} />
          <Divider />
          <MenuItem icon={KeyRound} label="비밀번호 변경" onClick={() => go("/profile/password")} />
          <Divider />
          <MenuItem
            icon={BarChart3}
            label={auth?.bankRole === "bank_manager" ? "팀 실적" : "이번달 실적"}
            onClick={() => go("/performance")}
          />
          <Divider />
          <MenuItem icon={Building2} label="단지 협약 정보" onClick={() => go("/complex-profiles")} />
        </nav>

        {/* 로그아웃 */}
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
            <p className="text-[12.5px] text-rose-900 text-center">정말 로그아웃 하시겠습니까?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="h-10 rounded-lg bg-card border border-border text-sm text-foreground"
              >
                취소
              </button>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="h-10 rounded-lg bg-rose-600 text-white text-sm font-semibold"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof User;
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
