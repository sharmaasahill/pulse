"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
      // Move focus into the dialog so keyboard users aren't stranded behind it.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    document.body.style.overflow = "";
    const t = setTimeout(() => {
      setMounted(false);
      setEmail(""); setPassword(""); setConfirmPassword("");
      setName(""); setUsername(""); setError("");
    }, 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Escape closes the dialog — expected behaviour for any modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen && !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await register({ email, password, username, fullName: name });
      } else {
        await login({ email, password });
      }
      onSuccess();
      // Let zustand-persist flush the token to localStorage before navigating,
      // so the next page's first API call already carries the Authorization header.
      await new Promise((r) => setTimeout(r, 40));
      router.push("/projects");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <>
      <style>{`
        .auth-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center; padding: 22px;
          background: var(--overlay);
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
          opacity: ${isOpen ? 1 : 0};
          transition: opacity var(--t-base) var(--ease-out-quart);
        }
        .auth-modal {
          position: relative; width: 100%; max-width: 452px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? "none" : "scale(0.97) translate3d(0, 10px, 0)"};
          transition: opacity var(--t-base) var(--ease-out-quart),
                      transform var(--t-slow) var(--ease-spring);
        }
        .auth-tabs {
          position: relative; display: flex;
          border-bottom: 1px solid var(--line);
        }
        .auth-tab {
          flex: 1; padding: 15px 12px; background: none; border: none; cursor: pointer;
          font-size: 13.5px; font-weight: 600; color: var(--ink-tertiary);
          transition: color var(--t-fast) linear;
        }
        .auth-tab[data-active="true"] { color: var(--ink); }
        .auth-tab-bar {
          position: absolute; bottom: -1px; height: 2px; width: 50%;
          background: var(--accent); border-radius: 2px;
          transform: translateX(${isSignup ? "100%" : "0%"});
          transition: transform var(--t-base) var(--ease-out-expo);
        }
        .auth-field { display: grid; gap: 7px; }
        .auth-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--ink-tertiary);
        }
        .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
        .auth-pw-toggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          display: grid; place-items: center; width: 26px; height: 26px;
          background: none; border: none; border-radius: 6px;
          color: var(--ink-tertiary); cursor: pointer;
          transition: color var(--t-fast) linear, background var(--t-fast) linear;
        }
        .auth-pw-toggle:hover { color: var(--ink); background: var(--surface-hover); }
        @media (max-width: 480px) {
          .auth-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="auth-overlay" onClick={onClose} role="presentation">
        <div
          className="auth-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          {/* Header */}
          <div style={{ padding: "26px 26px 20px", display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="display" style={{ fontSize: 25, marginBottom: 6 }}>Pulse</div>
              <p id="auth-title" style={{ fontSize: 14, color: "var(--ink-secondary)", margin: 0 }}>
                {isSignup ? "Create an account to start a board." : "Sign in to your workspace."}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="btn-icon"
              style={{ width: 32, height: 32, flexShrink: 0, border: "1px solid var(--line)" }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              className="auth-tab" role="tab" data-active={!isSignup}
              aria-selected={!isSignup}
              onClick={() => { setMode("login"); setError(""); }}
            >
              Sign in
            </button>
            <button
              className="auth-tab" role="tab" data-active={isSignup}
              aria-selected={isSignup}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              Create account
            </button>
            <span className="auth-tab-bar" aria-hidden />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: 26, display: "grid", gap: 16 }}>
            {isSignup && (
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="af-name">Full name</label>
                  <input
                    id="af-name" ref={isSignup ? firstFieldRef : undefined} className="input" type="text"
                    placeholder="Ada Lovelace" value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name" required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="af-username">Username</label>
                  <input
                    id="af-username" className="input" type="text"
                    placeholder="ada" value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username" minLength={3} required
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="af-email">Email</label>
              <input
                id="af-email" ref={!isSignup ? firstFieldRef : undefined} className="input" type="email"
                placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required
              />
            </div>

            <div className={isSignup ? "auth-row" : ""}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="af-password">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="af-password" className="input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    style={{ paddingRight: 42 }}
                    required
                  />
                  <button
                    type="button" className="auth-pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {isSignup && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="af-confirm">Confirm</label>
                  <input
                    id="af-confirm" className="input" type="password"
                    placeholder="••••••••" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password" required
                  />
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 9,
                  padding: "11px 13px", borderRadius: "var(--r-sm)",
                  background: "var(--danger-tint)", border: "1px solid rgba(190,18,60,0.18)",
                  color: "var(--danger)", fontSize: 13.5, fontWeight: 500,
                  animation: "rise var(--t-base) var(--ease-out-quart)",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-accent btn-lg"
              disabled={loading}
              style={{ width: "100%", marginTop: 2 }}
            >
              {loading ? (
                <span
                  className="spinner"
                  style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.35)" }}
                />
              ) : (
                isSignup ? "Create account" : "Sign in"
              )}
            </button>

            <p style={{ fontSize: 12, color: "var(--ink-tertiary)", textAlign: "center", margin: 0 }}>
              {isSignup ? (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => { setMode("login"); setError(""); }}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent-strong)", fontWeight: 600 }}>
                    Sign in
                  </button>
                </>
              ) : (
                <>New here?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setError(""); }}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent-strong)", fontWeight: 600 }}>
                    Create an account
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
