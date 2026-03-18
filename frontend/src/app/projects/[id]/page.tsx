"use client";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getSocket, joinProject } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import { useUi } from "@/store/useUi";
import { useAuth } from "@/store/useAuth";
import { Notifications } from "./notifications";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Search, Plus, GripVertical, Edit2, Trash2, ArrowLeft, Shield } from "lucide-react";

interface Project { id: string; name: string; tickets?: Ticket[]; }
interface Ticket {
  id: string; title: string; authorId?: string;
  author?: { id: string; email: string };
  status: "TODO" | "IN_PROGRESS" | "DONE"; description?: string;
}

/* ─── Draggable Ticket ─── */
function DraggableTicket({ ticket, superOn, onEdit, onDelete }: {
  ticket: Ticket; superOn: boolean;
  onEdit: (t: Ticket) => void; onDelete: (t: Ticket) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.5 : 1, cursor: "grab",
        background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
        padding: "14px", marginBottom: "8px",
        border: "1px solid var(--border-primary)",
        position: "relative", boxShadow: "var(--shadow-xs)",
      }}
      {...attributes} {...listeners}
      className="ticket-card"
    >
      {/* Actions */}
      <div style={{
        position: "absolute", top: "8px", right: "8px",
        display: "flex", gap: "4px", opacity: 0, transition: "opacity 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}
      >
        <button onClick={e => { e.stopPropagation(); onEdit(ticket); }} className="btn-icon" style={{ width: "24px", height: "24px", padding: "4px" }}>
          <Edit2 size={12} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(ticket); }} className="btn-icon" style={{ width: "24px", height: "24px", padding: "4px", color: "var(--danger)" }}>
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ paddingRight: "50px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px", color: "var(--text-primary)", lineHeight: 1.4 }}>
          {ticket.title}
        </h4>
        {ticket.description && (
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
            {ticket.description}
          </p>
        )}
      </div>

      {superOn && (
        <div style={{
          fontSize: "11px", color: "var(--text-tertiary)",
          borderTop: "1px solid var(--border-secondary)",
          paddingTop: "8px", marginTop: "10px",
        }}>
          Created by: {ticket.author?.email ?? "System"}
        </div>
      )}
    </div>
  );
}

