import { useState, useEffect } from "react";
import { Lock, Pencil, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/shell/auth/AuthContext";
import { readPersonalNote, writePersonalNote } from "@/shell/storage/userPrefs";
import { toast } from "sonner";

type Props = {
  consultationId: string;
};

/**
 * 본인만 보는 개인 메모 — localStorage 기반.
 * 백엔드 memo 필드(공유)와 별개. 다른 상담사·팀장에게도 안 보임.
 */
export function PersonalNoteCard({ consultationId }: Props) {
  const { auth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const stored = readPersonalNote(auth?.loginId, consultationId);
    setText(stored);
    setDraft(stored);
  }, [auth?.loginId, consultationId]);

  function startEdit() {
    setDraft(text);
    setEditing(true);
  }

  function cancel() {
    setDraft(text);
    setEditing(false);
  }

  function save() {
    writePersonalNote(auth?.loginId, consultationId, draft);
    setText(draft.trim());
    setEditing(false);
    toast.success(draft.trim() ? "개인 메모 저장됨" : "개인 메모 삭제됨");
  }

  if (!editing && !text) {
    // 빈 상태 — 추가 버튼만 작게
    return (
      <button
        onClick={startEdit}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-[12px] active:bg-accent"
      >
        <Lock className="w-3.5 h-3.5" />
        + 개인 메모 추가 (본인만 보임)
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-violet-600" />
          <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">
            개인 메모 (본인만)
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="p-1 rounded-md text-violet-600 hover:bg-violet-100"
            aria-label="수정"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="이 고객만의 메모... (예: 부인 이름 김미영 / 까칠 / 오후만 통화 OK)"
            className="min-h-[90px] text-[13px] bg-card"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={cancel} variant="outline" size="sm" className="h-9">
              <X className="w-3.5 h-3.5 mr-1" />
              취소
            </Button>
            <Button onClick={save} size="sm" className="h-9 bg-violet-600 hover:bg-violet-700">
              <Check className="w-3.5 h-3.5 mr-1" />
              저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-violet-900 whitespace-pre-wrap leading-relaxed">{text}</p>
      )}
    </section>
  );
}
