"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { X, Crown, Edit, Eye, UserMinus, LogOut } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; email: string; username: string; name?: string };
};

export function MembersPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/members/${projectId}`);
      setMembers(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function changeRole(memberId: string, role: string) {
    try {
      await api.patch(`/members/${memberId}/role`, { role });
      load();
    } catch { /* ignore */ }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    try {
      await api.delete(`/members/${memberId}`);
      load();
    } catch { /* ignore */ }
  }

  async function leaveProject() {
    if (!confirm("Leave this project? You'll lose access.")) return;
    try {
      await api.delete(`/members/${projectId}/leave`);
      window.location.href = "/projects";
    } catch { /* ignore */ }
  }

  const myMembership = members.find(m => m.userId === user?.id);
  const isOwner = myMembership?.role === "OWNER";

  const roleIcon = (role: string) => {
    if (role === "OWNER") return <Crown size={12} color="#f59e0b" />;
    if (role === "EDITOR") return <Edit size={12} color="var(--success)" />;
    return <Eye size={12} color="var(--text-tertiary)" />;
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      OWNER: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
      EDITOR: { bg: "var(--success-soft)", color: "var(--success)" },
      VIEWER: { bg: "rgba(255,255,255,0.06)", color: "var(--text-tertiary)" },
    };
    const c = colors[role] || colors.VIEWER;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: "var(--radius-full)",
        background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      }}>
        {roleIcon(role)} {role}
      </span>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-overlay)", backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div className="glass" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, borderRadius: "var(--radius-lg)",
        padding: 0, overflow: "hidden", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-xl)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--accent-primary-soft)", flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Members ({members.length})
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)" }}>
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
          ) : members.map(member => (
            <div key={member.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 24px",
              borderBottom: "1px solid var(--border-secondary)",
              transition: "background 0.15s ease",
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-full)",
                background: "var(--accent-gradient)", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {(member.user.name || member.user.username).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {member.user.name || member.user.username}
                  {member.userId === user?.id && (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>(you)</span>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: "var(--text-tertiary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {member.user.email}
                </div>
              </div>

              {/* Role badge or role selector */}
              {isOwner && member.role !== "OWNER" ? (
                <select
                  value={member.role}
                  onChange={e => changeRole(member.id, e.target.value)}
                  style={{
                    padding: "4px 8px", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-primary)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              ) : (
                roleBadge(member.role)
              )}

              {/* Remove button */}
              {isOwner && member.role !== "OWNER" && (
                <button onClick={() => removeMember(member.id)} className="btn-icon"
                  style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", color: "var(--danger)", flexShrink: 0 }}>
                  <UserMinus size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer — Leave button for non-owners */}
        {myMembership && !isOwner && (
          <div style={{
            padding: "12px 24px", borderTop: "1px solid var(--border-primary)", flexShrink: 0,
          }}>
            <button onClick={leaveProject} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-primary)",
              background: "var(--danger-soft)", color: "var(--danger)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <LogOut size={14} /> Leave Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
