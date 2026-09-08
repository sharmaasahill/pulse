"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Navbar } from "@/app/components/Navbar";
import { Eye, EyeOff, Check, AlertTriangle, X } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  isSuperUser: boolean;
  createdAt: string;
};

type Note = { ok: boolean; text: string } | null;

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "security", label: "Security" },
  { id: "account", label: "Account" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityNote, setIdentityNote] = useState<Note>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwNote, setPwNote] = useState<Note>(null);
  // Read-only on load so the browser's autofill skips it; released on focus.
  const [pwLocked, setPwLocked] = useState(true);

  const [active, setActive] = useState("identity");
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const raw = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
    let stored: string | null = null;
    try { if (raw) stored = JSON.parse(raw)?.state?.token ?? null; } catch { /* ignore */ }
    if (!(useAuth.getState().token ?? stored)) { router.push("/"); return; }

    api.get("/users/me")
      .then((r) => {
        const p: Profile = r.data;
        setProfile(p);
        setName(p.name ?? ""); setUsername(p.username); setEmail(p.email);
      })
      .catch((e: any) => { if (e?.response?.status === 401) router.push("/"); })
      .finally(() => setLoading(false));
  }, [router]);

  // Highlight the section currently in view.
  useEffect(() => {
    if (loading) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -62% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  const identityDirty = useMemo(() => {
    if (!profile) return false;
    return name.trim() !== (profile.name ?? "") ||
      username.trim() !== profile.username ||
      email.trim() !== profile.email;
  }, [profile, name, username, email]);

  function resetIdentity() {
    if (!profile) return;
    setName(profile.name ?? ""); setUsername(profile.username); setEmail(profile.email);
    setIdentityNote(null);
  }

  async function saveIdentity() {
    if (!name.trim() || !username.trim() || !email.trim()) {
      setIdentityNote({ ok: false, text: "Name, username and email are all required." });
      return;
    }
    setSavingIdentity(true); setIdentityNote(null);
    try {
      const { data } = await api.patch("/users/me", {
        name: name.trim(), username: username.trim(), email: email.trim(),
      });
      setProfile(data);
      updateUser({ name: data.name ?? "", username: data.username, email: data.email });
      setIdentityNote({ ok: true, text: "Saved." });
    } catch (e: any) {
      setIdentityNote({ ok: false, text: e?.response?.data?.message ?? "Could not save changes." });
    } finally { setSavingIdentity(false); }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) {
      setPwNote({ ok: false, text: "Fill in both password fields." });
      return;
    }
    if (newPassword.length < 6) {
      setPwNote({ ok: false, text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwNote({ ok: false, text: "New password and confirmation don't match." });
      return;
    }
    setSavingPw(true); setPwNote(null);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwNote({ ok: true, text: "Password changed." });
    } catch (e: any) {
      setPwNote({ ok: false, text: e?.response?.data?.message ?? "Could not change password." });
    } finally { setSavingPw(false); }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />

      <style>{`
        .st { max-width: 1000px; margin: 0 auto; padding: calc(var(--navbar-height) + 46px) 32px 140px; }

        .st-head { margin-bottom: 44px; }
        .st-title { font-size: clamp(2.1rem, 4.2vw, 2.9rem); line-height: 1.03; margin: 12px 0 0; }

        .st-grid { display: grid; grid-template-columns: 172px minmax(0, 1fr); gap: 56px; align-items: start; }

        /* Section nav — a quiet ruled list, no pills or boxes. */
        .st-nav { position: sticky; top: calc(var(--navbar-height) + 34px); display: grid; gap: 1px; }
        .st-nav a {
          display: block; padding: 7px 0 7px 13px; font-size: 13.5px;
          color: var(--ink-tertiary); text-decoration: none;
          border-left: 1px solid var(--line);
          transition: color 110ms linear, border-color 110ms linear;
        }
        .st-nav a:hover { color: var(--ink-secondary); }
        .st-nav a[data-on="true"] { color: var(--ink); border-left-color: var(--ink); }

        /* Sections are separated by rules, not wrapped in cards. */
        .st-sec { padding-bottom: 42px; margin-bottom: 42px; border-bottom: 1px solid var(--line); scroll-margin-top: calc(var(--navbar-height) + 28px); }
        .st-sec:last-of-type { border-bottom: none; margin-bottom: 0; }
        .st-sec-h { font-size: 17px; font-weight: 550; letter-spacing: -0.01em; }
        .st-sec-d { font-size: 13.5px; color: var(--ink-tertiary); margin-top: 5px; line-height: 1.6; max-width: 52ch; }

        /* The ledger: label left, control right, hairline between rows. */
        .st-row {
          display: grid; grid-template-columns: 148px minmax(0, 1fr);
          gap: 20px; align-items: center;
          padding: 15px 0; border-bottom: 1px solid var(--line-faint);
        }
        .st-row:first-of-type { border-top: 1px solid var(--line-faint); }
        .st-label { font-size: 13.5px; color: var(--ink-secondary); }
        .st-hint { font-size: 12px; color: var(--ink-faint); margin-top: 3px; }
        .st-static { font-size: 13.5px; color: var(--ink); font-variant-numeric: tabular-nums; }

        .st-actions { display: flex; align-items: center; gap: 12px; margin-top: 20px; }

        /* A save bar only appears when there is something to save. */
        .st-bar {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
          background: rgba(251,250,248,0.92);
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          border-top: 1px solid var(--line);
          animation: rise 200ms var(--ease-out-quart);
        }
        .st-bar-in {
          max-width: 1000px; margin: 0 auto; padding: 13px 32px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }

        .pw-wrap { position: relative; }
        .pw-eye {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          display: grid; place-items: center; width: 26px; height: 26px;
          background: none; border: none; border-radius: 5px; cursor: pointer;
          color: var(--ink-faint); transition: color 110ms linear;
        }
        .pw-eye:hover { color: var(--ink); }

        @media (max-width: 860px) {
          .st { padding: calc(var(--navbar-height) + 28px) 18px 130px; }
          .st-grid { grid-template-columns: 1fr; gap: 28px; }
          .st-nav { position: static; display: flex; gap: 0; overflow-x: auto; border-bottom: 1px solid var(--line); }
          .st-nav a { border-left: none; border-bottom: 2px solid transparent; padding: 8px 14px 10px; white-space: nowrap; }
          .st-nav a[data-on="true"] { border-left-color: transparent; border-bottom-color: var(--ink); }
          .st-row { grid-template-columns: 1fr; gap: 7px; }
          .st-bar-in { padding: 12px 18px; }
        }
      `}</style>

      <div className="st">
        <header className="st-head">
          <span className="eyebrow">Account</span>
          <h1 className="display st-title">Settings</h1>
        </header>

        {loading ? (
          <div style={{ display: "grid", gap: 14, maxWidth: 520 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 20, padding: "15px 0", borderBottom: "1px solid var(--line-faint)" }}>
                <span className="skeleton skeleton-text" style={{ width: 108 }} />
                <span className="skeleton skeleton-text" style={{ flex: 1, maxWidth: 260 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="st-grid">
            <nav className="st-nav" aria-label="Settings sections">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} data-on={active === s.id}>{s.label}</a>
              ))}
            </nav>

            <div>
              {/* ── Identity ── */}
              <section id="identity" className="st-sec">
                <h2 className="st-sec-h">Identity</h2>
                <p className="st-sec-d">
                  How you appear to teammates on shared boards.
                </p>

                <div style={{ marginTop: 22 }}>
                  <div className="st-row">
                    <div>
                      <div className="st-label">Full name</div>
                    </div>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>

                  <div className="st-row">
                    <div>
                      <div className="st-label">Username</div>
                      <div className="st-hint">Must be unique</div>
                    </div>
                    <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" minLength={3} />
                  </div>

                  <div className="st-row">
                    <div>
                      <div className="st-label">Email</div>
                      <div className="st-hint">Used to sign in</div>
                    </div>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>

                {identityNote && !identityDirty && (
                  <div style={{ marginTop: 16 }}><Feedback note={identityNote} /></div>
                )}
              </section>

              {/* ── Security ── */}
              <section id="security" className="st-sec">
                <h2 className="st-sec-h">Security</h2>
                <p className="st-sec-d">
                  Changing your password requires the current one. You&apos;ll get a
                  notification when it changes.
                </p>

                <div style={{ marginTop: 22 }}>
                  <div className="st-row">
                    <div className="st-label">Current password</div>
                    <div className="pw-wrap">
                      <input
                        className="input"
                        type={showPw ? "text" : "password"}
                        name="pulse-current-pw"
                        value={currentPassword}
                        placeholder="••••••••"
                        autoComplete="off"
                        readOnly={pwLocked}
                        onFocus={() => setPwLocked(false)}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button" className="pw-eye"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Hide passwords" : "Show passwords"}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="st-row">
                    <div>
                      <div className="st-label">New password</div>
                      <div className="st-hint">At least 6 characters</div>
                    </div>
                    <input
                      className="input" type={showPw ? "text" : "password"}
                      value={newPassword} placeholder="••••••••" autoComplete="new-password"
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="st-row">
                    <div className="st-label">Confirm</div>
                    <input
                      className="input" type={showPw ? "text" : "password"}
                      value={confirmPassword} placeholder="••••••••" autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && savePassword()}
                    />
                  </div>
                </div>

                <div className="st-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={savePassword}
                    disabled={savingPw || !currentPassword || !newPassword}
                  >
                    {savingPw ? "Updating…" : "Change password"}
                  </button>
                  {pwNote && <Feedback note={pwNote} />}
                </div>
              </section>

              {/* ── Account ── */}
              {profile && (
                <section id="account" className="st-sec">
                  <h2 className="st-sec-h">Account</h2>
                  <p className="st-sec-d">Read-only details about this account.</p>

                  <div style={{ marginTop: 22 }}>
                    <div className="st-row">
                      <div className="st-label">Member since</div>
                      <div className="st-static">
                        {new Date(profile.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="st-row">
                      <div className="st-label">Access level</div>
                      <div className="st-static">{profile.isSuperUser ? "Super user" : "Standard"}</div>
                    </div>
                    <div className="st-row">
                      <div className="st-label">User ID</div>
                      <div className="st-static mono" style={{ fontSize: 12.5, color: "var(--ink-tertiary)", wordBreak: "break-all" }}>
                        {profile.id}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save bar — only present when identity fields differ from what's stored. */}
      {identityDirty && (
        <div className="st-bar">
          <div className="st-bar-in">
            <span style={{ fontSize: 13.5, color: "var(--ink-secondary)" }}>
              {identityNote && !identityNote.ok ? (
                <span style={{ color: "var(--danger)" }}>{identityNote.text}</span>
              ) : (
                "You have unsaved changes."
              )}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={resetIdentity}>Discard</button>
              <button className="btn btn-accent" onClick={saveIdentity} disabled={savingIdentity}>
                {savingIdentity ? "Saving…" : "Save changes"}
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Feedback({ note }: { note: NonNullable<Note> }) {
  return (
    <span
      role="status"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 13, fontWeight: 500,
        color: note.ok ? "var(--success)" : "var(--danger)",
      }}
    >
      {note.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
      {note.text}
    </span>
  );
}
