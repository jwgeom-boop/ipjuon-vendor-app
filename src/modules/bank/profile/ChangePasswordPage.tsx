import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/auth/change-password`, {
        current_password: current,
        new_password: next,
      }),
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다.");
      navigate("/profile");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "변경 실패";
      toast.error(msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast.error("모든 항목을 입력해주세요.");
      return;
    }
    if (next.length < 6) {
      toast.error("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (next !== confirm) {
      toast.error("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (next === current) {
      toast.error("기존과 다른 비밀번호를 사용해주세요.");
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <PageHeader title="비밀번호 변경" />
      <div className="px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">현재 비밀번호</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">새 비밀번호</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className="h-12"
            />
            <p className="text-[11px] text-muted-foreground">6자 이상 권장</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">새 비밀번호 확인</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="h-12"
            />
            {confirm && next !== confirm && (
              <p className="text-[11px] text-rose-600">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold mt-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "변경 중..." : "변경하기"}
          </Button>
        </form>
      </div>
    </>
  );
}
