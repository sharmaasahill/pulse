"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { useProjects } from "@/store/useProjects";
import { LoginModal } from "./LoginModal";
import { NotificationBell } from "./NotificationBell";
import { LayoutDashboard, LogOut } from "lucide-react";

export function Navbar() {
  const { token, logout, user } = useAuth();
  const resetProjects = useProjects((s) => s.reset);
  const pathname = usePathname();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || "?";

  function handleLogout() {
    setConfirmingLogout(false);
    logout();
    // Clear the cached project list so the next account doesn't briefly see
    // the previous user's boards.
    resetProjects();
    router.push("/");
  }

  return (
    <>
      <style>{`
        .nb {
          position: fixed; inset: 0 0 auto; z-index: 100;
          height: var(--navbar-height);
          display: flex; align-items: center;
          background: rgba(251,250,248,0.85);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          backdrop-filter: blur(18px) saturate(180%);
          border-bottom: 1px solid var(--line);
        }
        .nb-badge {
          display: flex; align-items: center; gap: 9px;
          padding: 3px 12px 3px 3px;
          border-radius: var(--r-full);
          background: var(--surface);
          border: 1px solid var(--line-strong);
          text-decoration: none;
          transition: border-color var(--t-fast) linear, box-shadow var(--t-fast) linear;
        }
        .nb-badge:hover { border-color: var(--ink-faint); box-shadow: var(--shadow-xs); }
        .nb-badge[data-active="true"] { border-color: var(--accent); }
        .nb-avatar {
          width: 27px; height: 27px; border-radius: 50%;
          display: grid; place-items: center;
          background: var(--accent-gradient); color: #fff;
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
        }
        .nb-name { font-size: 13px; font-weight: 600; color: var(--ink); }
        @media (max-width: 560px) { .nb-name { display: none; } .nb-badge { padding: 3px; } }
      `}</style>

      <nav className="nb">
        <div className="nav-inner">
          {/* The logo always returns to the marketing landing page — the
              dashboard link next to it is what takes signed-in users back
              to their boards. */}
          <Link
            href="/"
            className="display"
            style={{ fontSize: 22, textDecoration: "none", color: "var(--ink)", letterSpacing: "-0.01em" }}
          >
            Pulse
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {token ? (
              <>
                <Link
                  href="/projects"
                  className="btn-icon"
                  title="Dashboard"
                  aria-label="Dashboard"
                  style={{
                    color: pathname === "/projects" ? "var(--accent-strong)" : "var(--ink-tertiary)",
                    background: pathname === "/projects" ? "var(--accent-tint)" : "transparent",
                  }}
                >
                  <LayoutDashboard size={17} />
                </Link>

                <NotificationBell />

                <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 6px" }} />

                <Link
                  href="/profile"
                  className="nb-badge"
                  data-active={pathname === "/profile"}
                  title="Profile & settings"
                >
                  <span className="nb-avatar">{initials}</span>
                  <span className="nb-name">{user?.username || "Account"}</span>
                </Link>

                <button
                  onClick={() => setConfirmingLogout(true)}
                  className="btn-icon"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setShowLoginModal(true)} className="btn btn-ghost">
                  Log in
                </button>
                <button onClick={() => setShowLoginModal(true)} className="btn btn-accent">
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
      />

      {confirmingLogout && (
        <LogoutConfirm onCancel={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
      )}
    </>
  );
}

function LogoutConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        style={{
          width: "100%", maxWidth: 360, background: "var(--surface)",
          border: "1px solid var(--line-strong)", borderRadius: 10,
          boxShadow: "var(--shadow-xl)", padding: 24,
          animation: "scale-in 200ms var(--ease-out-quart)",
        }}
      >
        <h2 id="logout-title" style={{ fontSize: 16.5, fontWeight: 550, letterSpacing: "-0.01em", marginBottom: 8 }}>
          Sign out?
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-tertiary)", lineHeight: 1.6, margin: 0 }}>
          You&apos;ll need to sign in again to get back to your boards.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} autoFocus>Sign out</button>
        </div>
      </div>
    </div>
  );
}
