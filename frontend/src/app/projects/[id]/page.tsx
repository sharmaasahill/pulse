"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { getSocket, joinProject } from "@/lib/socket";
import { useAuth } from "@/store/useAuth";
import { Notifications } from "./notifications";
import { ShareModal } from "@/app/components/ShareModal";
import { MembersPanel } from "@/app/components/MembersPanel";
import { CommentsSection } from "@/app/components/CommentsSection";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, ArrowRight, Plus, Search, Edit2, Trash2, X, AlertTriangle,
  Share2, Activity, Circle, CircleDot, CheckCircle2,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Person = { id: string; email: string; name?: string; username?: string };

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority?: Priority;
  authorId?: string;
  author?: Person;
  assigneeId?: string | null;
  assignee?: Person | null;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  updatedAt?: string;
  tickets?: Ticket[];
  members?: Array<{ userId: string; role: string; user?: Person }>;
  owner?: Person;
}

/* ── Tokens for this screen ───────────────────────────────────── */

const PRIORITY: Record<Priority, { label: string; fg: string; bg: string }> = {
  LOW:    { label: "Low",    fg: "var(--ink-tertiary)", bg: "var(--surface-sunken)" },
  MEDIUM: { label: "Medium", fg: "var(--warning)",      bg: "var(--warning-tint)" },
  HIGH:   { label: "High",   fg: "var(--accent-strong)", bg: "var(--accent-tint)" },
  URGENT: { label: "Urgent", fg: "var(--danger)",       bg: "var(--danger-tint)" },
};

const COLUMN: Record<Status, { label: string; rule: string; icon: React.ReactNode }> = {
  TODO:        { label: "To Do",       rule: "var(--ink-faint)", icon: <Circle size={13} /> },
  IN_PROGRESS: { label: "In Progress", rule: "var(--accent)",    icon: <CircleDot size={13} /> },
  DONE:        { label: "Done",        rule: "var(--success)",   icon: <CheckCircle2 size={13} /> },
};

const STATUSES: Status[] = ["TODO", "IN_PROGRESS", "DONE"];

function label(p?: Person | null) {
  if (!p) return "";
  return p.name || p.username || p.email.split("@")[0];
}
function initialsOf(p?: Person | null) {
  const n = label(p);
  return n ? n.slice(0, 2).toUpperCase() : "?";
}

/* ═══════════════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════════════ */

