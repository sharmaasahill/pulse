"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface ActivityItem {
  id: string;
  message: string;
  type: string;
  createdAt: string;
  actorId: string;
  actor?: { name?: string; email: string; username?: string };
}

const TYPE_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  move: "Moved",
};

const TYPE_TONE: Record<string, { fg: string; bg: string }> = {
  create: { fg: "var(--success)", bg: "var(--success-tint)" },
  update: { fg: "var(--accent-strong)", bg: "var(--accent-tint)" },
  delete: { fg: "var(--danger)", bg: "var(--danger-tint)" },
  move: { fg: "var(--info)", bg: "var(--info-tint)" },
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Notifications({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get(`/activities/${projectId}`)
      .then((r) => { if (alive) setItems(r.data); })
      .catch(() => { /* non-critical panel */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  // Any ticket change writes an activity row, so refresh the feed when one lands.
  useEffect(() => {
    const socket = getSocket();
    const onChange = () => {
      api.get(`/activities/${projectId}`).then((r) => setItems(r.data)).catch(() => {});
    };
    socket.on("ticket:updated", onChange);
    return () => { socket.off("ticket:updated", onChange); };
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span className="skeleton" style={{ width: 58, height: 18, borderRadius: 99, flexShrink: 0 }} />
            <span className="skeleton skeleton-text" style={{ flex: 1, maxWidth: 300 - i * 40 }} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--ink-tertiary)", margin: 0, lineHeight: 1.6 }}>
        No activity yet. Creating or moving a task will show up here.
      </p>
    );
  }

  return (
    <ol style={{ listStyle: "none", maxHeight: 292, overflowY: "auto", margin: 0, padding: 0 }}>
      {items.map((a, i) => {
        const tone = TYPE_TONE[a.type] ?? { fg: "var(--ink-tertiary)", bg: "var(--surface-sunken)" };
        const who = a.actor?.name || a.actor?.username || a.actor?.email?.split("@")[0] || "Someone";
        return (
          <li
            key={a.id}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "11px 0",
              borderBottom: i === items.length - 1 ? "none" : "1px solid var(--line-faint)",
            }}
          >
            <span
              className="badge"
              style={{ color: tone.fg, background: tone.bg, fontSize: 10, flexShrink: 0, minWidth: 58, justifyContent: "center" }}
            >
              {TYPE_LABEL[a.type] ?? "Activity"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, color: "var(--ink)", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
                {a.message}
              </p>
              <p style={{ fontSize: 11.5, color: "var(--ink-tertiary)", margin: "3px 0 0" }}>
                {who} · {relative(a.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
