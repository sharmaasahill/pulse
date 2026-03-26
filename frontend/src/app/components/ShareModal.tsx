"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { X, Copy, RefreshCw, Link, Key, Clock, Shield, Check } from "lucide-react";

type Invite = {
  id: string;
  projectId: string;
  token: string;
  code: string;
  role: string;
  enabled: boolean;
  expiresAt: string | null;
};

const EXPIRY_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "Never expires", days: null },
];

export function ShareModal({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: () => void }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/invites/${projectId}`);
      setInvite(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function regenerate() {
    setRegenerating(true);
    try {
      const { data } = await api.post(`/invites/${projectId}/regenerate`);
      setInvite(data);
    } catch { /* ignore */ }
    finally { setRegenerating(false); }
  }

  async function toggleEnabled() {
    if (!invite) return;
    try {
      const { data } = await api.patch(`/invites/${projectId}/enabled`, { enabled: !invite.enabled });
      setInvite(data);
    } catch { /* ignore */ }
  }

  async function setExpiry(days: number | null) {
    const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    try {
      const { data } = await api.patch(`/invites/${projectId}/expiry`, { expiresAt });
      setInvite(data);
    } catch { /* ignore */ }
  }

  async function setRole(role: string) {
    try {
      const { data } = await api.patch(`/invites/${projectId}/role`, { role });
      setInvite(data);
    } catch { /* ignore */ }
  }

  function copyToClipboard(text: string, type: "link" | "code") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const inviteLink = invite ? `${window.location.origin}/invite/${invite.token}` : "";

  function getExpiryLabel() {
    if (!invite?.expiresAt) return "Never expires";
    const exp = new Date(invite.expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return "Expired";
    if (daysLeft === 1) return "Expires tomorrow";
    return `Expires in ${daysLeft} days`;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-overlay)", backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div className="glass" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, borderRadius: "var(--radius-lg)",
        padding: 0, overflow: "hidden",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-xl)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--accent-primary-soft)",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Share Project
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              {projectName}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)" }}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
        ) : invite ? (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Invite Link */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Link size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Invite Link</span>
              </div>
              <div style={{
                display: "flex", gap: 8,
                background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)", padding: "8px 12px",
                alignItems: "center", overflow: "hidden",
              }}>
                <span style={{
                  flex: 1, fontSize: 12, color: invite.enabled ? "var(--text-secondary)" : "var(--text-tertiary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textDecoration: invite.enabled ? "none" : "line-through",
                }}>
                  {inviteLink}
                </span>
                <button onClick={() => copyToClipboard(inviteLink, "link")} className="btn-icon"
                  style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", flexShrink: 0 }}>
                  {copied === "link" ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Access Code */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Key size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Access Code</span>
              </div>
              <div style={{
                display: "flex", gap: 8,
                background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)", padding: "8px 12px",
                alignItems: "center",
              }}>
                <span style={{
                  flex: 1, fontSize: 18, fontWeight: 800, color: invite.enabled ? "var(--accent-primary)" : "var(--text-tertiary)",
                  letterSpacing: "4px", fontFamily: "monospace",
                  textDecoration: invite.enabled ? "none" : "line-through",
                }}>
                  {invite.code}
                </span>
                <button onClick={() => copyToClipboard(invite.code, "code")} className="btn-icon"
                  style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", flexShrink: 0 }}>
                  {copied === "code" ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Default Role */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Shield size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>New Members Join As</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["EDITOR", "VIEWER"] as const).map(role => (
                  <button key={role} onClick={() => setRole(role)} style={{
                    flex: 1, padding: "8px 0", borderRadius: "var(--radius-md)",
                    border: invite.role === role ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-primary)",
                    background: invite.role === role ? "var(--accent-primary-soft)" : "var(--bg-secondary)",
                    color: invite.role === role ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}>
                    {role === "EDITOR" ? "✏️ Editor" : "👁️ Viewer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Clock size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Link Expiry</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                  {getExpiryLabel()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EXPIRY_OPTIONS.map(opt => {
                  const isActive = opt.days === null
                    ? !invite.expiresAt
                    : invite.expiresAt && Math.abs(
                        Math.round((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) - opt.days
                      ) <= 1;
                  return (
                    <button key={opt.label} onClick={() => setExpiry(opt.days)} style={{
                      padding: "6px 12px", borderRadius: "var(--radius-full)",
                      border: isActive ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-primary)",
                      background: isActive ? "var(--accent-primary-soft)" : "transparent",
                      color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions Row */}
            <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-primary)", paddingTop: 16 }}>
              <button onClick={regenerate} disabled={regenerating} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 0", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)", color: "var(--text-secondary)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                opacity: regenerating ? 0.5 : 1,
              }}>
                <RefreshCw size={14} style={{ animation: regenerating ? "spin 1s linear infinite" : "none" }} />
                Regenerate
              </button>
              <button onClick={toggleEnabled} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 0", borderRadius: "var(--radius-md)",
                border: "none",
                background: invite.enabled ? "var(--danger-soft)" : "var(--success-soft)",
                color: invite.enabled ? "var(--danger)" : "var(--success)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {invite.enabled ? "Disable Link" : "Enable Link"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
