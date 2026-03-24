"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { api, setAuthToken } from "@/lib/api";
import { getSocket, joinProject } from "@/lib/socket";
import {
  LayoutDashboard, ChevronLeft, Star, Hash, Plus, Menu, X,
} from "lucide-react";

type Project = { id: string; name: string; };
type SidebarProps = { onCreateBoard?: () => void; };

export function Sidebar({ onCreateBoard }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [boardsExpanded, setBoardsExpanded] = useState(true);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const loadProjects = useCallback(async () => {
    // Always read the freshest token — avoids reactive state race conditions
    const authToken =
      useAuth.getState().token ??
      (() => {
        try {
          const raw = localStorage.getItem("auth-storage");
          return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
        } catch { return null; }
      })();

    if (!authToken) return;
    try {
      setAuthToken(authToken);
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch { /* ignore sidebar errors silently */ }
  }, []); // stable ref — no reactive deps

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Real-time synchronization
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    joinProject(undefined as any, user.id);

    const handleUpdate = () => {
      loadProjects();
    };

    socket.on("project:updated", handleUpdate);

    return () => {
      socket.off("project:updated", handleUpdate);
    };
  }, [user?.id, loadProjects]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("pulse-starred");
      if (s) setStarredIds(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  function toggleStar(id: string) {
    setStarredIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("pulse-starred", JSON.stringify(next));
      return next;
    });
  }

  const router = useRouter();

  function handleCreateBoard() {
    if (pathname === "/projects") {
      if (onCreateBoard) onCreateBoard();
      else window.dispatchEvent(new CustomEvent("pulse:create-board"));
    } else {
      localStorage.setItem("pulse:create-board-pending", "true");
      router.push("/projects");
    }
    setMobileOpen(false);
  }

  const starred = projects.filter(p => starredIds.includes(p.id));
  const sidebarW = collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)";

  function InnerSidebar({ isCollapsed }: { isCollapsed: boolean }) {
    return (
      <>
        {/* Collapse toggle */}
        <div style={{ padding: isCollapsed ? "12px 0" : "12px 12px", display: "flex", justifyContent: isCollapsed ? "center" : "flex-end" }}>
          <button onClick={() => setCollapsed(!isCollapsed)} className="btn-icon"
            style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", transition: "transform var(--transition-base)", transform: isCollapsed ? "rotate(180deg)" : "none" }}>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: isCollapsed ? "0 8px" : "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarLink href="/projects" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === "/projects"} collapsed={isCollapsed} />
        </nav>

        <div style={{ height: 1, background: "var(--border-primary)", margin: isCollapsed ? "12px 8px" : "12px" }} />

        {/* Starred */}
        {!isCollapsed && starred.length > 0 && (
          <div style={{ padding: "0 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px", marginBottom: 4 }}>Starred</div>
            {starred.map(p => <ProjectLink key={p.id} project={p} pathname={pathname} starred onToggleStar={toggleStar} collapsed={isCollapsed} />)}
          </div>
        )}

        {/* Boards list */}
        <div style={{ padding: isCollapsed ? "0 8px" : "0 12px", flex: 1, overflow: "auto" }}>
          {!isCollapsed && (
            <button onClick={() => setBoardsExpanded(!boardsExpanded)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", marginBottom: 4, color: "var(--text-tertiary)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Boards</span>
              <ChevronLeft size={14} style={{ transform: boardsExpanded ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform var(--transition-fast)" }} />
            </button>
          )}
          {boardsExpanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {projects.map(p => <ProjectLink key={p.id} project={p} pathname={pathname} starred={starredIds.includes(p.id)} onToggleStar={toggleStar} collapsed={isCollapsed} />)}
              {projects.length === 0 && !isCollapsed && (
                <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>No boards yet</div>
              )}
            </div>
          )}
        </div>

        {/* Create Board button */}
        <div style={{ padding: isCollapsed ? "12px 8px 32px" : "12px 12px 32px", borderTop: "1px solid var(--border-primary)" }}>
          <button onClick={handleCreateBoard}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? 0 : 8,
              padding: isCollapsed ? "8px" : "8px 10px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-primary-soft)", color: "var(--accent-primary)",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              transition: "all var(--transition-fast)", fontFamily: "inherit",
            }}
            title={isCollapsed ? "Create Board" : undefined}
          >
            <Plus size={16} />
            {!isCollapsed && "Create Board"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar-desktop" style={{
        width: sidebarW, minWidth: sidebarW, height: "100vh",
        position: "fixed", left: 0, top: 0,
        paddingTop: "var(--navbar-height)",
        background: "var(--bg-secondary)", borderRight: "1px solid var(--border-primary)",
        display: "flex", flexDirection: "column", zIndex: 50,
        transition: "width var(--transition-slow), min-width var(--transition-slow)",
        overflow: "hidden",
      }}>
        <InnerSidebar isCollapsed={collapsed} />
      </aside>

      {/* ── Mobile hamburger button ── */}
      <button className="sidebar-hamburger" onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: "fixed", top: 14, left: 14, zIndex: 200,
          background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
          borderRadius: 10, padding: 7, color: "var(--text-primary)", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
          display: "none", // shown via CSS media query below
        }}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 48,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          }} />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside className="sidebar-mobile" style={{
        position: "fixed", top: 0, left: mobileOpen ? 0 : "-280px", zIndex: 49,
        width: 260, height: "100vh",
        paddingTop: "var(--navbar-height)",
        background: "var(--bg-secondary)", borderRight: "1px solid var(--border-primary)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "left var(--transition-slow)",
      }}>
        <InnerSidebar isCollapsed={false} />
      </aside>
    </>
  );
}

