"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Users, ArrowRight, LogIn } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { token: authToken, user } = useAuth();
  const [status, setStatus] = useState<"loading" | "login" | "joining" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    const inviteToken = params.token as string;
    if (!inviteToken) return;

    // Read fresh token
    const stored = localStorage.getItem("auth-storage");
    let parsedToken: string | null = null;
    try { if (stored) parsedToken = JSON.parse(stored)?.state?.token ?? null; } catch { /* ignore */ }
    const jwt = authToken ?? parsedToken;

    if (!jwt) {
      // Not logged in — show login prompt
      localStorage.setItem("pulse:pending-invite", inviteToken);
      setStatus("login");
      return;
    }

    // Logged in — try to join
    setStatus("joining");
    setAuthToken(jwt);
    api.post(`/invites/join/${inviteToken}`)
      .then(({ data }) => {
        setProjectName(data.project?.name || "Project");
        if (data.alreadyMember) {
          setMessage("You're already a member!");
        } else {
          setMessage("Successfully joined!");
        }
        setStatus("success");
      })
      .catch((err) => {
        setMessage(err?.response?.data?.message || "Invalid or expired invite link");
        setStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)", padding: 24,
    }}>
      <div className="glass" style={{
        width: "100%", maxWidth: 440, borderRadius: "var(--radius-lg)",
        padding: "40px 32px", textAlign: "center",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-xl)",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "var(--radius-full)",
          background: status === "error" ? "var(--danger-soft)" : "var(--accent-primary-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Users size={28} color={status === "error" ? "var(--danger)" : "var(--accent-primary)"} />
        </div>

        {status === "loading" && (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Checking invite...</p>
        )}

        {status === "login" && (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              You've Been Invited!
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>
              Log in or create an account to join this project.
            </p>
            <button onClick={() => router.push("/")} style={{
              width: "100%", padding: "12px 0", borderRadius: "var(--radius-md)",
              border: "none", background: "var(--accent-gradient)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <LogIn size={16} /> Go to Login
            </button>
          </>
        )}

        {status === "joining" && (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              Joining Project...
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Please wait</p>
          </>
        )}

        {status === "success" && (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {projectName}
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--success)" }}>
              ✅ {message}
            </p>
            <button onClick={() => router.push("/projects")} style={{
              width: "100%", padding: "12px 0", borderRadius: "var(--radius-md)",
              border: "none", background: "var(--accent-gradient)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              Invite Failed
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--danger)" }}>
              {message}
            </p>
            <button onClick={() => router.push("/")} style={{
              width: "100%", padding: "12px 0", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-primary)",
              background: "var(--bg-secondary)", color: "var(--text-primary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
