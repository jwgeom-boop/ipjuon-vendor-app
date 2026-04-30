import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER = 60;
const MAX = 100;
const RESISTANCE = 0.5;

/**
 * 모바일 표준 pull-to-refresh.
 * - 페이지 최상단(scrollY === 0)에서 손가락을 아래로 드래그하면 트리거.
 * - 60px 이상 당기면 새로고침 콜백 실행.
 * - 데스크탑에선 트리거되지 않음 (touch 이벤트만 사용).
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pulling, setPulling] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshingRef.current) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      if (window.scrollY > 0) {
        startY.current = null;
        setPulling(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPulling(Math.min(delta * RESISTANCE, MAX));
      } else {
        setPulling(0);
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const wasPull = pulling;
      startY.current = null;

      if (wasPull >= TRIGGER) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPulling(TRIGGER);
        try {
          await onRefresh();
        } finally {
          // 짧게 보여준 뒤 사라짐
          setTimeout(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            setPulling(0);
          }, 250);
        }
      } else {
        setPulling(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pulling]);

  return { pulling, refreshing };
}

/** 화면 상단에 떠있는 새로고침 인디케이터 (Pull-to-refresh 진행 시각화) */
export function PullToRefreshIndicator({
  pulling,
  refreshing,
}: {
  pulling: number;
  refreshing: boolean;
}) {
  if (pulling < 8 && !refreshing) return null;
  const progress = Math.min(pulling / TRIGGER, 1);
  const offset = Math.min(pulling - 30, TRIGGER);
  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none safe-top"
      style={{
        transform: `translate(-50%, ${offset}px)`,
        transition: refreshing ? "transform 0.15s ease-out" : "none",
      }}
    >
      <div className="w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center">
        <RefreshCw
          className={cn("w-4 h-4 text-primary", refreshing && "animate-spin")}
          style={{
            transform: !refreshing ? `rotate(${progress * 270}deg)` : undefined,
            opacity: !refreshing ? 0.3 + progress * 0.7 : 1,
            transition: !refreshing ? "transform 0.05s linear" : "none",
          }}
        />
      </div>
    </div>
  );
}
