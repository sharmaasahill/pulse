"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { redirect, useRouter } from "next/navigation";
import {
  FolderPlus, Search, Trash2, Edit2, Clock, CheckCircle2, Circle,
  AlertCircle, LayoutGrid, List, Plus, Star, TrendingUp,
  Zap, ChevronRight, ArrowRight, Activity, Target, Layers, X
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  tickets?: Array<{ id: string; status: string; priority?: string }>;
};

type SortOption = "name" | "date" | "tickets" | "recent";
type ViewMode = "grid" | "list";

const BOARD_COLORS = [
  { id: "orange", gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" },
  { id: "violet", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" },
  { id: "indigo", gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" },
  { id: "emerald", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
  { id: "rose", gradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)" },
  { id: "cyan", gradient: "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)" },
  { id: "amber", gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" },
  { id: "pink", gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" },
];

function getBoardColor(projectId: string): string {
  try {
    const stored = localStorage.getItem("pulse-board-colors");
    if (stored) {
      const map = JSON.parse(stored);
      const found = BOARD_COLORS.find(c => c.id === map[projectId]);
      if (found) return found.gradient;
    }
  } catch { /* ignore */ }
  const idx = projectId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % BOARD_COLORS.length;
  return BOARD_COLORS[idx].gradient;
}

function setBoardColor(projectId: string, colorId: string) {
  try {
    const stored = localStorage.getItem("pulse-board-colors");
    const map = stored ? JSON.parse(stored) : {};
    map[projectId] = colorId;
    localStorage.setItem("pulse-board-colors", JSON.stringify(map));
  } catch { /* ignore */ }
}

/* ─────────────────── Progress Ring ─────────────────── */
function ProgressRing({ progress, size = 52, stroke = 4 }: { progress: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  const color = progress === 100 ? "#10b981" : progress > 50 ? "#f97316" : "#6366f1";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fill: "#fff", fontSize: size / 4, fontWeight: 800, fontFamily: "Inter, sans-serif", transform: "rotate(90deg)", transformOrigin: "center center" }}>
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

/* ─────────────────── Stat Card ─────────────────── */
function StatCard({ label, value, icon, color, sub }: { label: string; value: number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px", padding: "20px 22px",
      display: "flex", alignItems: "center", gap: "16px",
      transition: "all 0.25s", cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = color + "40"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 700 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("orange");
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [starredIds, setStarredIds] = useState<string[]>([]);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setItems(data);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const stored = localStorage.getItem("auth-storage");
    let parsedToken = null;
    try { if (stored) parsedToken = JSON.parse(stored).state?.token; } catch { /* ignore */ }
    if (!token && !parsedToken) { setAuthLoading(false); redirect("/"); return; }
    const authToken = token || parsedToken;
    if (authToken) { setAuthToken(authToken); loadProjects(); setAuthLoading(false); }
    try {
      const s = localStorage.getItem("pulse-starred");
      if (s) setStarredIds(JSON.parse(s));
    } catch { /* ignore */ }

    // Listen for sidebar's Create Board button
    function onCreateBoardEvent() {
      setName(""); setDescription(""); setSelectedColor("orange"); setShowCreateModal(true);
    }
    window.addEventListener("pulse:create-board", onCreateBoardEvent);
    return () => window.removeEventListener("pulse:create-board", onCreateBoardEvent);
  }, [token, logout, loadProjects]);

  function toggleStar(projectId: string) {
    setStarredIds(prev => {
      const next = prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId];
      localStorage.setItem("pulse-starred", JSON.stringify(next));
      return next;
    });
  }

  async function createProject() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/projects", { name: name.trim(), description: description.trim() });
      setBoardColor(data.id, selectedColor);
      setItems([data, ...items]);
      setName(""); setDescription(""); setSelectedColor("orange");
      setShowCreateModal(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function updateProject() {
    if (!editingProject || !name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.patch(`/projects/${editingProject.id}`, { name: name.trim(), description: description.trim() });
      setItems(items.map(p => p.id === editingProject.id ? data : p));
      setEditingProject(null); setName(""); setDescription(""); setShowEditModal(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function deleteProject(projectId: string) {
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      setItems(items.filter(p => p.id !== projectId));
      setShowDeleteModal(null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function openEditModal(project: Project) {
    setEditingProject(project); setName(project.name); setDescription(project.description || ""); setShowEditModal(true);
  }

  const stats = useMemo(() => {
    const total = items.length;
    const totalTickets = items.reduce((s, p) => s + (p.tickets?.length || 0), 0);
    const todo = items.reduce((s, p) => s + (p.tickets?.filter(t => t.status === "TODO").length || 0), 0);
    const inProgress = items.reduce((s, p) => s + (p.tickets?.filter(t => t.status === "IN_PROGRESS").length || 0), 0);
    const completed = items.reduce((s, p) => s + (p.tickets?.filter(t => t.status === "DONE").length || 0), 0);
    const activeBoards = items.filter(p => p.tickets && p.tickets.some(t => t.status === "IN_PROGRESS")).length;
    const progress = totalTickets > 0 ? Math.round((completed / totalTickets) * 100) : 0;
    return { total, todo, inProgress, totalTickets, completed, activeBoards, progress };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "date": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "tickets": return (b.tickets?.length || 0) - (a.tickets?.length || 0);
        default: return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
    });
  }, [items, searchQuery, sortBy]);

  const starred = filtered.filter(p => starredIds.includes(p.id));
  const unstarred = filtered.filter(p => !starredIds.includes(p.id));

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(249,115,22,0.2)", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#111111", color: "#fff", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .proj-card { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) backwards; }
        .proj-card:hover .proj-actions { opacity: 1 !important; }
        .proj-card:hover .proj-chevron { opacity: 1 !important; transform: translateX(4px) !important; }
        .input-dark {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 15px;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .input-dark:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .input-dark::placeholder { color: rgba(255,255,255,0.3); }
        .btn-orange {
          background: linear-gradient(135deg,#f97316,#ea580c); border: none; color: #fff;
          font-size: 14px; font-weight: 700; cursor: pointer; padding: 11px 22px; border-radius: 12px;
          display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(249,115,22,0.3); font-family: inherit;
        }
        .btn-orange:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.4); }
        .btn-orange:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-ghost-dark {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
          font-size: 14px; font-weight: 600; cursor: pointer; padding: 11px 18px; border-radius: 12px;
          display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s; font-family: inherit;
        }
        .btn-ghost-dark:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .section-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
        .modal-glass {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .modal-box {
          background: rgba(20,20,20,0.95); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 32px; width: 100%; max-width: 480px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.6); position: relative;
        }
        .search-bar {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 10px 14px 10px 40px; color: #fff; font-size: 14px;
          outline: none; transition: all 0.2s; font-family: inherit; width: 260px;
        }
        .search-bar:focus { border-color: rgba(249,115,22,0.4); background: rgba(255,255,255,0.07); }
        .search-bar::placeholder { color: rgba(255,255,255,0.3); }
        .sort-select {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 8px 12px; color: rgba(255,255,255,0.7); font-size: 13px;
          cursor: pointer; outline: none; font-family: inherit; font-weight: 600;
        }
        .view-btn {
          padding: 7px 9px; border-radius: 8px; border: none; cursor: pointer;
          display: flex; align-items: center; transition: all 0.15s;
        }
        .star-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          display: flex; align-items: center; transition: all 0.2s;
        }
        .list-row:hover { background: rgba(255,255,255,0.04) !important; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .stats-row { grid-template-columns: repeat(2, 1fr) !important; }
          .proj-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }
          .search-bar { width: 200px !important; }
        }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
          .toolbar { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
          .stats-row { grid-template-columns: repeat(2, 1fr) !important; }
          .proj-grid { grid-template-columns: 1fr !important; }
          .search-bar { width: 100% !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .sidebar-overlay { display: block !important; }
          .main-content { margin-left: 0 !important; }
          .modal-box { padding: 24px !important; border-radius: 18px !important; }
          .list-table { display: none; }
          .list-cards { display: flex; flex-direction: column; gap: 10px; }
        }
        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr 1fr !important; }
          .proj-grid { grid-template-columns: 1fr !important; }
          .page-padding { padding: 16px !important; }
          .modal-glass { padding: 16px !important; }
        }
      `}</style>

      {/* ══════════ PAGE HEADER ══════════ */}
      <div style={{ padding: "32px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }} className="page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 8px #f97316" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.1em" }}>Workspace</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px", background: "linear-gradient(135deg,#fff,rgba(255,255,255,0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your Projects
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 14 }}>
              {items.length} board{items.length !== 1 ? "s" : ""} · {stats.totalTickets} total tasks · {stats.activeBoards} active
            </p>
          </div>
          <button className="btn-orange" onClick={() => { setName(""); setDescription(""); setSelectedColor("orange"); setShowCreateModal(true); }}>
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* ══════════ STATS ROW ══════════ */}
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }} className="stats-row">
            <StatCard label="Total Tasks" value={stats.totalTickets} icon={<Layers size={20} color="#8b5cf6" />} color="#8b5cf6" />
            <StatCard label="In Progress" value={stats.inProgress} icon={<Activity size={20} color="#f97316" />} color="#f97316" sub={stats.inProgress > 0 ? "Active right now" : undefined} />
            <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 size={20} color="#10b981" />} color="#10b981" sub={stats.totalTickets > 0 ? `${stats.progress}% done` : undefined} />
            <StatCard label="Boards Active" value={stats.activeBoards} icon={<Zap size={20} color="#6366f1" />} color="#6366f1" />
          </div>
        )}

        {/* ══════════ TOOLBAR ══════════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }} className="toolbar">
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input className="search-bar" placeholder="Search projects…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="sort-select">
              <option value="recent">Recently Updated</option>
              <option value="name">A → Z</option>
              <option value="tickets">Most Tasks</option>
              <option value="date">Date Created</option>
            </select>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
              {([["grid", LayoutGrid], ["list", List]] as const).map(([mode, Icon]) => (
                <button key={mode} className="view-btn"
                  onClick={() => setViewMode(mode as ViewMode)}
                  style={{ background: viewMode === mode ? "rgba(249,115,22,0.15)" : "transparent", color: viewMode === mode ? "#f97316" : "rgba(255,255,255,0.4)" }}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ BOARDS ══════════ */}
      <div style={{ padding: "0 40px 60px", maxWidth: 1280, margin: "0 auto" }}>
        {items.length === 0 ? (
          /* ─── Empty state ─── */
          <div style={{
            textAlign: "center", padding: "100px 40px",
            background: "rgba(255,255,255,0.02)", borderRadius: 24,
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <FolderPlus size={36} color="#f97316" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em" }}>Your workspace awaits</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 28, fontSize: 15, maxWidth: 320, margin: "0 auto 28px", lineHeight: 1.6 }}>
              Create your first project to start organizing tasks and collaborating with your team.
            </p>
            <button className="btn-orange" style={{ padding: "14px 28px", fontSize: 15 }} onClick={() => { setName(""); setDescription(""); setSelectedColor("orange"); setShowCreateModal(true); }}>
              <Plus size={18} /> Create First Project
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <>
            {/* ─── Starred ─── */}
            {starred.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={11} fill="currentColor" />Starred
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {starred.map((p, i) => <ProjectCard key={p.id} project={p} index={i} starred router={router} openEditModal={openEditModal} setShowDeleteModal={setShowDeleteModal} starredIds={starredIds} toggleStar={toggleStar} />)}
                </div>
              </div>
            )}
            {/* ─── All Projects ─── */}
            {(starred.length > 0 && unstarred.length > 0) && <div className="section-label">All Projects</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {unstarred.map((p, i) => <ProjectCard key={p.id} project={p} index={i} starred={false} router={router} openEditModal={openEditModal} setShowDeleteModal={setShowDeleteModal} starredIds={starredIds} toggleStar={toggleStar} />)}
            </div>
          </>
        ) : (
          /* ─── List view ─── */
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px 120px 100px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <span>Project</span><span>Description</span><span>Progress</span><span>Tasks</span><span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {filtered.map((project, i) => {
              const tickets = project.tickets || [];
              const done = tickets.filter(t => t.status === "DONE").length;
              const progress = tickets.length > 0 ? (done / tickets.length) * 100 : 0;
              return (
                <div key={project.id} className="list-row" onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px 120px 100px", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "background 0.15s", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 36, borderRadius: 5, background: getBoardColor(project.id), flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{project.name}</span>
                    {starredIds.includes(project.id) && <Star size={12} fill="#f59e0b" color="#f59e0b" />}
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{project.description || "—"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 16 }}>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#10b981" : "#f97316", borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", width: 32, textAlign: "right" }}>{Math.round(progress)}%</span>
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{done}/{tickets.length} done</span>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModal(project)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><Edit2 size={13} /></button>
                    <button onClick={() => setShowDeleteModal({ id: project.id, name: project.name })} style={{ background: "rgba(255,68,68,0.1)", border: "none", borderRadius: 8, padding: "6px", color: "#ef4444", cursor: "pointer" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════ CREATE MODAL ══════════ */}
      {showCreateModal && (
        <div className="modal-glass" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><X size={15} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color="#f97316" /></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Create Project</h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Set up a new workspace to organize your team's tasks.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Name*</label>
              <input className="input-dark" placeholder="e.g. Website Redesign" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
              <textarea className="input-dark" placeholder="What is this project about?" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cover Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {BOARD_COLORS.map(bc => (
                  <button key={bc.id} onClick={() => setSelectedColor(bc.id)} style={{
                    width: 36, height: 36, borderRadius: 10, border: "none", background: bc.gradient, cursor: "pointer",
                    outline: selectedColor === bc.id ? "2px solid #f97316" : "2px solid transparent",
                    outlineOffset: 2, transition: "all 0.2s", transform: selectedColor === bc.id ? "scale(1.15)" : "scale(1)",
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost-dark" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-orange" onClick={createProject} disabled={loading || !name.trim()}>
                {loading ? "Creating…" : <><Plus size={15} /> Create Project</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ EDIT MODAL ══════════ */}
      {showEditModal && editingProject && (
        <div className="modal-glass" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEditModal(false)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><X size={15} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={18} color="#818cf8" /></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Edit Project</h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Update your project details.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Name</label>
              <input className="input-dark" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
              <textarea className="input-dark" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost-dark" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-orange" onClick={updateProject} disabled={loading || !name.trim()}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DELETE MODAL ══════════ */}
      {showDeleteModal && (
        <div className="modal-glass" onClick={() => setShowDeleteModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={22} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Delete Project?</h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              This will permanently delete <strong style={{ color: "#fff" }}>"{showDeleteModal.name}"</strong> and all its tasks. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost-dark" onClick={() => setShowDeleteModal(null)}>Cancel</button>
              <button onClick={() => deleteProject(showDeleteModal.id)} disabled={loading} style={{ background: "#ef4444", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, padding: "11px 18px", borderRadius: 12, cursor: "pointer", opacity: loading ? 0.6 : 1, fontFamily: "inherit" }}>
                {loading ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ PROJECT CARD ══════════ */
function ProjectCard({ project, index, starred, router, openEditModal, setShowDeleteModal, starredIds, toggleStar }: {
  project: Project; index: number; starred: boolean;
  router: ReturnType<typeof useRouter>;
  openEditModal: (p: Project) => void;
  setShowDeleteModal: (v: { id: string; name: string } | null) => void;
  starredIds: string[]; toggleStar: (id: string) => void;
}) {
  const tickets = project.tickets || [];
  const done = tickets.filter(t => t.status === "DONE").length;
  const inProgress = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const progress = tickets.length > 0 ? (done / tickets.length) * 100 : 0;
  const gradient = getBoardColor(project.id);
  const isStarred = starredIds.includes(project.id);

  return (
    <div className="proj-card" onClick={() => router.push(`/projects/${project.id}`)}
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "all 0.25s",
        animationDelay: `${index * 0.04}s`, position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Cover */}
      <div style={{ height: 80, background: gradient, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
        {/* Actions */}
        <div className="proj-actions" style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, opacity: 0, transition: "opacity 0.2s" }} onClick={e => e.stopPropagation()}>
          <button onClick={() => toggleStar(project.id)} style={{ background: "rgba(0,0,0,0.4)", border: "none", borderRadius: 8, padding: "5px 6px", cursor: "pointer", display: "flex" }}>
            <Star size={13} fill={isStarred ? "#f59e0b" : "none"} color={isStarred ? "#f59e0b" : "#fff"} />
          </button>
          <button onClick={() => openEditModal(project)} style={{ background: "rgba(0,0,0,0.4)", border: "none", borderRadius: 8, padding: "5px 6px", color: "#fff", cursor: "pointer", display: "flex" }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => setShowDeleteModal({ id: project.id, name: project.name })} style={{ background: "rgba(239,68,68,0.6)", border: "none", borderRadius: 8, padding: "5px 6px", color: "#fff", cursor: "pointer", display: "flex" }}>
            <Trash2 size={13} />
          </button>
        </div>
        {isStarred && (
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <Star size={14} fill="#f59e0b" color="#f59e0b" />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", color: "#fff", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{project.name}</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {project.description || "No description"}
            </p>
          </div>
          <ProgressRing progress={progress} size={48} stroke={4} />
        </div>

        {/* Task pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {tickets.filter(t => t.status === "TODO").length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.07)", padding: "3px 8px", borderRadius: 6 }}>
              {tickets.filter(t => t.status === "TODO").length} todo
            </span>
          )}
          {inProgress > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.12)", padding: "3px 8px", borderRadius: 6 }}>
              {inProgress} active
            </span>
          )}
          {done > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: 6 }}>
              {done} done
            </span>
          )}
          {tickets.length === 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 6 }}>Empty</span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} />
            {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <span className="proj-chevron" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#f97316", opacity: 0, transition: "all 0.2s", transform: "translateX(-4px)" }}>
            Open board <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
