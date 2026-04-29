/**
 * Format KRW amount (stored as raw won) into a compact Korean unit string.
 *
 * 320,000,000  → "3.2억"
 * 3,200,000,000 → "32억"
 * 5,000,000    → "500만원"
 * 5,000        → "5,000원"
 */
/**
 * Days from today until target date. Negative = past, 0 = today, positive = future.
 * Returns null if invalid input.
 */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * D-day label. e.g. D-3, D-day, D+2.
 */
export function ddayLabel(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d == null) return "";
  if (d === 0) return "D-day";
  if (d > 0) return `D-${d}`;
  return `D+${-d}`;
}

/**
 * Korean-style date label (e.g. "5월 12일 (월)" or "오늘", "내일").
 */
export function formatDateKo(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d == null || !iso) return "-";
  if (d === 0) return "오늘";
  if (d === 1) return "내일";
  if (d === -1) return "어제";
  const date = new Date(iso);
  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

/**
 * Mask Korean RRN: 820103-1******.
 */
export function maskRrn(rrn?: string | null): string {
  if (!rrn) return "-";
  const d = rrn.replace(/\D/g, "");
  if (d.length < 7) return rrn;
  return d.substring(0, 6) + "-" + d.substring(6, 7) + "******";
}

export function formatWon(won?: number | null): string {
  if (!won) return "-";
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    if (eok >= 10) return `${Math.round(eok).toLocaleString()}억`;
    const oneDecimal = Math.round(eok * 10) / 10;
    const str = oneDecimal % 1 === 0 ? `${oneDecimal.toFixed(0)}` : `${oneDecimal.toFixed(1)}`;
    return `${str}억`;
  }
  if (won >= 10_000) {
    return `${Math.round(won / 10_000).toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}
