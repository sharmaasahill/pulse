"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { getSocket } from "@/lib/socket";
import { Send, Trash2/*, MessageCircle*/ } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; name?: string };
};

export function CommentsSection({ ticketId, projectId }: { ticketId: string; projectId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/comments/${ticketId}`);
      setComments(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  // Real-time comment updates
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: any) => {
      if (payload.type === "comment_created" && payload.ticketId === ticketId) {
        setComments(prev => [...prev, payload.comment]);
      }
      if (payload.type === "comment_deleted" && payload.ticketId === ticketId) {
        setComments(prev => prev.filter(c => c.id !== payload.commentId));
      }
    };
    socket.on("ticket:updated", handler);
    return () => { socket.off("ticket:updated", handler); };
  }, [ticketId]);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post("/comments", { ticketId, content: text.trim() });
      setText("");
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  async function deleteComment(id: string) {
    try {
      await api.delete(`/comments/${id}`);
    } catch { /* ignore */ }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div style={{
      borderTop: "1px solid var(--border-primary)", marginTop: 16,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "12px 0 8px", fontSize: 13, fontWeight: 700,
        color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6,
      }}>
        💬 Comments ({comments.length})
      </div>

      {/* Comment list */}
      <div ref={listRef} style={{
        maxHeight: 200, overflow: "auto", display: "flex", flexDirection: "column", gap: 8,
        paddingBottom: 8,
      }}>
        {loading && <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: 8 }}>Loading...</div>}

        {!loading && comments.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
            No comments yet. Be the first!
          </div>
        )}

        {comments.map(c => (
          <div key={c.id} style={{
            display: "flex", gap: 8, padding: "6px 8px",
            borderRadius: "var(--radius-sm)",
            background: c.author.id === user?.id ? "var(--accent-primary-soft)" : "var(--bg-secondary)",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "var(--radius-full)",
              background: "var(--accent-gradient)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {(c.author.name || c.author.username).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  {c.author.name || c.author.username}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  {formatTime(c.createdAt)}
                </span>
                {c.author.id === user?.id && (
                  <button onClick={() => deleteComment(c.id)}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <Trash2 size={11} color="var(--text-tertiary)" />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", wordBreak: "break-word", marginTop: 2 }}>
                {c.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, paddingTop: 8,
        borderTop: "1px solid var(--border-secondary)",
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Write a comment..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            fontSize: 13, outline: "none",
          }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{
          width: 36, height: 36, borderRadius: "var(--radius-md)",
          border: "none", background: "var(--accent-gradient)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", opacity: sending || !text.trim() ? 0.4 : 1,
          transition: "opacity 0.15s ease",
        }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
