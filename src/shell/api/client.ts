const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://banking-coroner-grader.ngrok-free.dev/api";

const STORAGE_KEY = "vendor_auth";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: buildHeaders(init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  } catch (err) {
    // 네트워크 오류 (백엔드 다운, ngrok 끊김 등)
    throw new ApiError(0, "네트워크 연결을 확인해주세요.", err);
  }
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    // 401 → 토큰 만료 → 자동 로그아웃
    if (res.status === 401 && !path.includes("/auth/")) {
      try {
        localStorage.removeItem("vendor_auth");
        // 페이지 새로고침으로 로그인 화면 진입
        window.location.href = "/login";
      } catch {
        /* ignore */
      }
    }
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed && (parsed as { message?: string }).message) ||
      defaultStatusMessage(res.status);
    throw new ApiError(res.status, String(message), parsed);
  }
  return parsed as T;
}

function defaultStatusMessage(status: number): string {
  if (status === 401) return "로그인이 만료되었습니다.";
  if (status === 403) return "권한이 없습니다.";
  if (status === 404) return "데이터를 찾을 수 없습니다.";
  if (status === 409) return "이미 처리된 요청입니다.";
  if (status >= 500) return "서버 오류 — 잠시 후 다시 시도해주세요.";
  return `요청 실패 (${status})`;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

export const API_BASE = API_BASE_URL;
