"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { getSocket, joinProject } from "@/lib/socket";
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

    // Join personal room so we receive notification:new for this user
    const socket = getSocket();
    const joinPersonal = () => {
      if (user?.id) socket.emit("join", { userId: user.id });
    };
    if (socket.connected) joinPersonal(); else socket.on("connect", joinPersonal);

    // Also join all project rooms so project-wide events still arrive
    api.get("/projects").then(res => {
      res.data.forEach((p: any) => joinProject(p.id, user?.id));
    }).catch(() => {});

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
        style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: open ? "rgba(255,255,255,0.1)" : "transparent",
          border: "none", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: open ? "#fff" : "rgba(255,255,255,0.6)",
          transition: "all 0.2s", position: "relative"
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, padding: "0 4px",
            borderRadius: 8, background: "#f97316", border: "2px solid var(--bg-primary)",
            fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div ref={dropdownRef} style={{
          position: "fixed", top: "calc(var(--navbar-height) + 12px)", right: 16,
          width: 340, maxWidth: "calc(100vw - 32px)",
          background: "rgba(20,20,20,0.97)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 999999, overflow: "hidden"
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Notifications</span>
            {notifications.length > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                <CheckCheck size={13} /> All read
              </span>
            )}
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                You&apos;re all caught up!
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => handleClick(n)} style={{
                  padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                  display: "flex", gap: 12, alignItems: "flex-start", transition: "background 0.2s", cursor: "pointer",
                  background: n.read ? "transparent" : "rgba(249,115,22,0.06)"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(249,115,22,0.06)"}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                    background: n.read ? "transparent" : "#f97316"
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{n.title}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.4, marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
