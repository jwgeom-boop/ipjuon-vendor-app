import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shell/api/client";

type Props = {
  error: unknown;
  onRetry?: () => void;
  context?: string; // "인박스 조회", "메시지 전송" 등
};

/**
 * 표준화된 에러 화면. API 에러 상태 코드별로 다른 메시지/아이콘 노출.
 */
export function ErrorState({ error, onRetry, context }: Props) {
  const status = error instanceof ApiError ? error.status : -1;
  const message = error instanceof Error ? error.message : "알 수 없는 오류";

  const Icon =
    status === 0 ? WifiOff : status >= 500 ? ServerCrash : AlertCircle;

  const title = (() => {
    if (status === 0) return "네트워크 연결 오류";
    if (status === 403) return "접근 권한 없음";
    if (status === 404) return "데이터 없음";
    if (status >= 500) return "서버 오류";
    return "오류 발생";
  })();

  const helpText = (() => {
    if (status === 0) {
      return "Wi-Fi 또는 데이터 연결을 확인하고, 잠시 후 다시 시도해주세요. 백엔드가 일시적으로 응답하지 않을 수 있습니다.";
    }
    if (status === 403) return "이 정보를 볼 권한이 없습니다. 팀장에게 문의하세요.";
    if (status === 404) return "요청한 데이터를 찾을 수 없습니다.";
    if (status >= 500) return "서버에 일시적 문제가 있습니다. 잠시 후 다시 시도해주세요.";
    return message;
  })();

  return (
    <div className="px-4 py-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-rose-600" />
      </div>
      <p className="text-base font-bold text-foreground">{title}</p>
      {context && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{context}</p>
      )}
      <p className="text-[12.5px] text-muted-foreground mt-2 max-w-xs leading-relaxed">
        {helpText}
      </p>
      {status !== 0 && status !== 403 && (
        <p className="text-[10.5px] text-muted-foreground/70 mt-2 font-mono">
          {message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 h-9">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          다시 시도
        </Button>
      )}
    </div>
  );
}
