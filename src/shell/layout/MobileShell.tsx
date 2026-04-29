import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function MobileShell() {
  return (
    <div className="app-shell pb-16 safe-bottom">
      <Outlet />
      <BottomNav />
    </div>
  );
}
