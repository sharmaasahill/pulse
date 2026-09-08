"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { useReveal, useScrollProgress } from "@/lib/reveal";
import { LoginModal } from "./components/LoginModal";
import {
  ArrowRight, ArrowUpRight, Check, MessageSquare, Clock,
  Users, KeyRound, Bell, Search, Menu, X, Zap,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   CONTENT
   Everything below describes behaviour that exists in this
   codebase. No invented customers, metrics, logos or pricing.
   ═══════════════════════════════════════════════════════════════ */

const CAPABILITIES = [
  "Drag & drop board",
  "Real-time sync",
  "Assignees",
  "Four priority levels",
  "Threaded comments",
  "Activity history",
  "Owner / Editor / Viewer roles",
  "Invite links & join codes",
  "In-app notifications",
];

const FEATURES = [
  {
    n: "01",
    title: "A board that moves when your team does",
    body:
      "Three columns — To Do, In Progress, Done. Drag a card and every teammate viewing the board sees it move, immediately, over a websocket. No refresh, no polling.",
    points: ["Drag & drop between columns", "Instant sync across viewers", "Keyboard and touch friendly"],
  },
  {
    n: "02",
    title: "Enough structure to stay honest",
    body:
      "Each task carries a priority, an optional assignee, a description and its own comment thread. Every change is written to the project's activity history, so “who moved this?” always has an answer.",
    points: ["Low → Medium → High → Urgent", "Assign any project member", "Per-task comments", "Full activity log"],
  },
  {
    n: "03",
    title: "Sharing without handing over the keys",
    body:
      "Invite by link or a short join code, and choose what the invitee can do. Viewers read. Editors move and create work. Owners control the project itself. The server enforces it on every request.",
    points: ["Owner / Editor / Viewer", "Shareable link or join code", "Optional expiry", "Checked server-side"],
  },
];

const STEPS = [
  { k: "Create", d: "Make a board and give it a name. You're the owner." },
  { k: "Invite", d: "Share a link or code, and pick each person's role." },
  { k: "Work", d: "Add tasks, assign them, drag them across. Everyone stays in sync." },
];

const STACK = [
  { name: "Next.js", role: "App Router front end" },
  { name: "NestJS", role: "Typed REST API" },
  { name: "PostgreSQL", role: "Primary datastore" },
  { name: "Prisma", role: "Schema & queries" },
  { name: "Socket.IO", role: "Live updates" },
  { name: "JWT + bcrypt", role: "Auth & hashing" },
];

/* ═══════════════════════════════════════════════════════════════
   BOARD PREVIEW
   An honest illustration of the real UI: columns, priority chips,
   assignee avatars, comment counts. One card cycles between
   In Progress and Done to show what live sync looks like.
   ═══════════════════════════════════════════════════════════════ */

type DemoCard = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  who: string;
  comments?: number;
};

const PRIORITY: Record<DemoCard["priority"], { label: string; fg: string; bg: string }> = {
  LOW: { label: "Low", fg: "var(--ink-tertiary)", bg: "var(--surface-sunken)" },
  MEDIUM: { label: "Medium", fg: "var(--warning)", bg: "var(--warning-tint)" },
  HIGH: { label: "High", fg: "var(--accent-strong)", bg: "var(--accent-tint)" },
  URGENT: { label: "Urgent", fg: "var(--danger)", bg: "var(--danger-tint)" },
};

const TODO: DemoCard[] = [
  { id: "t1", title: "Draft onboarding copy", priority: "MEDIUM", who: "RS" },
  { id: "t2", title: "Audit empty states", priority: "LOW", who: "AK" },
];
const PROGRESS: DemoCard[] = [
  { id: "p1", title: "Wire up invite expiry", priority: "HIGH", who: "SS", comments: 3 },
];
const DONE: DemoCard[] = [
  { id: "d1", title: "Role checks on the API", priority: "URGENT", who: "SS", comments: 5 },
];

function Avatar({ initials, tone = "accent" }: { initials: string; tone?: "accent" | "neutral" }) {
  return (
    <span
      aria-hidden
      style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        display: "grid", placeItems: "center",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.02em",
        color: tone === "accent" ? "#fff" : "var(--ink-secondary)",
        background: tone === "accent" ? "var(--accent-gradient)" : "var(--surface-sunken)",
        border: tone === "neutral" ? "1px solid var(--line)" : "none",
      }}
    >
      {initials}
    </span>
  );
}

