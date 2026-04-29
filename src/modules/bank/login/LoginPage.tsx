import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/shell/auth/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/inbox";
    navigate(from, { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    const result = await login(username.trim(), password);
    if (!result.success) {
      toast.error(result.reason || "로그인에 실패했습니다.");
      return;
    }
    if (result.mustChangePassword) {
      toast.warning("비밀번호 변경이 필요합니다.");
    } else {
      toast.success("로그인되었습니다.");
    }
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/inbox";
    navigate(from, { replace: true });
  }

  return (
    <div className="app-shell flex flex-col safe-top safe-bottom">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <div className="mb-10">
          <p className="text-2xl">🏦</p>
          <h1 className="text-2xl font-bold text-foreground mt-3">입주ON 업체</h1>
          <p className="text-sm text-muted-foreground mt-1">협약은행 상담 관리</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium">아이디</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="관리자가 발급한 아이디"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              className="h-12"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="h-12"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          비밀번호 분실 시 관리자(입주ON 본사)에게 초기화 요청해주세요.
        </p>
      </div>
    </div>
  );
}
