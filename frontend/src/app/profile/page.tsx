"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Navbar } from "@/app/components/Navbar";
import { User, Mail, AtSign, Lock, Shield, Calendar, Check, AlertCircle, Save } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  isSuperUser: boolean;
  createdAt: string;
};

type Banner = { kind: "success" | "error"; text: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile details form
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileBanner, setProfileBanner] = useState<Banner>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState<Banner>(null);
  // Start the current-password field read-only so the browser's autofill skips
  // it on load; we lift that as soon as the user actually focuses it.
  const [currentPwReadOnly, setCurrentPwReadOnly] = useState(true);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Guard: must be logged in. Mirror the token bootstrap used elsewhere.
    const stored = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
    let parsedToken: string | null = null;
    try { if (stored) parsedToken = JSON.parse(stored)?.state?.token ?? null; } catch { /* ignore */ }
    const token = useAuth.getState().token ?? parsedToken;
    if (!token) { router.push("/"); return; }

    api.get("/users/me")
      .then(res => {
        const p: Profile = res.data;
        setProfile(p);
        setName(p.name ?? "");
        setUsername(p.username ?? "");
        setEmail(p.email ?? "");
      })
      .catch((err: any) => {
        if (err?.response?.status === 401) router.push("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function saveProfile() {
    setProfileBanner(null);
    if (!name.trim() || !username.trim() || !email.trim()) {
      setProfileBanner({ kind: "error", text: "Name, username and email are all required." });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.patch("/users/me", {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
      });
      const updated: Profile = res.data;
      setProfile(updated);
      // Keep the Navbar / rest of the app in sync immediately.
      updateUser({ name: updated.name ?? "", username: updated.username, email: updated.email });
      setProfileBanner({ kind: "success", text: "Profile updated." });
    } catch (err: any) {
      setProfileBanner({ kind: "error", text: err?.response?.data?.message || "Could not update profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPasswordBanner(null);
    if (!currentPassword || !newPassword) {
      setPasswordBanner({ kind: "error", text: "Please fill in both password fields." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordBanner({ kind: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordBanner({ kind: "error", text: "New password and confirmation do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordBanner({ kind: "success", text: "Password changed successfully." });
    } catch (err: any) {
      setPasswordBanner({ kind: "error", text: err?.response?.data?.message || "Could not change password." });
    } finally {
      setSavingPassword(false);
    }
  }

  const dirtyProfile = !!profile && (
    name.trim() !== (profile.name ?? "") ||
    username.trim() !== profile.username ||
    email.trim() !== profile.email
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <style>{`
        .settings-input {
          width: 100%; background: var(--bg-primary); border: 1px solid var(--border-primary);
          border-radius: 10px; padding: 11px 12px 11px 38px; color: var(--text-primary);
          font-size: 14px; outline: none; transition: border-color 0.15s; font-family: inherit;
        }
        .settings-input:focus { border-color: var(--accent-primary); }
        .settings-card {
          background: var(--bg-hover); border: 1px solid var(--border-primary);
          border-radius: 16px; padding: 24px; margin-bottom: 20px;
        }
        .settings-field { position: relative; margin-bottom: 16px; }
        .settings-field > svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
        .settings-label { display: block; font-size: 11px; font-weight: 700; color: var(--text-tertiary); margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.06em; }
        .settings-save {
          background: var(--accent-gradient); border: none; color: #fff; font-size: 13px; font-weight: 700;
          padding: 10px 18px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          font-family: inherit; transition: opacity 0.15s;
        }
        .settings-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "calc(var(--navbar-height) + 32px) 20px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Account Settings</h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14, margin: "0 0 28px" }}>
          Manage your profile information and password.
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div style={{ width: 36, height: 36, border: "3px solid var(--border-primary)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* ── Profile details ── */}
            <div className="settings-card">
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <User size={17} color="var(--accent-primary)" /> Profile
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, margin: "0 0 20px" }}>
                Your display name and how teammates find you.
              </p>

              <div>
                <label className="settings-label">Full name</label>
                <div className="settings-field">
                  <User size={15} />
                  <input className="settings-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
              </div>

              <div>
                <label className="settings-label">Username</label>
                <div className="settings-field">
                  <AtSign size={15} />
                  <input className="settings-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
                </div>
              </div>

              <div>
                <label className="settings-label">Email</label>
                <div className="settings-field">
                  <Mail size={15} />
                  <input className="settings-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>

              {profileBanner && <Banner banner={profileBanner} />}

              <button className="settings-save" onClick={saveProfile} disabled={savingProfile || !dirtyProfile}>
                <Save size={15} /> {savingProfile ? "Saving…" : "Save changes"}
              </button>
            </div>

            {/* ── Change password ── */}
            <div className="settings-card">
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={17} color="var(--accent-primary)" /> Password
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, margin: "0 0 20px" }}>
                Use at least 6 characters. You&apos;ll need your current password.
              </p>

              <div>
                <label className="settings-label">Current password</label>
                <div className="settings-field">
                  <Lock size={15} />
                  <input
                    className="settings-input"
                    type="password"
                    name="pulse-current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    readOnly={currentPwReadOnly}
                    onFocus={() => setCurrentPwReadOnly(false)}
                  />
                </div>
              </div>

              <div>
                <label className="settings-label">New password</label>
                <div className="settings-field">
                  <Lock size={15} />
                  <input className="settings-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </div>
              </div>

              <div>
                <label className="settings-label">Confirm new password</label>
                <div className="settings-field">
                  <Lock size={15} />
                  <input className="settings-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </div>
              </div>

              {passwordBanner && <Banner banner={passwordBanner} />}

              <button className="settings-save" onClick={savePassword} disabled={savingPassword}>
                <Lock size={15} /> {savingPassword ? "Updating…" : "Update password"}
              </button>
            </div>

            {/* ── Account info (read-only) ── */}
            {profile && (
              <div className="settings-card" style={{ marginBottom: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={17} color="var(--accent-primary)" /> Account
                </h2>
                <InfoRow icon={<Calendar size={15} />} label="Member since"
                  value={new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />
                <InfoRow icon={<Shield size={15} />} label="Role"
                  value={profile.isSuperUser ? "Super user" : "Standard user"} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Banner({ banner }: { banner: NonNullable<Banner> }) {
  const isOk = banner.kind === "success";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 12px",
      borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: isOk ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
      color: isOk ? "#10b981" : "#ef4444",
      border: `1px solid ${isOk ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
    }}>
      {isOk ? <Check size={15} /> : <AlertCircle size={15} />} {banner.text}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-primary)" }}>
      <span style={{ color: "var(--text-tertiary)", display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 13, color: "var(--text-tertiary)", width: 120 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
