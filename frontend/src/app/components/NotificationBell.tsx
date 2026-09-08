"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { getSocket } from "@/lib/socket";
import { Bell, CheckCheck } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(() => {
    api.get("/notifications")
      .then(res => {
        setNotifications(res.data);
        setUnread(res.data.filter((n: Notification) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch + subscribe to real-time notifications
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnread(0);
      return;
    }

    fetchNotifications();

    // Notifications are delivered to the user's PERSONAL room (`user:<id>`) via
    // emitToUser, so joining that one room is sufficient. This used to also
    // fetch GET /projects purely to join every project room — an entire extra
    // HTTP round-trip of heavy data that delivered nothing the bell needed.
    const socket = getSocket();
    const joinPersonal = () => {
      if (user?.id) socket.emit("join", { userId: user.id });
    };
    if (socket.connected) joinPersonal(); else socket.on("connect", joinPersonal);

    const handleNew = (n: Notification) => {
      setNotifications(prev => [n, ...prev].slice(0, 30));
      setUnread(prev => prev + 1);
    };

    socket.on("notification:new", handleNew);

    return () => {
      socket.off("connect", joinPersonal);
      socket.off("notification:new", handleNew);
    };
  }, [token, user?.id, fetchNotifications]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    // Mark everything read when opening
    if (next && unread > 0) {
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      api.patch("/notifications/read-all").catch(() => {});
    }
  }

  function handleClick(n: Notification) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <button
        className="btn-icon"
        onClick={toggleOpen}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        style={{
          position: "relative",
          background: open ? "var(--surface-active)" : "transparent",
          color: open ? "var(--ink)" : "var(--ink-tertiary)",
        }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span
            className="num"
            style={{
              position: "absolute", top: 1, right: 1, minWidth: 16, height: 16, padding: "0 4px",
              borderRadius: 99, background: "var(--accent)", border: "2px solid var(--canvas)",
              fontSize: 9, fontWeight: 700, color: "#fff",
              display: "grid", placeItems: "center", lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "fixed", top: "calc(var(--navbar-height) + 10px)", right: 16,
            width: 348, maxWidth: "calc(100vw - 32px)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-xl)",
            zIndex: 999999, overflow: "hidden",
            animation: "scale-in var(--t-base) var(--ease-out-quart)",
            transformOrigin: "top right",
          }}
        >
          <div
            style={{
              padding: "13px 16px", borderBottom: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--surface-sunken)",
            }}
          >
            <span className="eyebrow" style={{ fontSize: 10.5 }}>Notifications</span>
            {notifications.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink-tertiary)" }}>
                <CheckCheck size={12} /> Marked read
              </span>
            )}
          </div>

          <div style={{ maxHeight: 396, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <p style={{ padding: "38px 22px", textAlign: "center", color: "var(--ink-tertiary)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Nothing yet. Updates to your boards will appear here.
              </p>
            ) : (
              notifications.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    padding: "12px 16px",
                    borderBottom: i === notifications.length - 1 ? "none" : "1px solid var(--line-faint)",
                    borderLeft: n.read ? "2px solid transparent" : "2px solid var(--accent)",
                    borderTop: "none", borderRight: "none",
                    display: "flex", gap: 11, alignItems: "flex-start",
                    background: n.read ? "transparent" : "var(--accent-tint)",
                    transition: "background var(--t-fast) linear",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : "var(--accent-tint)"; }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 620, color: "var(--ink)" }}>{n.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-secondary)", lineHeight: 1.45, marginTop: 2, wordBreak: "break-word" }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
