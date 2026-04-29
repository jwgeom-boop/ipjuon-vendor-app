import { NavLink } from "react-router-dom";
import { Inbox, Bell, Calculator, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/shell/auth/AuthContext";

type Tab = { to: string; label: string; icon: typeof Inbox; end?: boolean };

const CONSULTANT_TABS: Tab[] = [
  { to: "/inbox", label: "인박스", icon: Inbox },
  { to: "/notifications", label: "알림", icon: Bell },
  { to: "/tools/dsr", label: "DSR", icon: Calculator },
];

const MANAGER_TABS: Tab[] = [
  { to: "/team", label: "팀 홈", icon: Users, end: true },
  { to: "/inbox", label: "인박스", icon: Inbox },
  { to: "/notifications", label: "알림", icon: Bell },
  { to: "/tools/dsr", label: "DSR", icon: Calculator },
];

export function BottomNav() {
  const { auth } = useAuth();
  const isManager = auth?.bankRole === "bank_manager";
  const tabs = isManager ? MANAGER_TABS : CONSULTANT_TABS;
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border safe-bottom z-30">
      <ul className={cn("grid", `grid-cols-${tabs.length}`)} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.4]")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