/* ─── Sub-components ─── */

function SidebarLink({ href, icon, label, active, collapsed }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: collapsed ? "10px 0" : "8px 10px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: "var(--radius-md)",
      background: active ? "var(--accent-primary-soft)" : "transparent",
      color: active ? "var(--accent-primary)" : "var(--text-secondary)",
      textDecoration: "none", fontSize: 14,
      fontWeight: active ? 600 : 500,
      transition: "all var(--transition-fast)",
      borderLeft: active ? "3px solid var(--accent-primary)" : "3px solid transparent",
    }}>
      {icon}
      {!collapsed && label}
    </Link>
  );
}

function ProjectLink({ project, pathname, starred, onToggleStar, collapsed }: {
  project: Project; pathname: string; starred: boolean;
  onToggleStar: (id: string) => void; collapsed: boolean;
}) {
  const isActive = pathname === `/projects/${project.id}`;
  const colors = ["#f97316", "#8b5cf6", "#6366f1", "#10b981", "#ec4899", "#06b6d4"];
  const color = colors[project.name.length % colors.length];

  return (
    <Link href={`/projects/${project.id}`} title={collapsed ? project.name : undefined} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: collapsed ? "8px 0" : "6px 10px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: "var(--radius-sm)",
      background: isActive ? "var(--accent-primary-soft)" : "transparent",
      color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
      textDecoration: "none", fontSize: 13,
      fontWeight: isActive ? 600 : 400,
      transition: "all var(--transition-fast)", position: "relative",
    }}>
      {collapsed ? (
        <div style={{ width: 24, height: 24, borderRadius: 4, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
          {project.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <>
          <Hash size={14} style={{ color, flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleStar(project.id); }}
            style={{ display: "flex", padding: 2, background: "none", border: "none", cursor: "pointer", color: starred ? "#f59e0b" : "var(--text-tertiary)", opacity: starred ? 1 : 0, transition: "opacity var(--transition-fast), color var(--transition-fast)" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={e => { if (!starred) e.currentTarget.style.opacity = "0"; }}>
            <Star size={13} fill={starred ? "#f59e0b" : "none"} />
          </button>
        </>
      )}
    </Link>
  );
}
