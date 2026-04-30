import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/shell/auth/AuthContext";
import { isPinned, togglePinned } from "@/shell/storage/userPrefs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  consultationId: string;
  size?: "sm" | "md";
};

/**
 * 즐겨찾기/핀 토글 버튼.
 * 핀된 상담은 인박스 최상단에 표시 (InboxList에서 정렬 처리).
 */
export function PinButton({ consultationId, size = "md" }: Props) {
  const { auth } = useAuth();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(isPinned(auth?.loginId, consultationId));
  }, [auth?.loginId, consultationId]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const next = togglePinned(auth?.loginId, consultationId);
    setPinned(next);
    toast.success(next ? "⭐ 핀 고정됨 — 인박스 상단에 표시" : "핀 해제됨");
  }

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "rounded-md flex items-center justify-center active:scale-95 transition-transform",
        size === "sm" ? "w-7 h-7" : "p-2"
      )}
      aria-label={pinned ? "핀 해제" : "핀 고정"}
    >
      <Star
        className={cn(
          iconSize,
          pinned ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
        )}
      />
    </button>
  );
}

/** 인박스 행에 표시되는 작은 인디케이터 (이미 핀 됐을 때) */
export function PinIndicator({ consultationId }: { consultationId: string }) {
  const { auth } = useAuth();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(isPinned(auth?.loginId, consultationId));
  }, [auth?.loginId, consultationId]);

  if (!pinned) return null;
  return <Star className="w-3 h-3 fill-amber-400 text-amber-500 flex-shrink-0" />;
}
