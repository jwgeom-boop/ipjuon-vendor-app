import { useCallback, useEffect, useState } from "react";
import { api } from "@/shell/api/client";

/**
 * Web Push 구독 상태와 활성화 함수를 제공하는 훅.
 *
 * 현재 백엔드 푸시 엔드포인트(/api/b2c/push-subscriptions)는 B2C(입주민) 전용이라
 * vendor 토큰으로 등록 불가. 클라이언트 측은 모두 준비되어 있으므로,
 * 백엔드에 vendor 전용 엔드포인트 추가되면 `registerToBackend` 만 활성화하면 됨.
 */

export type PushState =
  | "unsupported"     // 브라우저가 푸시 미지원
  | "denied"          // 사용자가 권한 차단
  | "default"         // 아직 권한 요청 안함
  | "granted_local"   // 권한 OK, 로컬 구독만 (백엔드 미연동)
  | "granted_synced"; // 권한 OK + 백엔드 등록 완료

type PublicKeyResponse = { public_key?: string; enabled?: boolean };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushState>("default");
  const [loading, setLoading] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setState("default");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setEndpoint(sub.endpoint);
        setState("granted_local"); // 백엔드 vendor 엔드포인트 추가 시 granted_synced로 전환
      } else {
        setState("default");
      }
    } catch {
      setState("default");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (state === "unsupported" || state === "denied") return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const keyRes = await api.get<PublicKeyResponse>("/b2c/push-subscriptions/public-key").catch(() => null);
        if (!keyRes?.public_key) {
          // 백엔드 VAPID 미준비 — 로컬 권한만 받고 종료
          setState("granted_local");
          return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.public_key),
        });
      }

      setEndpoint(sub.endpoint);
      // TODO: 백엔드에 vendor 전용 엔드포인트 추가되면 여기서 register 호출
      // await api.post("/vendor/push-subscriptions", { endpoint: sub.endpoint, p256dh: ..., auth: ... });
      setState("granted_local");
    } catch {
      // 권한 요청 실패 — 상태 유지
    } finally {
      setLoading(false);
    }
  }, [state]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setEndpoint(null);
      setState("default");
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, endpoint, enable, disable, refresh };
}