/* ─── Droppable Column ─── */
function DroppableColumn({ id, title, tickets, superOn, className, onEdit, onDelete }: {
  id: string; title: string; tickets: Ticket[]; superOn: boolean;
  className: string; onEdit: (t: Ticket) => void; onDelete: (t: Ticket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${className}`}
      style={{
        background: isOver ? "var(--bg-hover)" : "var(--bg-tertiary)",
        borderRadius: "var(--radius-lg)", padding: "16px", minHeight: "400px",
        border: `1px solid ${isOver ? "var(--accent-primary)" : "var(--border-secondary)"}`,
        transition: "all var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", margin: 0, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h3>
        <span className="badge badge-muted" style={{ fontSize: "11px" }}>
          {tickets.length}
        </span>
      </div>
      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tickets.map(t => (
          <DraggableTicket key={t.id} ticket={t} superOn={superOn} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </SortableContext>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, logout, user } = useAuth();
  const { superOn, toggleSuper } = useUi();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (!token) { router.push("/"); return; }
    setAuthToken(token);
    api.get(`/projects/${projectId}`).then(r => setProject(r.data)).catch(() => logout());

    const socket = getSocket();
    if (socket.connected) { joinProject(projectId, user?.email || "anonymous"); }
    else { socket.on("connect", () => { joinProject(projectId, user?.email || "anonymous"); }); }

    socket.on("ticket:updated", (payload: { type: string; ticket: Ticket }) => {
      setProject((prev: Project | null) => {
        if (!prev) return prev;
        if (payload.type === "created") return { ...prev, tickets: [payload.ticket, ...(prev.tickets ?? [])] };
        if (payload.type === "updated") return { ...prev, tickets: (prev.tickets ?? []).map((t: Ticket) => t.id === payload.ticket.id ? payload.ticket : t) };
        return prev;
      });
    });

    return () => { socket.off("ticket:updated"); socket.off("reconnect"); };
  }, [projectId, token, logout, router, user?.email]);

  useEffect(() => { if (token) setAuthToken(token); }, [token]);

  async function createTicket() {
    if (!title) return;
    try {
      await api.post("/tickets", { projectId, title, description, authorEmail: user?.email });
      setTitle(""); setDescription("");
    } catch { /* ignore */ }
  }

  async function updateTicket() {
    if (!editingTicket || !title) return;
    try {
      await api.patch(`/tickets/${editingTicket.id}`, { title, description });
      setEditingTicket(null); setTitle(""); setDescription(""); setShowEditModal(false);
    } catch { /* ignore */ }
  }

  async function deleteTicket(ticketId: string) {
    try { await api.delete(`/tickets/${ticketId}`); setShowDeleteModal(null); }
    catch { /* ignore */ }
  }

  function openEditModal(ticket: Ticket) {
    setEditingTicket(ticket); setTitle(ticket.title); setDescription(ticket.description || ""); setShowEditModal(true);
  }

  function filteredTickets(tickets: Ticket[], status: string) {
    return tickets.filter(t => {
      const matchStatus = t.status === status;
      const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !project) return;
    const ticket = project.tickets?.find(t => t.id === (active.id as string));
    const newStatus = over.id as "TODO" | "IN_PROGRESS" | "DONE";
    if (!ticket || ticket.status === newStatus) return;
    try { await api.patch(`/tickets/${ticket.id}`, { status: newStatus }); }
    catch { /* ignore */ }
  }

  if (!project) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - var(--navbar-height))" }}>
      {/* Board Header */}
      <div style={{
        padding: "24px 32px",
        borderBottom: "1px solid var(--border-primary)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button onClick={() => router.push("/projects")} className="btn-icon" style={{ width: "32px", height: "32px" }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" }}>
                {project.name}
              </h1>
              <p style={{ margin: "2px 0 0", color: "var(--text-tertiary)", fontSize: "13px" }}>
                {(project.tickets ?? []).length} ticket{(project.tickets ?? []).length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => { if (!superOn) { const pwd = prompt("Enter super-user password"); toggleSuper(pwd ?? undefined); } else toggleSuper(); }}
              className={superOn ? "btn" : "btn-secondary"}
              style={{ padding: "8px 14px", fontSize: "13px", gap: "6px" }}
            >
              <Shield size={14} />
              {superOn ? "Super On" : "Super Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {/* Add Ticket + Search */}
        <div style={{
          marginBottom: "24px", background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)", borderRadius: "var(--radius-lg)",
          padding: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
              Add New Ticket
            </h2>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input
                className="input"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "200px", paddingLeft: "32px", fontSize: "13px" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input className="input" placeholder="Ticket title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createTicket()} />
            <textarea className="input" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ resize: "vertical", minHeight: "52px" }} />
            <button onClick={createTicket} className="btn" style={{ alignSelf: "flex-start", padding: "8px 18px", fontSize: "13px" }}>
              <Plus size={15} /> Add Ticket
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext sensors={sensors} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="grid grid-3">
            <DroppableColumn id="TODO" title="To Do" tickets={filteredTickets(project.tickets ?? [], "TODO")} superOn={superOn} className="todo" onEdit={openEditModal} onDelete={t => setShowDeleteModal(t)} />
            <DroppableColumn id="IN_PROGRESS" title="In Progress" tickets={filteredTickets(project.tickets ?? [], "IN_PROGRESS")} superOn={superOn} className="in-progress" onEdit={openEditModal} onDelete={t => setShowDeleteModal(t)} />
            <DroppableColumn id="DONE" title="Done" tickets={filteredTickets(project.tickets ?? [], "DONE")} superOn={superOn} className="done" onEdit={openEditModal} onDelete={t => setShowDeleteModal(t)} />
          </div>
          <DragOverlay>
            {activeId ? (
              <div style={{
                padding: "14px", background: "var(--bg-secondary)",
                border: "1px solid var(--accent-primary)", borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)", transform: "rotate(3deg)",
              }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  {(project.tickets ?? []).find(t => t.id === activeId)?.title}
                </h4>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Notifications */}
        <div style={{ marginTop: "32px" }}>
          <Notifications projectId={projectId} />
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showEditModal && editingTicket && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px" }}>Edit Ticket</h2>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Description</label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer" }}>Cancel</button>
              <button className="btn" onClick={updateTicket} disabled={!title.trim()} style={{ padding: "10px 20px", fontSize: "14px" }}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px" }}>Delete Ticket</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }}>
              Are you sure you want to delete &ldquo;<strong>{showDeleteModal.title}</strong>&rdquo;? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowDeleteModal(null)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer" }}>Cancel</button>
              <button className="btn-danger" onClick={() => deleteTicket(showDeleteModal.id)} style={{ padding: "10px 16px", fontSize: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: "600" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