function TicketCard({
  ticket, canEdit, onEdit, onDelete, onMove,
}: {
  ticket: Ticket; canEdit: boolean;
  onEdit: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
  onMove: (id: string, s: Status) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id, disabled: !canEdit });
  const p = PRIORITY[ticket.priority ?? "MEDIUM"];

  // Stop pointer events on interactive children from starting a drag or
  // bubbling up into the card's open-for-edit click.
  const swallow = (e: React.SyntheticEvent) => e.stopPropagation();

  // A click still fires on mouse-up at the end of a drag. Without this the
  // edit sheet would open every time you dropped a card, so we record where the
  // press started and treat anything that travelled as a drag, not a click.
  const pressAt = useRef<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!canEdit) return;
    const start = pressAt.current;
    pressAt.current = null;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
    onEdit(ticket);
  };

  return (
    <article
      ref={setNodeRef}
      className="tk"
      data-dragging={isDragging}
      data-draggable={canEdit}
      // The WHOLE card is the drag target. MouseSensor has a 6px activation
      // distance, so a stationary press is still a click, not a drag.
      // `listeners` uses onMouseDown / onTouchStart, so our onPointerDown below
      // does not collide with it.
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      onPointerDown={(e) => { pressAt.current = { x: e.clientX, y: e.clientY }; }}
      onClick={handleClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {canEdit && (
        <div className="tk-act" onPointerDown={swallow} onClick={swallow}>
          <button className="tk-btn" onClick={() => onEdit(ticket)} aria-label="Edit task"><Edit2 size={11} /></button>
          <button className="tk-btn" data-danger onClick={() => onDelete(ticket)} aria-label="Delete task"><Trash2 size={11} /></button>
        </div>
      )}

      <div className="tk-body">
        <span className="badge" style={{ color: p.fg, background: p.bg, fontSize: 10.5, marginBottom: 8 }}>
          {p.label}
        </span>

        <h4 style={{ fontSize: 13.5, fontWeight: 580, lineHeight: 1.45, color: "var(--ink)", margin: "0 0 6px" }}>
          {ticket.title}
        </h4>

        {ticket.description && (
          <p
            style={{
              fontSize: 12.5, color: "var(--ink-tertiary)", lineHeight: 1.5, margin: "0 0 10px",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {ticket.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {ticket.author && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }} title={`Created by ${label(ticket.author)}`}>
              <span className="tk-av" data-tone="author">{initialsOf(ticket.author)}</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 92 }}>
                {label(ticket.author)}
              </span>
            </span>
          )}
          {ticket.assignee && (
            <span
              title={`Assigned to ${label(ticket.assignee)}`}
              style={{
                marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                background: "var(--success-tint)", padding: "2px 8px 2px 2px", borderRadius: 99, flexShrink: 0,
              }}
            >
              <span className="tk-av" data-tone="assignee">{initialsOf(ticket.assignee)}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--success)", maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label(ticket.assignee)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Touch-friendly column moves — dragging is awkward on small screens. */}
      {canEdit && (
        <div className="mobile-move-actions tk-move" onPointerDown={swallow} onClick={swallow}>
          {ticket.status !== "TODO" && (
            <button onClick={() => onMove(ticket.id, ticket.status === "DONE" ? "IN_PROGRESS" : "TODO")}>
              <ArrowLeft size={13} /> Back
            </button>
          )}
          {ticket.status !== "DONE" && (
            <button data-next onClick={() => onMove(ticket.id, ticket.status === "TODO" ? "IN_PROGRESS" : "DONE")}>
              Next <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK ADD
   ═══════════════════════════════════════════════════════════════ */

function QuickAdd({ status, projectId, onAdded }: { status: Status; projectId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await api.post("/tickets", { projectId, title: value.trim(), status });
      setValue(""); setOpen(false); onAdded();
    } catch { /* surfaced by the board reload */ }
    finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button className="qa-open" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add task
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 7 }}>
      <input
        className="input"
        autoFocus
        value={value}
        placeholder="Task title…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
        style={{ fontSize: 13.5, padding: "9px 11px" }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-accent" onClick={submit} disabled={busy || !value.trim()} style={{ flex: 1 }}>
          {busy ? "Adding…" : "Add"}
        </button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setValue(""); }} style={{ paddingInline: 10 }} aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COLUMN
   ═══════════════════════════════════════════════════════════════ */

function Column({
  status, tickets, canEdit, projectId, onAdded, onEdit, onDelete, onMove,
}: {
  status: Status; tickets: Ticket[]; canEdit: boolean; projectId: string;
  onAdded: () => void;
  onEdit: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
  onMove: (id: string, s: Status) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN[status];

  return (
    <section ref={setNodeRef} className="col" data-over={isOver}>
      <header className="col-head" style={{ borderBottomColor: meta.rule }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-secondary)" }}>
          <span style={{ color: meta.rule === "var(--ink-faint)" ? "var(--ink-tertiary)" : meta.rule, display: "flex" }}>
            {meta.icon}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {meta.label}
          </span>
        </span>
        <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-faint)" }}>
          {tickets.length}
        </span>
      </header>

      <div className="col-body">
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((t) => (
            <TicketCard
              key={t.id} ticket={t} canEdit={canEdit}
              onEdit={onEdit} onDelete={onDelete} onMove={onMove}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <p style={{ padding: "26px 8px", textAlign: "center", fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.6 }}>
            {isOver ? "Drop here" : "Nothing here"}
          </p>
        )}
      </div>

      {canEdit && (
        <footer style={{ paddingTop: 10 }}>
          <QuickAdd status={status} projectId={projectId} onAdded={onAdded} />
        </footer>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Task form
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleting, setDeleting] = useState<Ticket | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const booted = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } })
  );

  function reload() {
    return api.get(`/projects/${projectId}`)
      .then((r) => { setProject(r.data); setNotFound(false); })
      .catch((err: any) => {
        if (err?.response?.status === 401) { logout(); router.push("/"); return; }
        if (err?.response?.status === 403 || err?.response?.status === 404) setNotFound(true);
      });
  }

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const raw = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
    let stored: string | null = null;
    try { if (raw) stored = JSON.parse(raw)?.state?.token ?? null; } catch { /* ignore */ }
    const token = useAuth.getState().token ?? stored;
    if (!token) { router.push("/"); return; }

    setAuthToken(token);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const socket = getSocket();
    const join = () => joinProject(projectId, user?.id);
    if (socket.connected) join(); else socket.on("connect", join);

    const onTicket = (payload: { type: string; ticket?: Ticket }) => {
      setProject((prev) => {
        if (!prev) return prev;
        const list = prev.tickets ?? [];
        const t = payload.ticket;
        switch (payload.type) {
          case "created":
            return t && !list.some((x) => x.id === t.id) ? { ...prev, tickets: [t, ...list] } : prev;
          case "updated":
            return t ? { ...prev, tickets: list.map((x) => (x.id === t.id ? t : x)) } : prev;
          case "deleted":
            return t ? { ...prev, tickets: list.filter((x) => x.id !== t.id) } : prev;
          default:
            return prev;
        }
      });
    };

    socket.on("ticket:updated", onTicket);
    return () => { socket.off("connect", join); socket.off("ticket:updated", onTicket); };
  }, [projectId, user?.id]);

  /* ── Derived ──────────────────────────────────────────────── */

  const role = useMemo(() => {
    if (!project) return "VIEWER";
    if (project.owner?.id === user?.id) return "OWNER";
    return project.members?.find((m) => m.userId === user?.id)?.role ?? "VIEWER";
  }, [project, user?.id]);

  const canEdit = role === "OWNER" || role === "EDITOR";

  const stats = useMemo(() => {
    const all = project?.tickets ?? [];
    const done = all.filter((t) => t.status === "DONE").length;
    return {
      total: all.length,
      done,
      active: all.filter((t) => t.status === "IN_PROGRESS").length,
      urgent: all.filter((t) => t.priority === "URGENT").length,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
    };
  }, [project]);

  const byStatus = (s: Status) => {
    const q = query.trim().toLowerCase();
    return (project?.tickets ?? []).filter((t) => {
      if (t.status !== s) return false;
      if (priorityFilter !== "ALL" && (t.priority ?? "MEDIUM") !== priorityFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    });
  };

  const dragging = (project?.tickets ?? []).find((t) => t.id === activeId) ?? null;

  /* ── Mutations ────────────────────────────────────────────── */

  function openCreate() {
    setEditing(null); setTitle(""); setDescription("");
    setPriority("MEDIUM"); setAssigneeId(""); setCreating(true);
  }

  function openEdit(t: Ticket) {
    setCreating(false); setEditing(t); setTitle(t.title);
    setDescription(t.description ?? ""); setPriority(t.priority ?? "MEDIUM");
    setAssigneeId(t.assigneeId ?? "");
  }

  function closeForm() { setCreating(false); setEditing(null); }

  async function saveTask() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await api.patch(`/tickets/${editing.id}`, {
          title: title.trim(),
          description: description.trim(),
          priority,
          assigneeId: assigneeId || null,
        });
      } else {
        await api.post("/tickets", {
          projectId,
          title: title.trim(),
          description: description.trim(),
          priority,
          assigneeId: assigneeId || undefined,
        });
      }
      closeForm();
      await reload();
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  async function removeTask(id: string) {
    setBusy(true);
    try {
      await api.delete(`/tickets/${id}`);
      setProject((p) => (p ? { ...p, tickets: (p.tickets ?? []).filter((t) => t.id !== id) } : p));
      setDeleting(null);
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  async function move(id: string, status: Status) {
    const current = (project?.tickets ?? []).find((t) => t.id === id);
    if (!current || current.status === status) return;

    // Optimistic — the socket echo confirms, and a failure reloads the truth.
    setProject((p) => (p ? { ...p, tickets: (p.tickets ?? []).map((t) => (t.id === id ? { ...t, status } : t)) } : p));
    try { await api.patch(`/tickets/${id}`, { status }); }
    catch { reload(); }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    let target = String(over.id);
    if (!STATUSES.includes(target as Status)) {
      const overTicket = (project?.tickets ?? []).find((t) => t.id === target);
      if (!overTicket) return;
      target = overTicket.status;
    }
    move(String(active.id), target as Status);
  }

  /* ── Render ───────────────────────────────────────────────── */

  if (loading) return <BoardSkeleton />;

  if (notFound) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <h1 className="display" style={{ fontSize: 30, marginBottom: 10 }}>Board unavailable</h1>
          <p style={{ color: "var(--ink-secondary)", marginBottom: 22, lineHeight: 1.65 }}>
            This board either doesn&apos;t exist or you no longer have access to it.
          </p>
          <button className="btn btn-accent" onClick={() => router.push("/projects")}>
            <ArrowLeft size={15} /> Back to boards
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const members = project.members ?? [];

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        /* ── Column ─────────────────────────────────── */
        /* All three columns are the SAME fixed height regardless of how many
           tasks they hold. When a column fills past that height, its body
           scrolls internally instead of the column growing taller. */
        .col {
          display: flex; flex-direction: column;
          background: var(--surface-sunken);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 14px;
          height: calc(100vh - 258px);
          min-height: 380px;
          transition: background var(--t-base) linear, border-color var(--t-base) linear;
        }
        .col[data-over="true"] { background: var(--accent-tint); border-color: var(--accent); }
        .col-head {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 9px; margin-bottom: 12px;
          border-bottom: 2px solid; flex-shrink: 0;
        }
        /* flex:1 + min-height:0 lets this region shrink inside the fixed column
           so overflow-y can actually take effect. The footer (quick-add) stays
           pinned below it. */
        .col-body {
          display: flex; flex-direction: column; gap: 9px;
          overflow-y: auto; overflow-x: hidden;
          flex: 1; min-height: 0;
          margin-right: -6px; padding-right: 6px;
        }
        .col > footer { flex-shrink: 0; }
        /* On phones the board scrolls horizontally, so a viewport-tall column
           would be awkward — cap it and let the page scroll instead. */
        @media (max-width: 768px) {
          .col { height: auto; max-height: 74vh; min-height: 300px; }
        }

        /* ── Card ───────────────────────────────────── */
        .tk {
          position: relative; background: var(--surface); flex-shrink: 0;
          border: 1px solid var(--line); border-radius: var(--r-md);
          box-shadow: var(--shadow-xs);
          transition: box-shadow var(--t-base) var(--ease-out-quart),
                      border-color var(--t-base) linear,
                      transform var(--t-base) var(--ease-out-quart);
        }
        .tk:hover { box-shadow: var(--shadow-md); border-color: var(--line-strong); }
        .tk:hover .tk-act { opacity: 1; }
        /* Grab affordance on the whole card, since the whole card drags. */
        .tk[data-draggable="true"] { cursor: grab; touch-action: manipulation; }
        .tk[data-dragging="true"] { cursor: grabbing; }
        .tk:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .tk-body { padding: 12px 12px 11px; }
        .tk-act {
          position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 2;
          opacity: 0; transition: opacity var(--t-fast) linear;
        }
        .tk-btn {
          display: grid; place-items: center; width: 23px; height: 23px;
          background: var(--surface); border: 1px solid var(--line-strong);
          border-radius: var(--r-xs); color: var(--ink-tertiary); cursor: pointer;
          transition: color var(--t-fast) linear, border-color var(--t-fast) linear;
        }
        .tk-btn:hover { color: var(--ink); }
        .tk-btn[data-danger]:hover { color: var(--danger); border-color: var(--danger); }
        .tk-av {
          width: 19px; height: 19px; border-radius: 50%; flex-shrink: 0;
          display: grid; place-items: center; font-size: 8.5px; font-weight: 700; color: #fff;
        }
        .tk-av[data-tone="author"] { background: var(--accent-gradient); }
        .tk-av[data-tone="assignee"] { background: linear-gradient(135deg,#10b981,#047857); }

        .tk-move { display: none; gap: 7px; padding: 0 12px 11px; }
        .tk-move button {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 7px; font-size: 12px; font-weight: 600; cursor: pointer;
          background: var(--surface-sunken); border: 1px solid var(--line);
          border-radius: var(--r-xs); color: var(--ink-secondary);
        }
        .tk-move button[data-next] { background: var(--accent-tint); border-color: transparent; color: var(--accent-strong); }

        /* ── Quick add ──────────────────────────────── */
        .qa-open {
          width: 100%; display: flex; align-items: center; gap: 7px;
          padding: 9px 11px; font-size: 13px; font-weight: 550; cursor: pointer;
          background: transparent; color: var(--ink-tertiary);
          border: 1px dashed var(--line-strong); border-radius: var(--r-sm);
          transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
        }
        .qa-open:hover { background: var(--surface); color: var(--accent-strong); border-color: var(--accent); }

        /* ── Header bits ────────────────────────────── */
        .bh {
          position: sticky; top: var(--navbar-height); z-index: 40;
          background: rgba(251,250,248,0.88);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--line);
        }
        .chip {
          padding: 5px 12px; border-radius: var(--r-full); cursor: pointer;
          font-size: 12px; font-weight: 600; background: transparent;
          border: 1px solid var(--line-strong); color: var(--ink-tertiary);
          transition: background var(--t-fast) linear, color var(--t-fast) linear, border-color var(--t-fast) linear;
        }
        .chip:hover { color: var(--ink); }
        .chip[data-on="true"] { background: var(--accent-tint); border-color: var(--accent); color: var(--accent-strong); }

        .mstack { display: flex; }
        .mstack > span { margin-left: -7px; border: 2px solid var(--canvas); }
        .mstack > span:first-child { margin-left: 0; }
      `}</style>

      {/* ── Header ── */}
      <div className="bh">
        <div className="project-header-section">
          <div className="project-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
              <button
                onClick={() => router.push("/projects")}
                className="btn-icon"
                aria-label="Back to boards"
                style={{ border: "1px solid var(--line)", flexShrink: 0 }}
              >
                <ArrowLeft size={17} />
              </button>
              <div style={{ minWidth: 0 }}>
                <h1
                  className="display"
                  style={{ fontSize: "clamp(1.35rem,2.6vw,1.85rem)", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {project.name}
                </h1>
                <p className="num" style={{ fontSize: 12.5, color: "var(--ink-tertiary)", margin: "2px 0 0" }}>
                  {stats.total} task{stats.total === 1 ? "" : "s"} · {stats.pct}% complete
                  {role !== "OWNER" && <> · <span style={{ color: "var(--ink-secondary)" }}>{role}</span></>}
                </p>
              </div>
            </div>

            <div className="project-header-right">
              <button
                onClick={() => setMembersOpen(true)}
                className="btn btn-secondary"
                style={{ paddingLeft: 7, gap: 8 }}
              >
                <span className="mstack" aria-hidden>
                  {members.slice(0, 3).map((m) => (
                    <span
                      key={m.userId}
                      style={{
                        width: 21, height: 21, borderRadius: "50%", display: "grid", placeItems: "center",
                        background: "var(--accent-gradient)", color: "#fff", fontSize: 8.5, fontWeight: 700,
                      }}
                    >
                      {initialsOf(m.user)}
                    </span>
                  ))}
                </span>
                {members.length} member{members.length === 1 ? "" : "s"}
              </button>

              {role === "OWNER" && (
                <button onClick={() => setShareOpen(true)} className="btn btn-secondary">
                  <Share2 size={14} /> Share
                </button>
              )}

              <div className="search-input-wrapper">
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)", pointerEvents: "none" }} />
                <input
                  className="input"
                  placeholder="Search tasks…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search tasks"
                  style={{ width: 208, paddingLeft: 34, fontSize: 13, padding: "8px 12px 8px 34px" }}
                />
              </div>

              {canEdit && (
                <button className="btn btn-accent" onClick={openCreate} style={{ flexShrink: 0 }}>
                  <Plus size={15} /> Add task
                </button>
              )}
            </div>
          </div>

          {/* Progress line */}
          <div style={{ maxWidth: 1420, margin: "14px auto 0", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ flex: 1, height: 3, background: "var(--surface-sunken)", borderRadius: 99, overflow: "hidden" }}>
              <span
                style={{
                  display: "block", height: "100%", width: `${stats.pct}%`, borderRadius: 99,
                  background: stats.pct === 100 ? "var(--success)" : "var(--accent)",
                  transition: "width var(--t-slower) var(--ease-out-expo)",
                }}
              />
            </span>
            <span className="num" style={{ display: "flex", gap: 15, fontSize: 12, color: "var(--ink-tertiary)", whiteSpace: "nowrap" }}>
              <span>{byStatus("TODO").length} to do</span>
              <span>{stats.active} active</span>
              <span>{stats.done} done</span>
              {stats.urgent > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}>{stats.urgent} urgent</span>}
            </span>
          </div>
        </div>

        {/* Priority filter */}
        <div className="project-filter-bar">
          <span className="eyebrow" style={{ fontSize: 10, marginRight: 4 }}>Priority</span>
          {(["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
            <button
              key={p}
              className="chip"
              data-on={priorityFilter === p}
              onClick={() => setPriorityFilter(p)}
              aria-pressed={priorityFilter === p}
            >
              {p === "ALL" ? "All" : PRIORITY[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="kanban-page-wrapper">
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="kanban-board">
            {STATUSES.map((s) => (
              <Column
                key={s}
                status={s}
                tickets={byStatus(s)}
                canEdit={canEdit}
                projectId={projectId}
                onAdded={reload}
                onEdit={openEdit}
                onDelete={setDeleting}
                onMove={move}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
            {dragging && (
              <div
                style={{
                  background: "var(--surface)", border: "1px solid var(--accent)",
                  borderRadius: "var(--r-md)", padding: "12px 13px",
                  boxShadow: "var(--shadow-xl)", transform: "rotate(-1.4deg)", cursor: "grabbing",
                }}
              >
                <span className="badge" style={{ ...{ color: PRIORITY[dragging.priority ?? "MEDIUM"].fg, background: PRIORITY[dragging.priority ?? "MEDIUM"].bg }, fontSize: 10.5, marginBottom: 6 }}>
                  {PRIORITY[dragging.priority ?? "MEDIUM"].label}
                </span>
                <h4 style={{ fontSize: 13.5, fontWeight: 580, margin: 0, color: "var(--ink)" }}>{dragging.title}</h4>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* ── Activity ── */}
        <section style={{ marginTop: 40, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Activity size={15} style={{ color: "var(--accent-strong)" }} />
            <h2 style={{ fontSize: 14, fontWeight: 650, letterSpacing: "-0.01em" }}>Recent activity</h2>
          </div>
          <Notifications projectId={projectId} />
        </section>
      </div>

      {/* ── Task form ── */}
      {(creating || editing) && (
        <Sheet
          title={editing ? "Edit task" : "New task"}
          icon={editing ? <Edit2 size={15} /> : <Plus size={16} />}
          onClose={closeForm}
        >
          <Row label="Title">
            <input
              className="input" autoFocus value={title}
              placeholder="What needs to happen?"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) saveTask(); }}
            />
          </Row>

          <Row label="Description" hint="Optional">
            <textarea
              className="input" rows={3} value={description}
              placeholder="Add context…"
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: "vertical", minHeight: 76 }}
            />
          </Row>

          <Row label="Priority">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => {
                const on = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    aria-pressed={on}
                    style={{
                      flex: 1, minWidth: 72, padding: "8px 6px", cursor: "pointer",
                      fontSize: 12.5, fontWeight: 600, borderRadius: "var(--r-xs)",
                      background: on ? PRIORITY[p].bg : "var(--surface)",
                      color: on ? PRIORITY[p].fg : "var(--ink-tertiary)",
                      border: `1px solid ${on ? PRIORITY[p].fg : "var(--line-strong)"}`,
                      transition: "all var(--t-fast) linear",
                    }}
                  >
                    {PRIORITY[p].label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Assignee" hint="Optional">
            <select
              className="input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {label(m.user) || m.userId}{m.userId === user?.id ? " (you)" : ""}
                </option>
              ))}
            </select>
          </Row>

          {editing && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, paddingTop: 18 }}>
              <CommentsSection ticketId={editing.id} projectId={projectId} />
            </div>
          )}

          <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button className="btn btn-accent" onClick={saveTask} disabled={busy || !title.trim()}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create task"}
            </button>
          </div>
        </Sheet>
      )}

      {/* ── Delete ── */}
      {deleting && (
        <Sheet title="Delete this task?" icon={<AlertTriangle size={15} />} tone="danger" onClose={() => setDeleting(null)} compact>
          <p style={{ color: "var(--ink-secondary)", fontSize: 14, lineHeight: 1.65 }}>
            <strong style={{ color: "var(--ink)" }}>{deleting.title}</strong> and its comments
            will be permanently removed.
          </p>
          <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => removeTask(deleting.id)} disabled={busy}>
              {busy ? "Deleting…" : "Delete task"}
            </button>
          </div>
        </Sheet>
      )}

      {shareOpen && <ShareModal projectId={projectId} projectName={project.name} onClose={() => setShareOpen(false)} />}
      {membersOpen && <MembersPanel projectId={projectId} onClose={() => setMembersOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHELL PIECES
   ═══════════════════════════════════════════════════════════════ */

function Sheet({
  title, icon, tone = "default", compact, onClose, children,
}: {
  title: string; icon?: React.ReactNode; tone?: "default" | "danger";
  compact?: boolean; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 22,
        background: "var(--overlay)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        animation: "fade-in var(--t-base) var(--ease-out-quart)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: compact ? 412 : 512,
          maxHeight: "88vh", overflowY: "auto",
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-xl)", padding: 26,
          animation: "scale-in var(--t-slow) var(--ease-spring)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {icon && (
            <span
              style={{
                width: 32, height: 32, borderRadius: "var(--r-xs)", display: "grid", placeItems: "center", flexShrink: 0,
                background: tone === "danger" ? "var(--danger-tint)" : "var(--accent-tint)",
                color: tone === "danger" ? "var(--danger)" : "var(--accent-strong)",
              }}
            >
              {icon}
            </span>
          )}
          <h2 style={{ fontSize: 17.5, fontWeight: 650, letterSpacing: "-0.02em" }}>{title}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close" style={{ marginLeft: "auto", width: 30, height: 30 }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span className="eyebrow" style={{ fontSize: 10.5 }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div>
      <div className="project-header-section" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="project-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--r-sm)" }} />
            <div>
              <span className="skeleton" style={{ display: "block", width: 200, height: 24, marginBottom: 7 }} />
              <span className="skeleton skeleton-text" style={{ display: "block", width: 130 }} />
            </div>
          </div>
        </div>
      </div>
      <div className="kanban-page-wrapper">
        <div className="kanban-board">
          {[0, 1, 2].map((c) => (
            <div key={c} style={{ background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14 }}>
              <span className="skeleton skeleton-text" style={{ display: "block", width: 88, marginBottom: 16 }} />
              <div style={{ display: "grid", gap: 9 }}>
                {Array.from({ length: 3 - c === 0 ? 2 : 3 - c }).map((_, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 12 }}>
                    <span className="skeleton" style={{ display: "block", width: 52, height: 17, borderRadius: 99, marginBottom: 10 }} />
                    <span className="skeleton skeleton-text" style={{ display: "block", width: "88%", marginBottom: 7 }} />
                    <span className="skeleton skeleton-text" style={{ display: "block", width: "62%" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
