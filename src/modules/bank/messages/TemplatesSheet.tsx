import { useState } from "react";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/shell/auth/AuthContext";
import {
  readTemplates,
  writeTemplates,
  generateTemplateId,
  type MessageTemplate,
} from "@/shell/storage/userPrefs";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick?: (body: string) => void; // 템플릿 선택 시 메시지에 삽입
};

export function TemplatesSheet({ open, onClose, onPick }: Props) {
  const { auth } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => readTemplates(auth?.loginId));
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  if (!open) return null;

  function persist(next: MessageTemplate[]) {
    setTemplates(next);
    writeTemplates(auth?.loginId, next);
  }

  function startEdit(t: MessageTemplate) {
    setEditing(t);
    setEditTitle(t.title);
    setEditBody(t.body);
  }

  function startNew() {
    setEditing({ id: generateTemplateId(), title: "", body: "" });
    setEditTitle("");
    setEditBody("");
  }

  function saveEdit() {
    if (!editing) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error("제목·내용을 모두 입력해주세요.");
      return;
    }
    const updated: MessageTemplate = { id: editing.id, title: editTitle.trim(), body: editBody.trim() };
    const exists = templates.some((t) => t.id === editing.id);
    persist(exists ? templates.map((t) => (t.id === editing.id ? updated : t)) : [...templates, updated]);
    setEditing(null);
    toast.success("저장되었습니다.");
  }

  function handleDelete(id: string) {
    if (!confirm("이 템플릿을 삭제할까요?")) return;
    persist(templates.filter((t) => t.id !== id));
  }

  function handleResetDefaults() {
    if (!confirm("기본 템플릿으로 초기화할까요? 직접 만든 템플릿은 사라집니다.")) return;
    try {
      localStorage.removeItem(`vendor.${auth?.loginId || "anon"}.message-templates`);
      setTemplates(readTemplates(auth?.loginId));
      toast.success("초기화되었습니다.");
    } catch {
      toast.error("초기화 실패");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-card rounded-t-2xl px-5 pt-5 pb-8 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-foreground">메시지 템플릿</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!editing ? (
          <>
            <p className="text-[11.5px] text-muted-foreground mb-3">
              자주 쓰는 문구를 저장해두면 메시지 작성이 빨라집니다. 본인 PC/폰에만 저장됩니다.
            </p>

            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-bold text-foreground">{t.title}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent"
                        aria-label="수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50"
                        aria-label="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground line-clamp-2 whitespace-pre-wrap mb-2">
                    {t.body}
                  </p>
                  {onPick && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[12px]"
                      onClick={() => {
                        onPick(t.body);
                        onClose();
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      삽입
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={startNew} variant="default" className="h-11">
                <Plus className="w-4 h-4 mr-1" />
                새 템플릿
              </Button>
              <Button onClick={handleResetDefaults} variant="outline" className="h-11">
                기본값 복원
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">제목</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="예: 가심사 통과"
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">내용</label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="자주 쓰는 문구 입력..."
                className="min-h-[150px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} className="h-11">
                취소
              </Button>
              <Button onClick={saveEdit} className="h-11">
                저장
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
