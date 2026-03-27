"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { getSocket, joinProject } from "@/lib/socket";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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

  // Fetch notifications
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setHasUnread(false);
      return;
    }

    const fetchNotifications = () => {
      api.get("/activities/notifications")
        .then(res => {
          setNotifications(res.data);
          const recent = res.data.some((n: any) => new Date(n.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000);
          setHasUnread(recent);
        })
        .catch(() => {});
    };

    fetchNotifications();

    // Ensure we join all projects to receive events across workspaces
    api.get("/projects").then(res => {
      res.data.forEach((p: any) => joinProject(p.id));
    }).catch(() => {});

    const socket = getSocket();
    const handleUpdate = () => fetchNotifications();
    socket.on("project:updated", handleUpdate);
    socket.on("ticket:updated", handleUpdate);
    socket.on("comment:created", handleUpdate);

    return () => {
      socket.off("project:updated", handleUpdate);
      socket.off("ticket:updated", handleUpdate);
      socket.off("comment:created", handleUpdate);
    };
  }, [token]);

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <button 
        className="btn-icon"
        onClick={() => { setOpen(!open); setHasUnread(false); }}
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
        {hasUnread && (
          <span style={{
            position: "absolute", top: 8, right: 8, width: 8, height: 8,
            borderRadius: "50%", background: "#f97316", border: "2px solid var(--bg-primary)"
          }} />
        )}
      </button>

      {open && mounted && createPortal(
        <div ref={dropdownRef} style={{
          position: "fixed", top: "calc(var(--navbar-height) + 12px)", right: 16,
          width: 320, maxWidth: "calc(100vw - 32px)",
          background: "rgba(20,20,20,0.95)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 999999, overflow: "hidden"
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Notifications</span>
          </div>

          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                You're all caught up!
              </div>
            ) : (
              notifications.map(n => {
                const initials = n.actor.name ? n.actor.name.split(" ").map((w: any) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
                return (
                  <div key={n.id} style={{
                    padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                    display: "flex", gap: 12, alignItems: "flex-start", transition: "background 0.2s", cursor: "pointer"
                  }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", background: "var(--accent-gradient)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                        <strong style={{ color: "#fff", fontWeight: 700 }}>{n.actor.name || n.actor.email}</strong> {n.message.replace(n.actor.name || n.actor.username, "").trim()}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#f97316", fontWeight: 600 }}>{n.project.name}</span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
