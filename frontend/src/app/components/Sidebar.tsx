"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { useProjects } from "@/store/useProjects";
import { getSocket, joinProject } from "@/lib/socket";
import { LayoutDashboard, ChevronLeft, Star, Hash, Plus } from "lucide-react";

type SidebarProps = { onCreateBoard?: () => void };

const DOT_COLORS = ["#ea580c", "#7c3aed", "#4338ca", "#047857", "#be123c", "#0e7490"];

export function Sidebar({ onCreateBoard }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Reads from the shared cache — the dashboard and this sidebar used to issue
  // two separate GET /projects calls for the same data.
  const projects = useProjects((s) => s.projects);
  const initialLoading = useProjects((s) => s.initialLoading);
  const load = useProjects((s) => s.load);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [boardsExpanded, setBoardsExpanded] = useState(true);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onResize() {
      setCollapsed(window.innerWidth < 1024);
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("pulse-starred");
      if (s) setStarredIds(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  // Live refresh. load({force}) collapses concurrent callers onto one request,
  // so the dashboard subscribing to the same event costs nothing extra.
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    joinProject(undefined as never, user.id);
    const onUpdate = () => { load({ force: true }); };
    socket.on("project:updated", onUpdate);
    return () => { socket.off("project:updated", onUpdate); };
  }, [user?.id, load]);

  const toggleStar = useCallback((id: string) => {
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("pulse-starred", JSON.stringify(next));
      return next;
    });
  }, []);

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

  const starred = projects.filter((p) => starredIds.includes(p.id));
  const width = collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)";

  const Inner = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <>
      <div style={{ padding: isCollapsed ? "12px 0" : "12px", display: "flex", justifyContent: isCollapsed ? "center" : "flex-end" }}>
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="btn-icon"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ width: 28, height: 28, transform: isCollapsed ? "rotate(180deg)" : "none", transition: "transform var(--t-base) var(--ease-out-quart)" }}
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <nav style={{ padding: isCollapsed ? "0 10px" : "0 12px" }}>
        <SideLink
          href="/projects"
          icon={<LayoutDashboard size={17} />}
          label="Dashboard"
          active={pathname === "/projects"}
          collapsed={isCollapsed}
        />
      </nav>

      <div className="rule" style={{ margin: isCollapsed ? "14px 10px" : "14px 12px" }} />

      {!isCollapsed && starred.length > 0 && (
        <div style={{ padding: "0 12px", marginBottom: 10 }}>
          <div className="eyebrow" style={{ padding: "4px 8px 6px", fontSize: 10 }}>Starred</div>
          {starred.map((p) => (
            <BoardLink key={p.id} project={p} pathname={pathname} starred onToggleStar={toggleStar} collapsed={false} />
          ))}
        </div>
      )}

      <div style={{ padding: isCollapsed ? "0 10px" : "0 12px", flex: 1, overflowY: "auto", minHeight: 0 }}>
        {!isCollapsed && (
          <button
            onClick={() => setBoardsExpanded(!boardsExpanded)}
            aria-expanded={boardsExpanded}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer", padding: "4px 8px 6px",
              color: "var(--ink-tertiary)",
            }}
          >
            <span className="eyebrow" style={{ fontSize: 10 }}>Boards</span>
            <ChevronLeft
              size={13}
              style={{
                transform: boardsExpanded ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform var(--t-fast) var(--ease-out-quart)",
              }}
            />
          </button>
        )}

        {boardsExpanded && (
          <div style={{ display: "grid", gap: 1 }}>
            {initialLoading ? (
              // Skeletons mirror the real row height so nothing jumps on load.
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px" }}>
                  <span className="skeleton" style={{ width: 13, height: 13, borderRadius: 3 }} />
                  {!isCollapsed && <span className="skeleton skeleton-text" style={{ flex: 1, maxWidth: 90 + i * 14 }} />}
                </div>
              ))
            ) : projects.length === 0 ? (
              !isCollapsed && (
                <p style={{ padding: "12px 8px", fontSize: 13, color: "var(--ink-tertiary)" }}>No boards yet</p>
              )
            ) : (
              projects.map((p) => (
                <BoardLink
                  key={p.id}
                  project={p}
                  pathname={pathname}
                  starred={starredIds.includes(p.id)}
                  onToggleStar={toggleStar}
                  collapsed={isCollapsed}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ padding: isCollapsed ? "12px 10px 26px" : "12px 12px 26px", borderTop: "1px solid var(--line)" }}>
        <button
          onClick={handleCreateBoard}
          title={isCollapsed ? "New board" : undefined}
          style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: isCollapsed ? 0 : 8,
            padding: isCollapsed ? "9px" : "9px 11px",
            borderRadius: "var(--r-sm)",
            background: "var(--accent-tint)", color: "var(--accent-strong)",
            border: "1px solid transparent", cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            transition: "background var(--t-fast) linear, border-color var(--t-fast) linear",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-tint-strong)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-tint)"; }}
        >
          <Plus size={15} />
          {!isCollapsed && "New board"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .sb {
          position: fixed; left: 0; top: 0; z-index: 50;
          height: 100vh; padding-top: var(--navbar-height);
          background: var(--surface);
          border-right: 1px solid var(--line);
          display: flex; flex-direction: column; overflow: hidden;
          transition: width var(--t-slow) var(--ease-out-expo),
                      min-width var(--t-slow) var(--ease-out-expo);
        }
        .sb-mobile {
          position: fixed; top: 0; z-index: 49;
          width: 258px; height: 100vh; padding-top: var(--navbar-height);
          background: var(--surface); border-right: 1px solid var(--line);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: var(--shadow-xl);
          transition: left var(--t-slow) var(--ease-out-expo);
        }
        .sb-burger {
          position: fixed; left: 16px; z-index: 200;
          top: calc((var(--navbar-height) - 34px) / 2);
          width: 34px; height: 34px; display: none;
          align-items: center; justify-content: center;
          background: var(--surface); border: 1px solid var(--line-strong);
          border-radius: var(--r-xs); color: var(--ink); cursor: pointer;
        }
      `}</style>

      <aside className="sidebar-desktop sb" style={{ width, minWidth: width }}>
        <Inner isCollapsed={collapsed} />
      </aside>

      <button
        className="sidebar-hamburger sb-burger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <ChevronLeft size={19} /> : <Hash size={17} />}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 48,
            background: "var(--overlay)",
            animation: "fade-in var(--t-base) var(--ease-out-quart)",
          }}
        />
      )}

      <aside className="sidebar-mobile sb-mobile" style={{ left: mobileOpen ? 0 : "-280px", display: "none" }}>
        <Inner isCollapsed={false} />
      </aside>
    </>
  );
}

/* ── Rows ─────────────────────────────────────────────────────── */

function SideLink({ href, icon, label, active, collapsed }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "9px 0" : "8px 11px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--r-sm)",
        background: active ? "var(--accent-tint)" : "transparent",
        color: active ? "var(--accent-strong)" : "var(--ink-secondary)",
        textDecoration: "none", fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        transition: "background var(--t-fast) linear, color var(--t-fast) linear",
      }}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
}

function BoardLink({ project, pathname, starred, onToggleStar, collapsed }: {
  project: { id: string; name: string };
  pathname: string;
  starred: boolean;
  onToggleStar: (id: string) => void;
  collapsed: boolean;
}) {
  const active = pathname === `/projects/${project.id}`;
  const color = DOT_COLORS[project.name.length % DOT_COLORS.length];

  return (
    <Link
      href={`/projects/${project.id}`}
      title={collapsed ? project.name : undefined}
      className="sb-row"
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: collapsed ? "8px 0" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--r-xs)",
        background: active ? "var(--accent-tint)" : "transparent",
        color: active ? "var(--accent-strong)" : "var(--ink-secondary)",
        textDecoration: "none", fontSize: 13,
        fontWeight: active ? 600 : 450,
        transition: "background var(--t-fast) linear, color var(--t-fast) linear",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {collapsed ? (
        <span
          style={{
            width: 25, height: 25, borderRadius: "var(--r-xs)", background: color,
            display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff",
          }}
        >
          {project.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <>
          <Hash size={13} style={{ color, flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(project.id); }}
            aria-label={starred ? "Unstar board" : "Star board"}
            style={{
              display: "flex", padding: 2, background: "none", border: "none", cursor: "pointer",
              color: starred ? "var(--warning)" : "var(--ink-faint)",
              opacity: starred ? 1 : 0.35,
              transition: "opacity var(--t-fast) linear, color var(--t-fast) linear",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = starred ? "1" : "0.35"; }}
          >
            <Star size={12} fill={starred ? "currentColor" : "none"} />
          </button>
        </>
      )}
    </Link>
  );
}
