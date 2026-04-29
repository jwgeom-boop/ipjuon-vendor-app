import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/shell/auth/AuthContext";
import { RequireAuth } from "@/shell/auth/RequireAuth";
import { MobileShell } from "@/shell/layout/MobileShell";
import { FullScreenShell } from "@/shell/layout/FullScreenShell";
import LoginPage from "@/modules/bank/login/LoginPage";
import InboxList from "@/modules/bank/inbox/InboxList";
import InboxDetail from "@/modules/bank/inbox/InboxDetail";
import NotificationsPage from "@/modules/bank/notifications/NotificationsPage";
import MessagesPage from "@/modules/bank/messages/MessagesPage";
import PreScreeningPage from "@/modules/bank/pre-screening/PreScreeningPage";
import SigningSchedulePage from "@/modules/bank/signing/SigningSchedulePage";
import SettlementPage from "@/modules/bank/settlement/SettlementPage";
import DsrSimulatorPage from "@/modules/bank/tools/DsrSimulatorPage";
import ProfilePage from "@/modules/bank/profile/ProfilePage";
import ChangePasswordPage from "@/modules/bank/profile/ChangePasswordPage";
import PerformancePage from "@/modules/bank/performance/PerformancePage";
import ComplexProfilesPage from "@/modules/bank/complex/ComplexProfilesPage";
import RepaymentSharePage from "@/modules/bank/share/RepaymentSharePage";
import LegalAgentSharePage from "@/modules/bank/share/LegalAgentSharePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth><MobileShell /></RequireAuth>}>
              <Route path="/" element={<Navigate to="/inbox" replace />} />
              <Route path="/inbox" element={<InboxList />} />
              <Route path="/inbox/:id" element={<InboxDetail />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/tools/dsr" element={<DsrSimulatorPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/password" element={<ChangePasswordPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/complex-profiles" element={<ComplexProfilesPage />} />
            </Route>

            <Route element={<RequireAuth><FullScreenShell /></RequireAuth>}>
              <Route path="/inbox/:id/messages" element={<MessagesPage />} />
              <Route path="/inbox/:id/pre-screening" element={<PreScreeningPage />} />
              <Route path="/inbox/:id/signing" element={<SigningSchedulePage />} />
              <Route path="/inbox/:id/settlement" element={<SettlementPage />} />
              <Route path="/inbox/:id/repayment-share" element={<RepaymentSharePage />} />
              <Route path="/inbox/:id/legal-share" element={<LegalAgentSharePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
