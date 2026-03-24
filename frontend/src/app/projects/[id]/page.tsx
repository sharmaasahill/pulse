"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getSocket, joinProject } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { Notifications } from "./notifications";
import { 
  DndContext, DragOverlay, closestCorners, MouseSensor, 
  useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, arrayMove, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search, Plus, Edit2, Trash2, ArrowLeft, ArrowRight, AlertCircle, X, CheckCircle2,
  Clock, Zap, Circle, GripVertical, Flag, ChevronRight, Activity
} from "lucide-react";

interface Project { id: string; name: string; tickets?: Ticket[]; }
interface Ticket {
  id: string; title: string; authorId?: string;
  author?: { id: string; email: string };
  status: "TODO" | "IN_PROGRESS" | "DONE";
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const PRIORITY_META: Record<Priority, { color: string; bg: string; label: string }> = {
  LOW: { color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "Low" },
  MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Medium" },
  HIGH: { color: "#f97316", bg: "rgba(249,115,22,0.1)", label: "High" },
  URGENT: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Urgent" },
};

const COL_META = {
  TODO: {
    color: "#94a3b8", glow: "rgba(148,163,184,0.15)", bg: "rgba(148,163,184,0.1)",
    borderColor: "rgba(148,163,184,0.3)", label: "To Do", icon: <Circle size={14} />,
  },
  IN_PROGRESS: {
    color: "#f97316", glow: "rgba(249,115,22,0.15)", bg: "rgba(249,115,22,0.1)",
    borderColor: "rgba(249,115,22,0.35)", label: "In Progress", icon: <Zap size={14} />,
  },
  DONE: {
    color: "#10b981", glow: "rgba(16,185,129,0.15)", bg: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.35)", label: "Done", icon: <CheckCircle2 size={14} />,
  },
};

