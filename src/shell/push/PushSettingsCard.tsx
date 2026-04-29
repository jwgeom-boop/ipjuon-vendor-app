import { Bell, BellOff, AlertCircle } from "lucide-react";
import { usePushSubscription } from "./usePushSubscription";
import { Button } from "@/components/ui/button";

export function PushSettingsCard() {
  const { state, loading, enable, disable } = usePushSubscription();

  if (state === "unsupported") {
    return (
      <section className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-muted-foreground">
            <p className="font-medium text-foreground">푸시 알림 미지원</p>
            <p className="mt-0.5">이 브라우저는 Web Push를 지원하지 않습니다. iOS Safari는 홈화면 추가 후 사용 가능합니다.</p>
          </div>
        </div>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-3">
        <div className="flex items-start gap-2">
          <BellOff className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-rose-900">
            <p className="font-medium">알림 권한이 차단됨</p>
            <p className="mt-0.5">브라우저 설정 → 사이트 권한 → 알림 → 허용으로 변경 후 새로고침해주세요.</p>
          </div>
        </div>
      </section>
    );
  }

  if (state === "granted_local" || state === "granted_synced") {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-[12.5px] font-semibold text-emerald-900">알림 활성화됨</p>
            <p className="text-[10.5px] text-emerald-700 mt-0.5">
              {state === "granted_synced"
                ? "백엔드 연동 완료 — 새 메시지·신청서 즉시 알림"
                : "브라우저 권한 OK · 백엔드 연동 대기 중"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={disable} disabled={loading} className="h-8 text-[11px] text-emerald-700">
          끄기
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
      <div className="flex items-start gap-2.5">
        <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-bold text-blue-900">푸시 알림 받기</p>
          <p className="text-[11.5px] text-blue-800 mt-0.5 leading-relaxed">
            새 메시지·자서일 변경·실행 D-day 등을 즉시 받아보세요.
          </p>
          <Button
            size="sm"
            className="h-9 mt-2.5 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
            onClick={enable}
          >
            {loading ? "요청 중..." : "🔔 알림 켜기"}
          </Button>
        </div>
      </div>
    </section>
  );
}
