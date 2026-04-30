import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import { TemplatesSheet } from "./TemplatesSheet";
import { api, ApiError } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { useAuth } from "@/shell/auth/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Consultation, B2cMessage } from "../types";

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<Consultation>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<Consultation>(`/consultation/${id}`),
    enabled: !!id,
    refetchInterval: 8000,
  });

  const messages = useMemo<B2cMessage[]>(() => {
    if (!data?.b2c_messages) return [];
    try {
      const parsed = JSON.parse(data.b2c_messages);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [data?.b2c_messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      api.post(`/bank/consultations/${id}/message`, { text: msg, by: auth?.displayName || auth?.loginId }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "전송 실패");
    },
  });

  function handleSend() {
    const t = text.trim();
    if (!t || sendMutation.isPending) return;
    sendMutation.mutate(t);
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <PageHeader title={`${data?.resident_name || "메시지"}`} />

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5 bg-muted/30">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">아직 메시지가 없습니다.</p>
        )}
        {messages.map((m, i) => {
          const fromMe = m.by !== "resident";
          return (
            <div key={i} className={cn("flex", fromMe ? "justify-end" : "justify-start")}>
              <div className="max-w-[78%]">
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-[13.5px] whitespace-pre-wrap break-words",
                    fromMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
                <p className={cn("text-[10px] text-muted-foreground mt-1", fromMe ? "text-right" : "text-left")}>
                  {formatTime(m.at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-card p-2 safe-bottom">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTemplatesOpen(true)}
            disabled={sendMutation.isPending}
            className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground active:bg-accent flex-shrink-0"
            aria-label="템플릿"
            title="자주 쓰는 문구"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지 입력"
            className="h-11 flex-1"
            disabled={sendMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            aria-label="전송"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <TemplatesSheet
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onPick={(body) => setText((curr) => (curr ? `${curr}\n${body}` : body))}
      />
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