/* ─── Draggable Ticket Card ─── */
function DraggableTicket({ ticket, onEdit, onDelete, onMove }: {
  ticket: Ticket; onEdit: (t: Ticket) => void; onDelete: (t: Ticket) => void;
  onMove: (id: string, st: "TODO" | "IN_PROGRESS" | "DONE") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const [hovered, setHovered] = useState(false);
  const pri = PRIORITY_META[ticket.priority || "MEDIUM"];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "border 0.2s, box-shadow 0.2s",
        opacity: isDragging ? 0 : 1,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14, padding: "14px 14px 12px", marginBottom: 8, position: "relative",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes} {...listeners}
    >
      {/* Drag handle + actions */}
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.15s", zIndex: 10 }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(ticket); }}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, padding: "4px 5px", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center" }}
        ><Edit2 size={12} /></button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(ticket); }}
          style={{ background: "rgba(239,68,68,0.12)", border: "none", borderRadius: 7, padding: "4px 5px", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}
        ><Trash2 size={12} /></button>
      </div>

      {/* Priority pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, color: pri.color, background: pri.bg,
          padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.06em",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <Flag size={9} />{pri.label}
        </span>
      </div>

      {/* Title */}
      <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 5px", color: "#fff", lineHeight: 1.4, paddingRight: hovered ? 44 : 0, transition: "padding 0.2s" }}>
        {ticket.title}
      </h4>

      {/* Description */}
      {ticket.description && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 10px", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {ticket.description}
        </p>
      )}

      {/* Author */}
      {ticket.author?.email && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {ticket.author.email[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
            {ticket.author.email.split("@")[0]}
          </span>
        </div>
      )}

      {/* Mobile Move Actions */}
      <div className="mobile-move-actions" style={{ display: "none", gap: 8, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
        {ticket.status !== "TODO" && (
          <button onClick={e => { e.stopPropagation(); onMove(ticket.id, ticket.status === "DONE" ? "IN_PROGRESS" : "TODO"); }} 
            style={{ flex: 1, padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {ticket.status !== "DONE" && (
          <button onClick={e => { e.stopPropagation(); onMove(ticket.id, ticket.status === "TODO" ? "IN_PROGRESS" : "DONE"); }}
            style={{ flex: 1, padding: "8px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, color: "#f97316", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontWeight: 700 }}>
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Column Quick Add ─── */
function QuickAdd({ status, projectId, userEmail, onAdded }: { status: string; projectId: string; userEmail: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!val.trim()) return;
    setLoading(true);
    try {
      await api.post("/tickets", { projectId, title: val.trim(), status, authorEmail: userEmail });
      setVal(""); setOpen(false); onAdded();
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "9px 10px",
        background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10,
        color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", marginTop: 4,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(249,115,22,0.08)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)"; e.currentTarget.style.color = "#f97316"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
      >
        <Plus size={14} /> Add task
      </button>
    );
  }

  return (
    <div style={{ marginTop: 6 }}>
      <input
        autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Task title…"
        style={{
          width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(249,115,22,0.4)",
          borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none",
          fontFamily: "inherit", boxShadow: "0 0 0 3px rgba(249,115,22,0.08)",
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={submit} disabled={loading || !val.trim()} style={{
          flex: 1, background: "#f97316", border: "none", borderRadius: 8, padding: "8px", color: "#fff",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>{loading ? "Adding…" : "Add"}</button>
        <button onClick={() => { setOpen(false); setVal(""); }} style={{
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "8px 10px",
          color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center",
        }}><X size={14} /></button>
      </div>
    </div>
  );
}

/* ─── Droppable Column ─── */
function KanbanColumn({ id, tickets, onEdit, onDelete, projectId, userEmail, onAdded, onMove }: {
  id: "TODO" | "IN_PROGRESS" | "DONE"; tickets: Ticket[];
  onEdit: (t: Ticket) => void; onDelete: (t: Ticket) => void;
  onMove: (id: string, st: "TODO" | "IN_PROGRESS" | "DONE") => void;
  projectId: string; userEmail: string; onAdded: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = COL_META[id];

  return (
    <div style={{
      background: isOver ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isOver ? meta.borderColor : "rgba(255,255,255,0.06)"}`,
      borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", minHeight: 480,
      transition: "all 0.2s",
      boxShadow: isOver ? `0 0 20px ${meta.glow}` : "none",
    }} ref={setNodeRef}>
      {/* Column Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: meta.color, display: "flex" }}>{meta.icon}</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>{meta.label}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, color: meta.color, background: meta.bg || "rgba(255,255,255,0.08)",
          padding: "3px 9px", borderRadius: 20, minWidth: 24, textAlign: "center",
        }}>{tickets.length}</span>
      </div>

      {/* Top accent bar */}
      <div style={{ height: 2, background: meta.color, borderRadius: 2, marginBottom: 14, opacity: 0.4 }} />

      {/* Tickets */}
      <div style={{ flex: 1 }}>
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(t => (
            <DraggableTicket key={t.id} ticket={t} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
          ))}
        </SortableContext>
        {tickets.length === 0 && !isOver && (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}>No tasks</div>
            <div style={{ fontSize: 11 }}>Drop tasks here or add one below</div>
          </div>
        )}
      </div>

      {/* Quick add */}
      <QuickAdd status={id} projectId={projectId} userEmail={userEmail} onAdded={onAdded} />
    </div>
  );
}

/* ══════════ MAIN PAGE ══════════ */
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, logout, user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "ALL">("ALL");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  );

  const initialized = useRef(false);

  function reloadProject() {
    const authToken = useAuth.getState().token;
    if (!authToken) return;
    setAuthToken(authToken);
    api.get(`/projects/${projectId}`)
      .then(r => setProject(r.data))
      .catch((err: any) => {
        if (err?.response?.status === 401) { logout(); router.push("/"); }
      });
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const stored = localStorage.getItem("auth-storage");
      let parsedToken: string | null = null;
      try { if (stored) parsedToken = JSON.parse(stored)?.state?.token ?? null; } catch { /* ignore */ }
      const authToken = useAuth.getState().token ?? parsedToken;

      if (!authToken) { router.push("/"); return; }

      setAuthToken(authToken);
      api.get(`/projects/${projectId}`)
        .then(r => setProject(r.data))
        .catch((err: any) => {
          if (err?.response?.status === 401) { logout(); router.push("/"); }
        });
    }

    const socket = getSocket();
    const join = () => joinProject(projectId, user?.id || "anonymous");
    if (socket.connected) join(); else socket.on("connect", join);

    const handleTicketUpdate = (payload: { type: string; ticket: Ticket }) => {
      setProject(prev => {
        if (!prev) return prev;
        if (payload.type === "created") return { ...prev, tickets: [payload.ticket, ...(prev.tickets ?? [])] };
        if (payload.type === "updated") return { ...prev, tickets: (prev.tickets ?? []).map(t => t.id === payload.ticket.id ? payload.ticket : t) };
        if (payload.type === "deleted") return { ...prev, tickets: (prev.tickets ?? []).filter(t => t.id !== payload.ticket.id) };
        return prev;
      });
    };

    socket.on("ticket:updated", handleTicketUpdate);

    return () => {
      socket.off("connect", join);
      socket.off("ticket:updated", handleTicketUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.email]);

  async function createTicket() {
    if (!title.trim()) return;
    try {
      await api.post("/tickets", { projectId, title: title.trim(), description: description.trim(), priority, authorEmail: user?.email });
      setTitle(""); setDescription(""); setPriority("MEDIUM"); setShowCreateModal(false);
    } catch { /* ignore */ }
  }

  async function updateTicket() {
    if (!editingTicket || !title.trim()) return;
    try {
      await api.patch(`/tickets/${editingTicket.id}`, { title: title.trim(), description: description.trim(), priority });
      setEditingTicket(null); setTitle(""); setDescription(""); setPriority("MEDIUM");
    } catch { /* ignore */ }
  }

  async function deleteTicket(ticketId: string) {
    try { await api.delete(`/tickets/${ticketId}`); setProject(prev => prev ? { ...prev, tickets: (prev.tickets ?? []).filter(t => t.id !== ticketId) } : prev); setShowDeleteModal(null); }
    catch { /* ignore */ }
  }

  function openEditModal(ticket: Ticket) {
    setEditingTicket(ticket); setTitle(ticket.title); setDescription(ticket.description || ""); setPriority(ticket.priority || "MEDIUM");
  }

  async function moveTicket(ticketId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") {
    if (!project) return;
    const ticket = project.tickets?.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    setProject(prev => prev ? { ...prev, tickets: (prev.tickets ?? []).map(t => t.id === ticketId ? { ...t, status: newStatus } : t) } : prev);
    try { await api.patch(`/tickets/${ticketId}`, { status: newStatus }); }
    catch { reloadProject(); }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !project) return;
    
    let newStatus = over.id as string;
    if (!["TODO", "IN_PROGRESS", "DONE"].includes(newStatus)) {
      const overTicket = project.tickets?.find(t => t.id === newStatus);
      if (!overTicket) return;
      newStatus = overTicket.status;
    }
    
    moveTicket(active.id as string, newStatus as "TODO" | "IN_PROGRESS" | "DONE");
  }

  const filter = (tickets: Ticket[], status: string) => tickets.filter(t => {
    const s = t.status === status;
    const q = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const p = filterPriority === "ALL" || t.priority === filterPriority || (!t.priority && filterPriority === "MEDIUM");
    return s && q && p;
  });

  const stats = useMemo(() => {
    const all = project?.tickets ?? [];
    const total = all.length;
    const done = all.filter(t => t.status === "DONE").length;
    const inProg = all.filter(t => t.status === "IN_PROGRESS").length;
    const urgent = all.filter(t => t.priority === "URGENT" || t.priority === "HIGH").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProg, urgent, progress };
  }, [project]);

  if (!project) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(249,115,22,0.2)", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading board…</span>
        </div>
      </div>
    );
  }

  const activeTicket = project.tickets?.find(t => t.id === activeId);

  return (
    <div style={{ minHeight: "100vh", background: "#111111", color: "#fff", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        .board-input {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 14px;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .board-input:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .board-input::placeholder { color: rgba(255,255,255,0.3); }
        .btn-orange-sm {
          background: linear-gradient(135deg,#f97316,#ea580c); border: none; color: #fff;
          font-size: 13px; font-weight: 700; cursor: pointer; padding: 10px 18px; border-radius: 10px;
          display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit;
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        .btn-orange-sm:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(249,115,22,0.4); }
        .btn-orange-sm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .modal-glass {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .modal-panel {
          background: rgba(18,18,18,0.98); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 32px; width: 100%; max-width: 500px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.7); animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        .pri-btn {
          flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid transparent;
          font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .filter-chip {
          padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .filter-chip.active { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #f97316; }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <div className="project-header-section" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
        <div className="project-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => router.push("/projects")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px", display: "flex", alignItems: "center", color: "rgba(255,255,255,0.7)", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            ><ArrowLeft size={18} /></button>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</h1>
              <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                {stats.total} tasks · {stats.progress}% complete
              </p>
            </div>
          </div>

          {/* Header right */}
          <div className="project-header-right">
            {/* Search */}
            <div className="search-input-wrapper">
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input placeholder="Search tasks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "8px 12px 8px 32px", color: "#fff", fontSize: 13, outline: "none", width: 220, fontFamily: "inherit" }} />
            </div>
            <button className="btn-orange-sm" style={{ flexShrink: 0 }} onClick={() => { setTitle(""); setDescription(""); setPriority("MEDIUM"); setEditingTicket(null); setShowCreateModal(true); }}>
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ maxWidth: 1440, margin: "12px auto 0", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stats.progress}%`, background: "linear-gradient(90deg,#f97316,#10b981)", borderRadius: 4, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, whiteSpace: "nowrap" }}>
            <span><span style={{ color: "#94a3b8" }}>●</span> {(project.tickets ?? []).filter(t => t.status === "TODO").length} todo</span>
            <span><span style={{ color: "#f97316" }}>●</span> {stats.inProg} active</span>
            <span><span style={{ color: "#10b981" }}>●</span> {stats.done} done</span>
            {stats.urgent > 0 && <span style={{ color: "#ef4444" }}><span>⚡ </span>{stats.urgent} urgent</span>}
          </div>
        </div>
      </div>

      {/* ══════════ FILTER BAR ══════════ */}
      <div className="project-filter-bar">
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginRight: 4 }}>Priority:</span>
        {(["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
          <button key={p} className={`filter-chip${filterPriority === p ? " active" : ""}`}
            onClick={() => setFilterPriority(p)}
            style={p !== "ALL" ? { ...(filterPriority === p ? {} : { color: PRIORITY_META[p as Priority]?.color + "90" }) } : {}}>
            {p === "ALL" ? "All" : PRIORITY_META[p as Priority].label}
          </button>
        ))}
      </div>

      {/* ══════════ KANBAN BOARD ══════════ */}
      <div className="kanban-page-wrapper">
        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {(["TODO", "IN_PROGRESS", "DONE"] as const).map(status => (
              <KanbanColumn key={status} id={status} tickets={filter(project.tickets ?? [], status)}
                onEdit={openEditModal} onDelete={t => setShowDeleteModal(t)} onMove={moveTicket}
                projectId={projectId} userEmail={user?.email || ""} onAdded={reloadProject} />
            ))}
          </div>

          <DragOverlay>
            {activeId && activeTicket ? (
              <div style={{
                padding: 14, background: "rgba(20,20,20,0.95)",
                border: "1px solid rgba(249,115,22,0.4)", borderRadius: 14,
                boxShadow: "0 20px 48px rgba(0,0,0,0.6), 0 0 24px rgba(249,115,22,0.15)",
                transform: "rotate(1.5deg)",
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#fff" }}>{activeTicket.title}</h4>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Notifications */}
        <div style={{ marginTop: 40, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Activity size={16} color="#f97316" />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Recent Activity</span>
          </div>
          <Notifications projectId={projectId} />
        </div>
      </div>

      {/* ══════════ CREATE / EDIT MODAL ══════════ */}
      {(showCreateModal || editingTicket) && (
        <div className="modal-glass" onClick={() => { setShowCreateModal(false); setEditingTicket(null); }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowCreateModal(false); setEditingTicket(null); }} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><X size={15} /></button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: editingTicket ? "rgba(99,102,241,0.15)" : "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {editingTicket ? <Edit2 size={18} color="#818cf8" /> : <Plus size={18} color="#f97316" />}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                {editingTicket ? "Edit Task" : "New Task"}
              </h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 24 }}>
              {editingTicket ? "Update task details below." : "Add a new task to your board."}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Title *</label>
              <input className="board-input" placeholder="e.g. Implement auth flow" value={title} onChange={e => setTitle(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && (editingTicket ? updateTicket() : createTicket())} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</label>
              <textarea className="board-input" placeholder="Add more context (optional)…" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "vertical", minHeight: 80 }} />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Priority</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map(p => {
                  const pm = PRIORITY_META[p];
                  const active = priority === p;
                  return (
                    <button key={p} className="pri-btn" onClick={() => setPriority(p)}
                      style={{ color: active ? pm.color : "rgba(255,255,255,0.4)", background: active ? pm.bg : "rgba(255,255,255,0.04)", borderColor: active ? pm.color + "50" : "rgba(255,255,255,0.08)" }}>
                      <Flag size={11} />{pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreateModal(false); setEditingTicket(null); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button className="btn-orange-sm" style={{ padding: "10px 20px", fontSize: 14 }} onClick={editingTicket ? updateTicket : createTicket} disabled={!title.trim()}>
                {editingTicket ? "Save Changes" : <><Plus size={15} /> Create Task</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DELETE MODAL ══════════ */}
      {showDeleteModal && (
        <div className="modal-glass" onClick={() => setShowDeleteModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={22} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Delete Task?</h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              You're about to delete <strong style={{ color: "#fff" }}>"{showDeleteModal.title}"</strong>. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteModal(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => deleteTicket(showDeleteModal.id)} style={{ background: "#ef4444", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit" }}>Delete Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
