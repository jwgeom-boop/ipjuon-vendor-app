import { toast } from "sonner";

/**
 * Web Share API → 카카오톡·SMS·메일 등 시스템 공유 시트 호출.
 * 미지원 브라우저는 클립보드 복사로 폴백.
 */
export async function shareOrCopy({
  title,
  text,
  url,
}: {
  title?: string;
  text: string;
  url?: string;
}): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      // 사용자가 취소한 경우는 조용히 통과
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  // 폴백: 클립보드 복사
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast.success("내용이 복사되었습니다.");
      return;
    }
  } catch {
    /* ignore */
  }
  toast.error("공유 기능을 사용할 수 없습니다.");
}

export function copyText(text: string): void {
  if (!navigator.clipboard) {
    toast.error("클립보드 접근 불가");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("복사되었습니다."))
    .catch(() => toast.error("복사 실패"));
}