function Card({ card, moving = false }: { card: DemoCard; moving?: boolean }) {
  const p = PRIORITY[card.priority];
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${moving ? "var(--accent)" : "var(--line)"}`,
        borderRadius: "var(--r-md)",
        padding: "11px 12px",
        boxShadow: moving ? "var(--shadow-lg)" : "var(--shadow-xs)",
        transform: moving ? "scale(1.03) rotate(-0.6deg)" : "none",
        transition: "transform var(--t-slow) var(--ease-spring), box-shadow var(--t-slow) var(--ease-out-quart), border-color var(--t-base) linear",
      }}
    >
      <span
        className="badge"
        style={{ color: p.fg, background: p.bg, marginBottom: 8, fontSize: 10.5 }}
      >
        {p.label}
      </span>
      <p style={{ fontSize: 13, fontWeight: 550, lineHeight: 1.45, color: "var(--ink)", margin: "0 0 10px" }}>
        {card.title}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Avatar initials={card.who} />
        {card.comments ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-tertiary)" }}>
            <MessageSquare size={11} /> {card.comments}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BoardPreview() {
  // The single moving card alternates columns to demonstrate live sync.
  const [shipped, setShipped] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setShipped((v) => !v), 2600);
    return () => clearInterval(id);
  }, []);

  const columns: Array<{ key: string; label: string; tint: string; cards: DemoCard[] }> = [
    { key: "todo", label: "To Do", tint: "var(--ink-faint)", cards: TODO },
    {
      key: "prog",
      label: "In Progress",
      tint: "var(--accent)",
      cards: shipped ? [] : PROGRESS,
    },
    {
      key: "done",
      label: "Done",
      tint: "var(--success)",
      cards: shipped ? [...PROGRESS, ...DONE] : DONE,
    },
  ];

  return (
    <div
      style={{
        background: "var(--canvas)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-xl)",
        overflow: "hidden",
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }} aria-hidden>
          {["#e4e0da", "#e4e0da", "#e4e0da"].map((c, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginLeft: 4 }}>
          Product · Board
        </span>
        <span
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 600, color: "var(--success)",
          }}
        >
          <span style={{ position: "relative", display: "grid", placeItems: "center", width: 7, height: 7 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--success)", animation: "ping 2s var(--ease-out-expo) infinite" }} />
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)" }} />
          </span>
          Live
        </span>
      </div>

      {/* Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          padding: 14,
          minHeight: 268,
          alignItems: "start",
        }}
      >
        {columns.map((col) => (
          <div key={col.key}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: 8, marginBottom: 10,
                borderBottom: `2px solid ${col.tint}`,
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-secondary)" }}>
                {col.label}
              </span>
              <span className="num" style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)" }}>
                {col.cards.length}
              </span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {col.cards.map((c) => (
                <Card key={c.id} card={c} moving={shipped && c.id === "p1"} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useReveal();
  useScrollProgress();

  // Auth lives in localStorage, so it is only known on the client. Gating the
  // signed-in UI on `mounted` keeps the first client paint identical to the
  // server's and avoids a hydration mismatch.
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && !!token;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() ?? "";

  const start = () => (token ? router.push("/projects") : setShowLogin(true));

  const sections = [
    { id: "how", label: "How it works" },
    { id: "features", label: "Features" },
    { id: "stack", label: "Built with" },
  ];

  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        /* ── Page-scoped layout & motion ─────────────────────── */
        .lp-nav-wrap {
          position: fixed; inset: 0 0 auto; z-index: 200;
          border-bottom: 1px solid transparent;
          transition: border-color var(--t-base) linear, background var(--t-base) linear;
        }
        .lp-nav-wrap[data-stuck="true"] {
          border-bottom-color: var(--line);
          background: rgba(251,250,248,0.82);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          backdrop-filter: blur(16px) saturate(180%);
        }
        .lp-nav {
          max-width: 1180px; margin: 0 auto; padding: 0 32px;
          height: 68px; display: flex; align-items: center; gap: 28px;
        }
        .lp-navlinks { display: flex; gap: 26px; margin-left: 12px; }
        .lp-navlink {
          font-size: 13.5px; font-weight: 500; color: var(--ink-secondary);
          text-decoration: none; transition: color var(--t-fast) linear;
        }
        .lp-navlink:hover { color: var(--ink); }
        .lp-navcta { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .lp-burger { display: none; }

        /* Hero */
        .lp-hero {
          padding: 168px 0 0;
          position: relative;
        }
        .lp-hero-grid {
          display: grid; grid-template-columns: 1.05fr 0.95fr;
          gap: 56px; align-items: end;
        }
        /* Parallax: driven by the --scroll variable that useScrollProgress
           publishes, so nothing re-renders per frame. */
        .lp-parallax {
          transform: translate3d(0, calc(var(--scroll, 0) * -0.035px), 0);
          will-change: transform;
        }
        .lp-preview-wrap { margin-top: 68px; position: relative; }

        /* Decorative wash behind the hero */
        .lp-wash {
          position: absolute; pointer-events: none; z-index: 0;
          width: 760px; height: 520px; top: -80px; left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse at center, rgba(234,88,12,0.10), transparent 68%);
          filter: blur(8px);
          animation: drift 13s var(--ease-in-out) infinite;
        }

        /* Marquee */
        .lp-marquee {
          display: flex; overflow: hidden; gap: 0;
          border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
          padding: 17px 0; margin-top: 104px;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .lp-marquee-track {
          display: flex; flex-shrink: 0; gap: 40px; padding-right: 40px;
          animation: marquee 34s linear infinite;
        }
        .lp-marquee:hover .lp-marquee-track { animation-play-state: paused; }
        .lp-chip {
          display: inline-flex; align-items: center; gap: 9px; white-space: nowrap;
          font-size: 13px; font-weight: 500; color: var(--ink-secondary);
        }

        /* Sections */
        .lp-sec { padding: 116px 0; }
        .lp-sec-head { max-width: 640px; margin-bottom: 64px; }

        /* Feature rows — editorial, not a card grid */
        .lp-feat {
          display: grid; grid-template-columns: 88px 1fr 300px;
          gap: 40px; align-items: start;
          padding: 44px 0; border-top: 1px solid var(--line);
        }
        .lp-feat-n {
          font-family: var(--font-display), Georgia, serif;
          font-size: 40px; line-height: 1; color: var(--ink-faint);
        }
        .lp-points { display: grid; gap: 10px; }
        .lp-point {
          display: flex; gap: 9px; align-items: flex-start;
          font-size: 13.5px; color: var(--ink-secondary);
        }

        /* Steps */
        .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
        .lp-step { background: var(--surface); padding: 34px 30px; transition: background var(--t-base) linear; }
        .lp-step:hover { background: var(--surface-hover); }

        /* Stack */
        .lp-stack { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .lp-stack-item {
          padding: 22px; border: 1px solid var(--line); border-radius: var(--r-md);
          background: var(--surface);
        }

        /* Roles table */
        .lp-roles { width: 100%; border-collapse: collapse; font-size: 14px; }
        .lp-roles th, .lp-roles td { text-align: left; padding: 15px 16px; border-bottom: 1px solid var(--line); }
        .lp-roles th { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-tertiary); font-weight: 600; }
        .lp-roles td:first-child { font-weight: 600; }
        .lp-roles tr:last-child td { border-bottom: none; }

        /* CTA */
        .lp-cta {
          border: 1px solid var(--line); border-radius: var(--r-xl);
          padding: 76px 48px; text-align: center; position: relative; overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(234,88,12,0.09), transparent 62%),
            var(--surface);
        }

        /* Footer */
        .lp-footer { border-top: 1px solid var(--line); padding: 44px 0 56px; }

        /* ── Responsive ─────────────────────────────────────── */
        @media (max-width: 1024px) {
          .lp-hero-grid { grid-template-columns: 1fr; gap: 40px; align-items: start; }
          .lp-feat { grid-template-columns: 60px 1fr; }
          .lp-feat > .lp-points { grid-column: 2; }
          .lp-stack { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .lp-nav { padding: 0 18px; height: 62px; gap: 14px; }
          .lp-navlinks { display: none; }
          .lp-burger { display: inline-flex; }
          .lp-navcta .lp-hide-sm { display: none; }
          .lp-hero { padding-top: 122px; }
          .lp-sec { padding: 78px 0; }
          .lp-sec-head { margin-bottom: 40px; }
          .lp-steps { grid-template-columns: 1fr; }
          .lp-stack { grid-template-columns: 1fr; }
          .lp-feat { grid-template-columns: 1fr; gap: 18px; padding: 34px 0; }
          .lp-feat > .lp-points { grid-column: 1; }
          .lp-feat-n { font-size: 30px; }
          .lp-cta { padding: 52px 24px; }
          .lp-marquee { margin-top: 64px; }
          .lp-preview-wrap { margin-top: 44px; }
        }
      `}</style>

      {/* ════════ NAV ════════ */}
      <Nav
        sections={sections}
        signedIn={signedIn}
        initials={initials}
        username={user?.username}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onStart={start}
        router={router}
      />

      {/* ════════ HERO ════════ */}
      <header className="lp-hero">
        <div className="lp-wash" aria-hidden />
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <div className="lp-hero-grid">
            <div>
              <div
                data-reveal="fade"
                style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}
              >
                <span style={{ width: 28, height: 1, background: "var(--accent)" }} />
                <span className="eyebrow">Real-time project boards</span>
              </div>

              {/* Line-masked display heading */}
              <h1
                className="display t-hero"
                data-reveal="fade"
                style={{ marginBottom: 26 }}
              >
                <span className="line-mask"><span style={{ ["--i" as string]: 0 }}>Move the work,</span></span>
                <span className="line-mask">
                  <span style={{ ["--i" as string]: 1 }}>
                    not the <em className="display-italic" style={{ color: "var(--accent-strong)" }}>status meeting</em>.
                  </span>
                </span>
              </h1>

              <p className="lede" data-reveal style={{ ["--i" as string]: 1, marginBottom: 34 }}>
                Pulse is a Kanban workspace where a card you drag lands on your
                teammate&apos;s screen the same second. Priorities, assignees,
                comments and a full activity trail — without the ceremony.
              </p>

              <div
                data-reveal
                style={{ ["--i" as string]: 2, display: "flex", flexWrap: "wrap", gap: 12 }}
              >
                <button className="btn btn-accent btn-lg" onClick={start}>
                  {signedIn ? "Open your dashboard" : "Create a board"}
                </button>
                <a href="#how" className="btn btn-secondary btn-lg" style={{ textDecoration: "none" }}>
                  See how it works
                </a>
              </div>
            </div>

            {/* Honest, self-describing side panel — no metrics claimed */}
            <aside data-reveal="right" style={{ ["--i" as string]: 2 }}>
              <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 26, display: "grid", gap: 24 }}>
                {[
                  { icon: <Zap size={15} />, t: "Websocket updates", d: "Changes broadcast to everyone on the board." },
                  { icon: <Users size={15} />, t: "Three access levels", d: "Owner, Editor and Viewer — enforced by the API." },
                  { icon: <Clock size={15} />, t: "Activity history", d: "Every create, move and delete is recorded." },
                ].map((r) => (
                  <div key={r.t} style={{ display: "flex", gap: 13 }}>
                    <span style={{ color: "var(--accent-strong)", marginTop: 2, flexShrink: 0 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{r.t}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-tertiary)", lineHeight: 1.55 }}>{r.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {/* Product preview */}
          <div className="lp-preview-wrap lp-parallax" data-reveal="scale" style={{ ["--i" as string]: 3 }}>
            <BoardPreview />
          </div>
        </div>

        {/* Capability marquee — real features only */}
        <div className="lp-marquee" aria-hidden>
          {[0, 1].map((dup) => (
            <div className="lp-marquee-track" key={dup}>
              {CAPABILITIES.map((c) => (
                <span className="lp-chip" key={`${dup}-${c}`}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      </header>

      {/* ════════ HOW IT WORKS ════════ */}
      <section id="how" className="lp-sec">
        <div className="shell">
          <div className="lp-sec-head">
            <span className="eyebrow" data-reveal="fade">How it works</span>
            <h2 className="display t-section" data-reveal style={{ marginTop: 14 }}>
              Three steps, then you&apos;re working.
            </h2>
          </div>

          <div className="lp-steps" data-reveal>
            {STEPS.map((s, i) => (
              <div className="lp-step" key={s.k}>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-strong)", marginBottom: 16 }}>
                  0{i + 1}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 650, marginBottom: 9, letterSpacing: "-0.01em" }}>{s.k}</h3>
                <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.62 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="features" className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="lp-sec-head">
            <span className="eyebrow" data-reveal="fade">What&apos;s inside</span>
            <h2 className="display t-section" data-reveal style={{ marginTop: 14 }}>
              Built around how boards <em className="display-italic">actually</em> get used.
            </h2>
          </div>

          {FEATURES.map((f) => (
            <article className="lp-feat" key={f.n} data-reveal>
              <div className="lp-feat-n" aria-hidden>{f.n}</div>
              <div>
                <h3 className="t-card" style={{ fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 14 }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--ink-secondary)", lineHeight: 1.7, maxWidth: "52ch" }}>{f.body}</p>
              </div>
              <div className="lp-points">
                {f.points.map((p) => (
                  <div className="lp-point" key={p}>
                    <Check size={15} style={{ color: "var(--accent-strong)", flexShrink: 0, marginTop: 2 }} />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ════════ ROLES ════════ */}
      <section className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="lp-sec-head">
            <span className="eyebrow" data-reveal="fade">Access control</span>
            <h2 className="display t-section" data-reveal style={{ marginTop: 14 }}>
              Who can do what.
            </h2>
          </div>

          <div data-reveal style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface)" }}>
            <table className="lp-roles">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>View board</th>
                  <th>Create &amp; move tasks</th>
                  <th>Manage project</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { r: "Owner", v: true, e: true, m: true },
                  { r: "Editor", v: true, e: true, m: false },
                  { r: "Viewer", v: true, e: false, m: false },
                ].map((row) => (
                  <tr key={row.r}>
                    <td>{row.r}</td>
                    {[row.v, row.e, row.m].map((ok, i) => (
                      <td key={i}>
                        {ok ? (
                          <Check size={16} style={{ color: "var(--success)" }} aria-label="Yes" />
                        ) : (
                          <span aria-label="No" style={{ color: "var(--ink-faint)" }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, color: "var(--ink-tertiary)", marginTop: 14, maxWidth: "62ch" }} data-reveal="fade">
            Roles are checked on the server for every request, so a Viewer can&apos;t
            change a board by calling the API directly.
          </p>
        </div>
      </section>

      {/* ════════ STACK ════════ */}
      <section id="stack" className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="lp-sec-head">
            <span className="eyebrow" data-reveal="fade">Built with</span>
            <h2 className="display t-section" data-reveal style={{ marginTop: 14 }}>
              No mystery in the stack.
            </h2>
          </div>

          <div className="lp-stack">
            {STACK.map((s, i) => (
              <div className="lp-stack-item lift" key={s.name} data-reveal style={{ ["--i" as string]: i % 3 }}>
                <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 5 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "var(--ink-tertiary)" }}>{s.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="lp-cta" data-reveal="scale">
            <h2 className="display t-section" style={{ marginBottom: 16 }}>
              Start with one board.
            </h2>
            <p className="lede" style={{ margin: "0 auto 30px", textAlign: "center" }}>
              Create a project, invite whoever needs to be there, and see the
              board update as it happens.
            </p>
            <button className="btn btn-accent btn-lg" onClick={start}>
              {signedIn ? "Open your dashboard" : "Get started"}
            </button>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="lp-footer">
        <div
          className="shell"
          style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="display" style={{ fontSize: 21 }}>Pulse</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-tertiary)" }}>Real-time project boards</span>
          </div>
          <nav style={{ display: "flex", gap: 22 }}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="link" style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>

      {/* LoginModal performs the redirect to /projects itself once the token
          is persisted, so this only needs to dismiss. */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════════ */

function Nav({
  sections, signedIn, initials, username, menuOpen, setMenuOpen, onStart, router,
}: {
  sections: Array<{ id: string; label: string }>;
  signedIn: boolean;
  initials: string;
  username?: string;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onStart: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-nav-wrap" data-stuck={stuck}>
      <div className="lp-nav">
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }}
          className="display"
          style={{ fontSize: 23, textDecoration: "none", color: "var(--ink)", letterSpacing: "-0.01em" }}
        >
          Pulse
        </a>

        <nav className="lp-navlinks">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="lp-navlink">{s.label}</a>
          ))}
        </nav>

        <div className="lp-navcta">
          {signedIn ? (
            <>
              <button
                onClick={() => router.push("/profile")}
                title="Profile & settings"
                className="lp-hide-sm"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "var(--surface)", border: "1px solid var(--line-strong)",
                  borderRadius: "var(--r-full)", padding: "4px 13px 4px 4px",
                  cursor: "pointer", transition: "border-color var(--t-fast) linear",
                }}
              >
                <span
                  style={{
                    width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                    background: "var(--accent-gradient)", color: "#fff", fontSize: 10.5, fontWeight: 700,
                  }}
                >
                  {initials}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{username ?? "Account"}</span>
              </button>
              <button className="btn btn-accent" onClick={() => router.push("/projects")}>
                Dashboard
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost lp-hide-sm" onClick={onStart}>
                Log in
              </button>
              <button className="btn btn-accent" onClick={onStart}>
                Get started
              </button>
            </>
          )}

          <button
            className="btn-icon lp-burger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--line)",
            padding: "10px 18px 20px",
            animation: "rise var(--t-base) var(--ease-out-quart)",
          }}
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block", padding: "13px 0", fontSize: 15, fontWeight: 500,
                color: "var(--ink)", textDecoration: "none",
                borderBottom: "1px solid var(--line-faint)",
              }}
            >
              {s.label}
            </a>
          ))}
          <button
            className="btn btn-accent btn-lg"
            onClick={() => { setMenuOpen(false); onStart(); }}
            style={{ width: "100%", marginTop: 16 }}
          >
            {signedIn ? "Open dashboard" : "Get started"}
          </button>
        </div>
      )}
    </div>
  );
}
