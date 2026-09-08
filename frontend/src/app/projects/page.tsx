"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { useProjects, type ProjectSummary } from "@/store/useProjects";
import { getSocket, joinProject } from "@/lib/socket";
import {
  Plus, Star, Trash2, Pencil, X, AlertTriangle, Rows3, LayoutGrid, Search,
} from "lucide-react";

type SortOption = "recent" | "name" | "tasks" | "created";
type ViewMode = "index" | "cards";

/* Board identity: a single flat colour, not a gradient. */
const TICKS = [
  { id: "ember", c: "#ea580c" },
  { id: "violet", c: "#7c3aed" },
  { id: "indigo", c: "#4338ca" },
  { id: "pine", c: "#047857" },
  { id: "rose", c: "#be123c" },
  { id: "ocean", c: "#0e7490" },
  { id: "amber", c: "#b45309" },
  { id: "plum", c: "#9d174d" },
];

function tickFor(id: string, overrides: Record<string, string>) {
  const picked = overrides[id] && TICKS.find((t) => t.id === overrides[id]);
  return (picked || TICKS[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TICKS.length]).c;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function ProjectsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const projects = useProjects((s) => s.projects);
  const initialLoading = useProjects((s) => s.initialLoading);
  const load = useProjects((s) => s.load);
  const upsert = useProjects((s) => s.upsert);
  const drop = useProjects((s) => s.remove);

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [view, setView] = useState<ViewMode>("index");
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tick, setTick] = useState("ember");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const raw = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
    let stored: string | null = null;
    try { if (raw) stored = JSON.parse(raw)?.state?.token ?? null; } catch { /* ignore */ }
    const token = useAuth.getState().token ?? stored;
    if (!token) { router.push("/"); return; }

    setAuthToken(token);
    setReady(true);
    load().catch((e: any) => {
      if (e?.response?.status === 401) { logout(); router.push("/"); }
    });

    try {
      const s = localStorage.getItem("pulse-starred");
      if (s) setStarredIds(JSON.parse(s));
      const c = localStorage.getItem("pulse-board-colors");
      if (c) setColorMap(JSON.parse(c));
      const v = localStorage.getItem("pulse-view");
      if (v === "cards" || v === "index") setView(v);
    } catch { /* ignore */ }

    const openCreate = () => beginCreate();
    if (localStorage.getItem("pulse:create-board-pending") === "true") {
      localStorage.removeItem("pulse:create-board-pending");
      openCreate();
    }
    window.addEventListener("pulse:create-board", openCreate);
    return () => window.removeEventListener("pulse:create-board", openCreate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    joinProject(undefined as never, user.id);
    const onUpdate = () => { load({ force: true }); };
    socket.on("project:updated", onUpdate);
    return () => { socket.off("project:updated", onUpdate); };
  }, [user?.id, load]);

  function setViewMode(v: ViewMode) {
    setView(v);
    try { localStorage.setItem("pulse-view", v); } catch { /* ignore */ }
  }

  function beginCreate() {
    setName(""); setDescription(""); setTick("ember"); setErr(""); setCreateOpen(true);
  }
  function beginEdit(p: ProjectSummary) {
    setEditing(p); setName(p.name); setDescription(p.description ?? ""); setErr("");
  }

  const rememberColor = useCallback((id: string, colorId: string) => {
    setColorMap((prev) => {
      const next = { ...prev, [id]: colorId };
      try { localStorage.setItem("pulse-board-colors", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/projects", { name: name.trim(), description: description.trim() });
      rememberColor(data.id, tick);
      upsert({ ...data, tickets: [], members: [{ userId: user?.id ?? "", role: "OWNER" }] });
      setCreateOpen(false);
    } catch (e: any) { setErr(e?.response?.data?.message ?? "Could not create the board."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!editing || !name.trim()) return;
    setBusy(true); setErr("");
    try {
      const { data } = await api.patch(`/projects/${editing.id}`, { name: name.trim(), description: description.trim() });
      upsert({ ...editing, ...data });
      setEditing(null);
    } catch (e: any) { setErr(e?.response?.data?.message ?? "Could not save changes."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true); setErr("");
    try {
      await api.delete(`/projects/${deleting.id}`);
      drop(deleting.id);
      setDeleting(null);
    } catch (e: any) { setErr(e?.response?.data?.message ?? "Could not delete the board."); }
    finally { setBusy(false); }
  }

  async function join() {
    if (!code.trim()) return;
    setBusy(true); setErr("");
    try {
      // Route is /invites/join-code — /invites/join/code would match join/:token.
      await api.post("/invites/join-code", { code: code.trim() });
      await load({ force: true });
      setJoinOpen(false); setCode("");
    } catch (e: any) { setErr(e?.response?.data?.message ?? "That code isn't valid or has expired."); }
    finally { setBusy(false); }
  }

  const toggleStar = useCallback((id: string) => {
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("pulse-starred", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    const all = projects.flatMap((p) => p.tickets ?? []);
    const done = all.filter((t) => t.status === "DONE").length;
    return {
      boards: projects.length,
      tasks: all.length,
      active: all.filter((t) => t.status === "IN_PROGRESS").length,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
    };
  }, [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
      : projects;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "tasks": return (b.tickets?.length ?? 0) - (a.tickets?.length ?? 0);
        case "created": return +new Date(b.createdAt) - +new Date(a.createdAt);
        default: return +new Date(b.updatedAt ?? b.createdAt) - +new Date(a.updatedAt ?? a.createdAt);
      }
    });
  }, [projects, query, sortBy]);

  const starred = visible.filter((p) => starredIds.includes(p.id));
  const others = visible.filter((p) => !starredIds.includes(p.id));
  const roleOf = (p: ProjectSummary) => p.members?.find((m) => m.userId === user?.id)?.role ?? "OWNER";

  if (!ready) return null;

  const rowProps = (p: ProjectSummary) => ({
    p,
    color: tickFor(p.id, colorMap),
    role: roleOf(p),
    starred: starredIds.includes(p.id),
    onOpen: () => router.push(`/projects/${p.id}`),
    onStar: () => toggleStar(p.id),
    onEdit: () => beginEdit(p),
    onDelete: () => setDeleting(p),
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .wk { max-width: 1120px; margin: 0 auto; padding: 46px 32px 80px; }

        /* ── Header: type-led. No metric boxes anywhere. ────────── */
        .wk-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; flex-wrap: wrap; }
        .wk-title { font-size: clamp(2.1rem, 4.4vw, 3.1rem); line-height: 1.02; margin: 12px 0 0; }
        .wk-sub { font-size: 14px; color: var(--ink-tertiary); margin: 12px 0 0; }
        .wk-sub b { font-weight: 500; color: var(--ink-secondary); font-variant-numeric: tabular-nums; }

        /* A single reading-style rule carries overall completion. */
        .wk-rule { display: flex; align-items: center; gap: 14px; margin: 30px 0 0; }
        .wk-rule-track { flex: 1; height: 1px; background: var(--line); position: relative; }
        .wk-rule-fill {
          position: absolute; left: 0; top: -1px; height: 3px; background: var(--ink);
          transition: width var(--t-slower) var(--ease-out-expo);
        }
        .wk-rule-pct { font-size: 11.5px; color: var(--ink-tertiary); font-variant-numeric: tabular-nums; }

        /* ── Toolbar: quiet. Search is a ruled field, not a box. ── */
        .wk-bar {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          margin: 36px 0 6px; padding-bottom: 12px; border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }
        .wk-find { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px; max-width: 320px; }
        .wk-find input {
          flex: 1; border: none; background: transparent; outline: none;
          font-size: 14px; color: var(--ink); padding: 4px 0;
        }
        .wk-find input::placeholder { color: var(--ink-faint); }
        .wk-right { display: flex; align-items: center; gap: 14px; }
        .wk-sort {
          border: none; background: transparent; outline: none; cursor: pointer;
          font-size: 13px; color: var(--ink-secondary); padding: 4px 0;
        }
        .wk-toggle { display: flex; gap: 1px; }
        .wk-toggle button {
          display: grid; place-items: center; width: 28px; height: 26px;
          background: transparent; border: 1px solid var(--line); cursor: pointer;
          color: var(--ink-faint); transition: color 110ms linear, background 110ms linear;
        }
        .wk-toggle button:first-child { border-radius: 5px 0 0 5px; }
        .wk-toggle button:last-child { border-radius: 0 5px 5px 0; margin-left: -1px; }
        .wk-toggle button[data-on="true"] { color: var(--ink); background: var(--surface-sunken); }

        /* ── Group label ────────────────────────────────────────── */
        .wk-group {
          display: flex; align-items: center; gap: 12px;
          margin: 28px 0 4px; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint);
        }
        .wk-group::after { content: ""; flex: 1; height: 1px; background: var(--line-faint); }

        /* ── Index row: dense, hairline separated ───────────────── */
        .ix { display: block; }
        .ix-row {
          position: relative;
          display: grid;
          grid-template-columns: 15px minmax(0, 1fr) auto;
          align-items: center; gap: 18px;
          border-bottom: 1px solid var(--line-faint);
          padding: 15px 6px;
          transition: background 110ms linear;
        }
        .ix-row:hover, .ix-row:focus-within { background: var(--surface-hover); }
        .ix-row:hover .ix-tools, .ix-row:focus-within .ix-tools { opacity: 1; }

        /* One real <button> stretched over the whole row handles "open".
           It sits ABOVE the row's text (which is not interactive) and BELOW the
           tool buttons. That keeps the row fully clickable and keyboard
           reachable without ever nesting a <button> inside a <button>. */
        .ix-hit {
          position: absolute; inset: 0; z-index: 1;
          width: 100%; padding: 0; background: none; border: none;
          border-radius: 4px; cursor: pointer;
        }
        .ix-hit:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

        .ix-tick { width: 3px; height: 26px; border-radius: 2px; }
        .ix-name {
          display: flex; align-items: baseline; gap: 10px; min-width: 0;
        }
        .ix-name > span:first-child {
          font-size: 14.5px; font-weight: 500; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ix-desc {
          font-size: 13px; color: var(--ink-faint);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
        }
        /* Fixed-width, right-aligned columns so counts / members / progress /
           tools line up vertically across every row — even when a row has no
           member count. Each cell always occupies its track. */
        .ix-meta {
          display: grid; flex-shrink: 0;
          grid-template-columns: 46px 82px 54px 80px;
          align-items: center; justify-items: end; gap: 16px;
          font-size: 12.5px; color: var(--ink-tertiary); font-variant-numeric: tabular-nums;
        }
        .ix-mcount, .ix-mmembers { white-space: nowrap; }
        /* z-index 2 keeps the tools clickable above the stretched hit area. */
        .ix-tools { position: relative; z-index: 2; display: flex; gap: 2px; opacity: 0; transition: opacity 110ms linear; }
        .ix-tool {
          display: grid; place-items: center; width: 26px; height: 26px;
          background: none; border: none; border-radius: 5px;
          color: var(--ink-faint); cursor: pointer;
          transition: color 110ms linear, background 110ms linear;
        }
        .ix-tool:hover { color: var(--ink); background: var(--surface-active); }
        .ix-tool[data-danger]:hover { color: var(--danger); }
        .ix-tool[data-on="true"] { opacity: 1; color: var(--warning); }

        /* Segmented completion — deliberately not a progress bar. */
        .seg { display: flex; gap: 2px; }
        .seg i { width: 5px; height: 12px; border-radius: 1px; background: var(--line); display: block; }
        .seg i[data-f="true"] { background: var(--ink-secondary); }
        .seg[data-full="true"] i[data-f="true"] { background: var(--success); }

        /* ── Cards view (secondary) ─────────────────────────────── */
        .wk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin-top: 22px; }
        .ct {
          position: relative;
          background: var(--surface); text-align: left;
          padding: 20px; display: flex; flex-direction: column; gap: 12px; min-height: 148px;
          transition: background 110ms linear;
        }
        .ct:hover, .ct:focus-within { background: var(--surface-hover); }
        .ct:hover .ix-tools, .ct:focus-within .ix-tools { opacity: 1; }
        .ct-hit {
          position: absolute; inset: 0; z-index: 1;
          padding: 0; background: none; border: none; cursor: pointer;
        }
        .ct-hit:focus-visible { outline: 2px solid var(--accent); outline-offset: -3px; }

        @media (max-width: 720px) {
          .wk { padding: 28px 18px 64px; }
          .ix-desc { display: none; }
          .ix-meta { grid-template-columns: auto auto; gap: 14px; }
          .ix-meta .ix-hide { display: none; }
          .ix-tools { opacity: 1; }
        }
      `}</style>

      <div className="wk">
        {/* ── Header ── */}
        <header>
          <div className="wk-top">
            <div>
              <span className="eyebrow">Workspace</span>
              <h1 className="display wk-title">Boards</h1>
              <p className="wk-sub">
                {initialLoading ? (
                  <span className="skeleton skeleton-text" style={{ display: "inline-block", width: 210 }} />
                ) : totals.boards === 0 ? (
                  "Nothing here yet."
                ) : (
                  <>
                    <b>{totals.boards}</b> board{totals.boards === 1 ? "" : "s"} ·{" "}
                    <b>{totals.tasks}</b> task{totals.tasks === 1 ? "" : "s"}
                    {totals.active > 0 && <> · <b>{totals.active}</b> in progress</>}
                  </>
                )}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, paddingTop: 6 }}>
              <button className="btn btn-secondary" onClick={() => { setErr(""); setJoinOpen(true); }}>
                Join with code
              </button>
              <button className="btn btn-accent" onClick={beginCreate}>
                <Plus size={15} /> New board
              </button>
            </div>
          </div>

          {!initialLoading && totals.tasks > 0 && (
            <div className="wk-rule">
              <span className="wk-rule-track">
                <span className="wk-rule-fill" style={{ width: `${totals.pct}%` }} />
              </span>
              <span className="wk-rule-pct">{totals.pct}% complete</span>
            </div>
          )}
        </header>

        {/* ── Toolbar ── */}
        {(initialLoading || projects.length > 0) && (
          <div className="wk-bar">
            <div className="wk-find">
              <Search size={15} style={{ color: "var(--ink-faint)", flexShrink: 0 }} />
              <input
                placeholder="Filter boards"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter boards"
              />
              {query && (
                <button className="ix-tool" style={{ opacity: 1 }} onClick={() => setQuery("")} aria-label="Clear filter">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="wk-right">
              <select className="wk-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} aria-label="Sort">
                <option value="recent">Recently updated</option>
                <option value="name">Name</option>
                <option value="tasks">Most tasks</option>
                <option value="created">Newest</option>
              </select>
              <div className="wk-toggle" role="group" aria-label="View">
                <button data-on={view === "index"} onClick={() => setViewMode("index")} aria-label="List view" aria-pressed={view === "index"}>
                  <Rows3 size={14} />
                </button>
                <button data-on={view === "cards"} onClick={() => setViewMode("cards")} aria-label="Card view" aria-pressed={view === "cards"}>
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {initialLoading ? (
          <div style={{ marginTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 6px", borderBottom: "1px solid var(--line-faint)" }}>
                <span className="skeleton" style={{ width: 3, height: 26, borderRadius: 2 }} />
                <span className="skeleton skeleton-text" style={{ width: 130 + (i % 3) * 46 }} />
                <span className="skeleton skeleton-text" style={{ marginLeft: "auto", width: 58 }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Empty onCreate={beginCreate} onJoin={() => setJoinOpen(true)} />
        ) : visible.length === 0 ? (
          <p style={{ padding: "52px 6px", color: "var(--ink-tertiary)", fontSize: 14 }}>
            Nothing matches “{query}”.
          </p>
        ) : view === "index" ? (
          <div className="ix">
            {starred.length > 0 && (
              <>
                <div className="wk-group">Starred</div>
                {starred.map((p) => <IndexRow key={p.id} {...rowProps(p)} />)}
              </>
            )}
            {starred.length > 0 && others.length > 0 && <div className="wk-group">All boards</div>}
            {others.map((p) => <IndexRow key={p.id} {...rowProps(p)} />)}
          </div>
        ) : (
          <div className="wk-cards">
            {visible.map((p) => <CardTile key={p.id} {...rowProps(p)} />)}
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      {createOpen && (
        <Dialog title="New board" onClose={() => setCreateOpen(false)}>
          <Labeled label="Name">
            <input className="input" autoFocus value={name} placeholder="e.g. Website redesign"
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          </Labeled>
          <Labeled label="Description" optional>
            <textarea className="input" rows={3} value={description} placeholder="What is this board for?"
              onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
          </Labeled>
          <Labeled label="Marker">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {TICKS.map((t) => (
                <button key={t.id} onClick={() => setTick(t.id)} aria-label={t.id} aria-pressed={tick === t.id}
                  style={{
                    width: 22, height: 22, borderRadius: 4, cursor: "pointer", background: t.c,
                    border: tick === t.id ? "2px solid var(--ink)" : "2px solid transparent",
                    outline: tick === t.id ? "1px solid var(--canvas)" : "none", outlineOffset: -3,
                  }} />
              ))}
            </div>
          </Labeled>
          {err && <Warn msg={err} />}
          <Actions onCancel={() => setCreateOpen(false)} onConfirm={create}
            label={busy ? "Creating…" : "Create board"} disabled={busy || !name.trim()} />
        </Dialog>
      )}

      {editing && (
        <Dialog title="Edit board" onClose={() => setEditing(null)}>
          <Labeled label="Name">
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()} />
          </Labeled>
          <Labeled label="Description" optional>
            <textarea className="input" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
          </Labeled>
          {err && <Warn msg={err} />}
          <Actions onCancel={() => setEditing(null)} onConfirm={save}
            label={busy ? "Saving…" : "Save"} disabled={busy || !name.trim()} />
        </Dialog>
      )}

      {joinOpen && (
        <Dialog title="Join a board" onClose={() => setJoinOpen(false)}
          note="Enter the access code a teammate shared with you.">
          <Labeled label="Access code">
            <input className="input mono" autoFocus value={code} placeholder="ABC123"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              style={{ letterSpacing: "0.14em" }} />
          </Labeled>
          {err && <Warn msg={err} />}
          <Actions onCancel={() => setJoinOpen(false)} onConfirm={join}
            label={busy ? "Joining…" : "Join"} disabled={busy || !code.trim()} />
        </Dialog>
      )}

      {deleting && (
        <Dialog title="Delete this board?" onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--ink)", fontWeight: 550 }}>{deleting.name}</strong> and all
            of its tasks, comments and history will be permanently removed.
          </p>
          {err && <div style={{ marginTop: 14 }}><Warn msg={err} /></div>}
          <Actions onCancel={() => setDeleting(null)} onConfirm={remove}
            label={busy ? "Deleting…" : "Delete board"} disabled={busy} danger />
        </Dialog>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROWS
   ═══════════════════════════════════════════════════════════════ */

type RowProps = {
  p: ProjectSummary; color: string; role: string; starred: boolean;
  onOpen: () => void; onStar: () => void; onEdit: () => void; onDelete: () => void;
};

function counts(p: ProjectSummary) {
  const t = p.tickets ?? [];
  const done = t.filter((x) => x.status === "DONE").length;
  return { total: t.length, done, pct: t.length ? Math.round((done / t.length) * 100) : 0 };
}

function Segments({ pct }: { pct: number }) {
  const filled = Math.round((pct / 100) * 8);
  return (
    <span className="seg" data-full={pct === 100} aria-label={`${pct}% complete`}>
      {Array.from({ length: 8 }).map((_, i) => <i key={i} data-f={i < filled} />)}
    </span>
  );
}

function Tools({ role, starred, onStar, onEdit, onDelete }: Omit<RowProps, "p" | "color" | "onOpen">) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <span className="ix-tools" onClick={stop}>
      <button className="ix-tool" data-on={starred} onClick={onStar} aria-label={starred ? "Unstar" : "Star"}>
        <Star size={13} fill={starred ? "currentColor" : "none"} />
      </button>
      {role !== "VIEWER" && (
        <button className="ix-tool" onClick={onEdit} aria-label="Edit board"><Pencil size={13} /></button>
      )}
      {role === "OWNER" && (
        <button className="ix-tool" data-danger onClick={onDelete} aria-label="Delete board"><Trash2 size={13} /></button>
      )}
    </span>
  );
}

function IndexRow(props: RowProps) {
  const { p, color, role, starred, onOpen } = props;
  const c = counts(p);

  return (
    <div className="ix-row">
      {/* Stretched click target — a sibling, never a parent, of the tools. */}
      <button className="ix-hit" onClick={onOpen} aria-label={`Open ${p.name}`} />

      <span className="ix-tick" style={{ background: color }} aria-hidden />

      <span className="ix-name">
        <span>{p.name}</span>
        {starred && <Star size={11} fill="var(--warning)" color="var(--warning)" style={{ flexShrink: 0 }} />}
        {role !== "OWNER" && (
          <span style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", flexShrink: 0 }}>
            {role}
          </span>
        )}
        {p.description && <span className="ix-desc">{p.description}</span>}
      </span>

      <span className="ix-meta">
        <span className="ix-hide ix-mcount">
          {c.total === 0 ? "—" : `${c.done}/${c.total}`}
        </span>
        {/* Always rendered so the segments column stays aligned across rows. */}
        <span className="ix-hide ix-mmembers">
          {(p.members?.length ?? 0) > 1 ? `${p.members!.length} members` : ""}
        </span>
        <Segments pct={c.pct} />
        <Tools {...props} />
      </span>
    </div>
  );
}

function CardTile(props: RowProps) {
  const { p, color, role, starred, onOpen } = props;
  const c = counts(p);

  return (
    <div className="ct">
      <button className="ct-hit" onClick={onOpen} aria-label={`Open ${p.name}`} />

      <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 3, height: 15, borderRadius: 2, background: color }} aria-hidden />
        <span style={{ fontSize: 14.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.name}
        </span>
        {starred && <Star size={11} fill="var(--warning)" color="var(--warning)" />}
        <span style={{ marginLeft: "auto" }}><Tools {...props} /></span>
      </span>

      <span style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.55, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {p.description || "No description"}
      </span>

      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-tertiary)", fontVariantNumeric: "tabular-nums" }}>
          {c.total === 0 ? "empty" : `${c.done}/${c.total}`}
          {role !== "OWNER" && <span style={{ color: "var(--ink-faint)" }}> · {role.toLowerCase()}</span>}
        </span>
        <Segments pct={c.pct} />
      </span>
    </div>
  );
}

function Empty({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div style={{ padding: "76px 0 60px", maxWidth: 420 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 12 }}>Start your first board</h2>
      <p style={{ color: "var(--ink-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
        A board holds your tasks in three columns and keeps everyone looking at
        the same thing. Create one, or join a board with a code.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-accent" onClick={onCreate}><Plus size={15} /> New board</button>
        <button className="btn btn-secondary" onClick={onJoin}>Join with code</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DIALOG
   ═══════════════════════════════════════════════════════════════ */

function Dialog({
  title, note, onClose, children,
}: { title: string; note?: string; onClose: () => void; children: React.ReactNode }) {
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
        background: "rgba(28,25,23,0.28)",
        animation: "fade-in 140ms linear",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: 424, background: "var(--surface)",
          border: "1px solid var(--line-strong)", borderRadius: 10,
          boxShadow: "var(--shadow-xl)", padding: 24,
          animation: "scale-in 200ms var(--ease-out-quart)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: note ? 8 : 20 }}>
          <h2 style={{ fontSize: 16.5, fontWeight: 550, letterSpacing: "-0.01em" }}>{title}</h2>
          <button onClick={onClose} className="ix-tool" style={{ opacity: 1 }} aria-label="Close"><X size={15} /></button>
        </div>
        {note && <p style={{ fontSize: 13.5, color: "var(--ink-tertiary)", margin: "0 0 20px", lineHeight: 1.6 }}>{note}</p>}
        {children}
      </div>
    </div>
  );
}

function Labeled({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-secondary)" }}>{label}</label>
        {optional && <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>optional</span>}
      </div>
      {children}
    </div>
  );
}

function Warn({ msg }: { msg: string }) {
  return (
    <div role="alert" style={{
      display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 11px",
      borderRadius: 6, background: "var(--danger-tint)",
      color: "var(--danger)", fontSize: 13, lineHeight: 1.5,
    }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{msg}</span>
    </div>
  );
}

function Actions({
  onCancel, onConfirm, label, disabled, danger,
}: { onCancel: () => void; onConfirm: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
      <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button className={danger ? "btn btn-danger" : "btn btn-accent"} onClick={onConfirm} disabled={disabled}>
        {label}
      </button>
    </div>
  );
}
