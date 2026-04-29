import { NavLink } from "react-router-dom";
import { Inbox, Bell, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/inbox", label: "인박스", icon: Inbox },
  { to: "/notifications", label: "알림", icon: Bell },
  { to: "/tools/dsr", label: "DSR", icon: Calculator },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border safe-bottom z-30">
      <ul className="grid grid-cols-3">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
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
