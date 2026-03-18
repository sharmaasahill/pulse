"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { redirect, useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import {
  FolderPlus, Search, Trash2, Edit2, Clock, CheckCircle2, Circle,
  AlertCircle, LayoutGrid, List, BarChart3, ChevronRight, Plus
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
  { id: "indigo", gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" },
  { id: "violet", gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" },
  { id: "rose", gradient: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" },
  { id: "emerald", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
  { id: "amber", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
  { id: "cyan", gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" },
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
  // Deterministic fallback based on project id
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

export default function ProjectsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("indigo");
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
    try {
      if (stored) parsedToken = JSON.parse(stored).state?.token;
    } catch { /* ignore */ }

    if (!token && !parsedToken) {
      setAuthLoading(false);
      redirect("/");
      return;
    }

    const authToken = token || parsedToken;
    if (authToken) {
      setAuthToken(authToken);
      loadProjects();
      setAuthLoading(false);
    }
  }, [token, logout, loadProjects]);

  async function createProject() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/projects", { name: name.trim(), description: description.trim() });
      setBoardColor(data.id, selectedColor);
      setItems([data, ...items]);
      setName(""); setDescription(""); setSelectedColor("indigo");
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
      setEditingProject(null); setName(""); setDescription("");
      setShowEditModal(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function deleteProject(projectId: string) {
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      setItems(items.filter(p => p.id !== projectId));
      setShowDeleteModal(null);
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function toggleProjectSelection(projectId: string) {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  }

  async function bulkDeleteProjects() {
    if (!selectedProjects.length || !window.confirm(`Delete ${selectedProjects.length} projects?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedProjects.map(id => api.delete(`/projects/${id}`)));
      setItems(items.filter(p => !selectedProjects.includes(p.id)));
      setSelectedProjects([]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
    setShowEditModal(true);
  }

  // Analytics
  const stats = useMemo(() => {
    const totalTickets = items.reduce((s, p) => s + (p.tickets?.length || 0), 0);
    const completed = items.reduce((s, p) => s + (p.tickets?.filter(t => t.status === "DONE").length || 0), 0);
    return { total: items.length, totalTickets, completed, progress: totalTickets > 0 ? Math.round((completed / totalTickets) * 100) : 0 };
  }, [items]);

  const chartData = useMemo(() =>
    items.slice(0, 6).map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + "…" : p.name,
      tasks: p.tickets?.length || 0,
    })),
  [items]);

  const statusData = useMemo(() => {
    let todo = 0, ip = 0, done = 0;
    items.forEach(p => p.tickets?.forEach(t => {
      if (t.status === "TODO") todo++;
      else if (t.status === "IN_PROGRESS") ip++;
      else if (t.status === "DONE") done++;
    }));
    if (todo + ip + done === 0) return [];
    return [
      { name: "To Do", value: todo, color: "#94a3b8" },
      { name: "In Progress", value: ip, color: "#818cf8" },
      { name: "Done", value: done, color: "#34d399" },
    ];
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

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        padding: "32px 32px 0",
        maxWidth: "1400px",
        margin: "0 auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{
              fontSize: "28px", fontWeight: "800", margin: "0 0 6px",
              letterSpacing: "-0.02em", color: "var(--text-primary)",
            }}>
              Projects
            </h1>
            <p style={{ color: "var(--text-tertiary)", margin: 0, fontSize: "14px" }}>
              {items.length} board{items.length !== 1 ? "s" : ""} · {stats.totalTickets} task{stats.totalTickets !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { setName(""); setDescription(""); setSelectedColor("indigo"); setShowCreateModal(true); }}
            className="btn"
            style={{ padding: "10px 18px", fontSize: "13px" }}
          >
            <Plus size={16} /> New Board
          </button>
        </div>

        {/* Stats row */}
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              { label: "Total Boards", value: stats.total, color: "var(--accent-primary)" },
              { label: "Total Tasks", value: stats.totalTickets, color: "#8b5cf6" },
              { label: "Completed", value: stats.completed, color: "var(--success)" },
              { label: "Progress", value: `${stats.progress}%`, color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-lg)", padding: "20px",
              }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: "28px", fontWeight: "800", color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "20px", gap: "12px",
        }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              className="input"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {selectedProjects.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-primary)" }}>
                  {selectedProjects.length} selected
                </span>
                <button onClick={bulkDeleteProjects} className="btn-danger" style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer" }}>
                  <Trash2 size={13} /> Delete
                </button>
                <button onClick={() => setSelectedProjects([])} className="btn-ghost" style={{ padding: "6px 8px", fontSize: "12px" }}>
                  Clear
                </button>
              </div>
            )}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="input"
              style={{ width: "auto", padding: "8px 12px", fontSize: "13px" }}
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Alphabetical</option>
              <option value="tickets">Most Tasks</option>
            </select>
            <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", padding: "2px" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="btn-icon"
                style={{
                  padding: "6px",
                  background: viewMode === "grid" ? "var(--bg-secondary)" : "transparent",
                  boxShadow: viewMode === "grid" ? "var(--shadow-xs)" : "none",
                  color: viewMode === "grid" ? "var(--accent-primary)" : "var(--text-tertiary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="btn-icon"
                style={{
                  padding: "6px",
                  background: viewMode === "list" ? "var(--bg-secondary)" : "transparent",
                  boxShadow: viewMode === "list" ? "var(--shadow-xs)" : "none",
                  color: viewMode === "list" ? "var(--accent-primary)" : "var(--text-tertiary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Cards */}
      <div style={{ padding: "0 32px 40px", maxWidth: "1400px", margin: "0 auto" }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 40px",
            background: "var(--bg-secondary)", borderRadius: "var(--radius-xl)",
            border: "1px dashed var(--border-primary)",
          }}>
            <FolderPlus size={44} style={{ color: "var(--text-tertiary)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
              No boards yet
            </h3>
            <p style={{ color: "var(--text-tertiary)", marginBottom: "24px", fontSize: "14px" }}>
              Create your first board to start organizing tasks.
            </p>
            <button
              onClick={() => { setName(""); setDescription(""); setSelectedColor("indigo"); setShowCreateModal(true); }}
              className="btn"
            >
              <Plus size={16} /> Create Board
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {filtered.map(project => {
              const tickets = project.tickets || [];
              const done = tickets.filter(t => t.status === "DONE").length;
              const progress = tickets.length > 0 ? (done / tickets.length) * 100 : 0;
              const gradient = getBoardColor(project.id);
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{
                    background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-lg)", overflow: "hidden",
                    cursor: "pointer", transition: "all var(--transition-base)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  <div style={{ height: "48px", background: gradient, position: "relative" }}>
                    <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px" }}>
                      <button onClick={e => { e.stopPropagation(); openEditModal(project); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer", padding: "5px", display: "flex" }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setShowDeleteModal({ id: project.id, name: project.name }); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer", padding: "5px", display: "flex" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 6px", color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {project.name}
                    </h3>
                    <p style={{
                      fontSize: "13px", color: "var(--text-tertiary)", margin: "0 0 16px",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      minHeight: "36px",
                    }}>
                      {project.description || "No description"}
                    </p>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                        <span>Progress</span>
                        <span>{done}/{tickets.length}</span>
                      </div>
                      <div style={{ height: "4px", background: "var(--border-primary)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "var(--success)" : "var(--accent-primary)", borderRadius: "2px", transition: "width 0.5s" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-secondary)" }}>
                      {progress === 100 && tickets.length > 0 ? (
                        <span className="badge badge-success"><CheckCircle2 size={12} /> Completed</span>
                      ) : tickets.length === 0 ? (
                        <span className="badge badge-muted"><Circle size={12} /> Empty</span>
                      ) : (
                        <span className="badge badge-accent"><Clock size={12} /> Active</span>
                      )}
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                        {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List View ── */
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)", fontSize: "12px", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "14px 18px", width: "40px", textAlign: "left" }}>
                    <input type="checkbox" onChange={e => setSelectedProjects(e.target.checked ? filtered.map(p => p.id) : [])} checked={selectedProjects.length === filtered.length && items.length > 0} style={{ accentColor: "var(--accent-primary)", cursor: "pointer" }} />
                  </th>
                  <th style={{ padding: "14px 12px", fontWeight: "600", textAlign: "left" }}>Board</th>
                  <th style={{ padding: "14px 12px", fontWeight: "600", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "14px 12px", fontWeight: "600", textAlign: "left", width: "180px" }}>Progress</th>
                  <th style={{ padding: "14px 12px", fontWeight: "600", textAlign: "right" }}>Updated</th>
                  <th style={{ padding: "14px 18px", width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(project => {
                  const tickets = project.tickets || [];
                  const done = tickets.filter(t => t.status === "DONE").length;
                  const progress = tickets.length > 0 ? (done / tickets.length) * 100 : 0;
                  const isSelected = selectedProjects.includes(project.id);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      style={{
                        borderBottom: "1px solid var(--border-secondary)",
                        cursor: "pointer",
                        background: isSelected ? "var(--accent-primary-soft)" : "transparent",
                        transition: "background var(--transition-fast)",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "14px 18px" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleProjectSelection(project.id)} style={{ accentColor: "var(--accent-primary)", cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "8px", height: "32px", borderRadius: "4px", background: getBoardColor(project.id), flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", marginBottom: "2px" }}>{project.name}</div>
                            <div style={{ color: "var(--text-tertiary)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }}>
                              {project.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        {progress === 100 && tickets.length > 0 ? (
                          <span className="badge badge-success"><CheckCircle2 size={12} /> Done</span>
                        ) : tickets.length === 0 ? (
                          <span className="badge badge-muted"><Circle size={12} /> Empty</span>
                        ) : (
                          <span className="badge badge-accent"><Clock size={12} /> Active</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ flex: 1, height: "4px", background: "var(--border-primary)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "var(--success)" : "var(--accent-primary)", borderRadius: "2px" }} />
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", width: "28px" }}>{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right", color: "var(--text-tertiary)", fontSize: "13px" }}>
                        {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 18px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                          <button onClick={() => openEditModal(project)} className="btn-icon" style={{ padding: "4px" }}><Edit2 size={14} /></button>
                          <button onClick={() => setShowDeleteModal({ id: project.id, name: project.name })} className="btn-icon" style={{ padding: "4px", color: "var(--danger)" }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}>Create New Board</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: "14px", marginBottom: "24px" }}>Set up a workspace to organize your tasks.</p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Board Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input className="input" placeholder="e.g. Website Redesign" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Description</label>
              <textarea className="input" placeholder="What is this board for?" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Board Color</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {BOARD_COLORS.map(bc => (
                  <button
                    key={bc.id}
                    onClick={() => setSelectedColor(bc.id)}
                    style={{
                      width: "32px", height: "32px", borderRadius: "50%", border: "none",
                      background: bc.gradient, cursor: "pointer",
                      outline: selectedColor === bc.id ? "3px solid var(--accent-primary)" : "none",
                      outlineOffset: "2px", transition: "all var(--transition-fast)",
                      transform: selectedColor === bc.id ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowCreateModal(false)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer" }}>Cancel</button>
              <button className="btn" onClick={createProject} disabled={loading || !name.trim()} style={{ padding: "10px 20px", fontSize: "14px" }}>
                {loading ? "Creating..." : "Create Board"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editingProject && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}>Edit Board</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: "14px", marginBottom: "24px" }}>Update your board details.</p>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Board Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Description</label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer" }}>Cancel</button>
              <button className="btn" onClick={updateProject} disabled={loading || !name.trim()} style={{ padding: "10px 20px", fontSize: "14px" }}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "10px", borderRadius: "50%" }}>
                <AlertCircle size={22} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0 }}>Delete board?</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              Are you sure you want to delete <strong>&quot;{showDeleteModal.name}&quot;</strong>? This will permanently erase the board and all tickets.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-secondary" disabled={loading} onClick={() => setShowDeleteModal(null)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Cancel</button>
              <button className="btn-danger" disabled={loading} onClick={() => deleteProject(showDeleteModal.id)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: "600" }}>
                {loading ? "Deleting..." : "Delete Board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
