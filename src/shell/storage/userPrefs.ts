/**
 * 사용자별 개인 설정 — localStorage 기반.
 * 백엔드 동기화 X (본인 PC/폰에만 저장).
 *
 * 키 prefix: vendor.{loginId}.{namespace}
 * → 다른 사용자가 같은 PC에서 로그인해도 격리됨.
 */

const PREFIX = "vendor";

function key(loginId: string | undefined | null, namespace: string): string {
  return `${PREFIX}.${loginId || "anon"}.${namespace}`;
}

export function readPref<T>(loginId: string | undefined | null, namespace: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(loginId, namespace));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePref<T>(loginId: string | undefined | null, namespace: string, value: T): void {
  try {
    localStorage.setItem(key(loginId, namespace), JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function removePref(loginId: string | undefined | null, namespace: string): void {
  try {
    localStorage.removeItem(key(loginId, namespace));
  } catch {
    /* ignore */
  }
}

// ─── Pinned consultations ───
const NS_PINS = "pinned-consultations";

export function readPinnedIds(loginId?: string | null): Set<string> {
  return new Set(readPref<string[]>(loginId, NS_PINS, []));
}

export function togglePinned(loginId: string | undefined | null, id: string): boolean {
  const set = readPinnedIds(loginId);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  writePref(loginId, NS_PINS, Array.from(set));
  return set.has(id);
}

export function isPinned(loginId: string | undefined | null, id: string): boolean {
  return readPinnedIds(loginId).has(id);
}

// ─── Personal note (per-consultation, private to logged-in user) ───
const NS_PERSONAL_NOTES = "personal-notes";

type PersonalNotesMap = Record<string, { text: string; updatedAt: string }>;

export function readPersonalNote(loginId: string | undefined | null, consultationId: string): string {
  const all = readPref<PersonalNotesMap>(loginId, NS_PERSONAL_NOTES, {});
  return all[consultationId]?.text ?? "";
}

export function writePersonalNote(
  loginId: string | undefined | null,
  consultationId: string,
  text: string
): void {
  const all = readPref<PersonalNotesMap>(loginId, NS_PERSONAL_NOTES, {});
  if (text.trim()) {
    all[consultationId] = { text: text.trim(), updatedAt: new Date().toISOString() };
  } else {
    delete all[consultationId];
  }
  writePref(loginId, NS_PERSONAL_NOTES, all);
}

// ─── Message templates ───
const NS_TEMPLATES = "message-templates";

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
};

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "default-greeting",
    title: "첫 인사",
    body: "안녕하세요, ○○은행 상담사입니다. 잔금대출 관련 상담 진행하겠습니다. 편하신 시간 알려주세요.",
  },
  {
    id: "default-doc-needed",
    title: "서류 안내",
    body: "다음 서류 사진으로 보내주시면 가심사 진행 가능합니다.\n\n1. 신분증\n2. 분양계약서\n3. 최근 2개년 소득자료 (원천징수영수증 등)",
  },
  {
    id: "default-prescreen-ok",
    title: "가심사 통과",
    body: "가심사 통과되었습니다 🎉 자서 일정 잡으려고 합니다. 가능한 날짜·시간 알려주세요.",
  },
  {
    id: "default-prescreen-need-more",
    title: "보완 요청",
    body: "안녕하세요, 추가 서류가 필요합니다. 아래 항목 보완 부탁드립니다.\n\n- (보완할 내용)",
  },
  {
    id: "default-signing-confirm",
    title: "자서일 확정",
    body: "자서 일정 확정되었습니다.\n\n📅 일자: \n🕐 시간: \n📍 장소: \n\n신분증·도장 챙겨오세요.",
  },
  {
    id: "default-execution-prep",
    title: "실행 안내",
    body: "실행일 안내드립니다.\n\n📅 실행일: \n💰 입금 필요 금액: \n\n실행일 12시 이전 입금 부탁드립니다.",
  },
];

export function readTemplates(loginId?: string | null): MessageTemplate[] {
  return readPref<MessageTemplate[]>(loginId, NS_TEMPLATES, DEFAULT_TEMPLATES);
}

export function writeTemplates(loginId: string | undefined | null, templates: MessageTemplate[]): void {
  writePref(loginId, NS_TEMPLATES, templates);
}

export function generateTemplateId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
