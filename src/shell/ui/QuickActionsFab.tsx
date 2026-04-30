import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, UserPlus, Calculator, Building2, BarChart3, AlertTriangle } from "lucide-react";
import { useAuth } from "@/shell/auth/AuthContext";
import { cn } from "@/lib/utils";

type Props = {
  onNewCustomer: () => void;
};

/**
 * 우하단 floating action button — 자주 쓰는 액션 빠른 진입.
 * 탭하면 펼쳐지면서 4-5개 액션 버튼 노출.
 */
export function QuickActionsFab({ onNewCustomer }: Props) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const isManager = auth?.bankRole === "bank_manager";

  const actions = [
    { icon: UserPlus, label: "신규 고객", onClick: () => { onNewCustomer(); setOpen(false); }, tone: "blue" },
    { icon: Calculator, label: "DSR 계산", onClick: () => { navigate("/tools/dsr"); setOpen(false); }, tone: "purple" },
    { icon: AlertTriangle, label: isManager ? "내가 챙길 것" : "개입 큐", onClick: () => { navigate("/intervention"); setOpen(false); }, tone: "rose" },
    { icon: BarChart3, label: isManager ? "팀 실적" : "이번달 실적", onClick: () => { navigate("/performance"); setOpen(false); }, tone: "emerald" },
    { icon: Building2, label: "단지 정보", onClick: () => { navigate("/complex-profiles"); setOpen(false); }, tone: "amber" },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 right-4 z-40 safe-bottom"
    >
      {/* 액션 메뉴 */}
      {open && (
        <div className="absolute bottom-14 right-0 flex flex-col-reverse items-end gap-2 mb-2">
          {actions.map((a, i) => {
            const tones = {
              blue: "bg-blue-500",
              purple: "bg-purple-500",
              rose: "bg-rose-500",
              emerald: "bg-emerald-500",
              amber: "bg-amber-500",
            }[a.tone];
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className="flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-150"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="px-3 py-1.5 rounded-lg bg-card shadow-md border border-border text-[12.5px] font-medium text-foreground whitespace-nowrap">
                  {a.label}
                </span>
                <span
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg",
                    tones
                  )}
                >
                  <a.icon className="w-5 h-5" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 메인 FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all",
          open
            ? "bg-foreground text-background rotate-45"
            : "bg-primary text-primary-foreground"
        )}
        aria-label={open ? "메뉴 닫기" : "빠른 액션"}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
