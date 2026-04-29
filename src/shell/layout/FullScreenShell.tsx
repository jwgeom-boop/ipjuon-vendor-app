import { Outlet } from "react-router-dom";

/**
 * For pages that need full-screen control (e.g. chat with sticky input).
 * Same width constraint as MobileShell, but no BottomNav.
 */
export function FullScreenShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}
