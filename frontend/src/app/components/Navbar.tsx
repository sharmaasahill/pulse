"use client";
import { useState } from "react";
import { useAuth } from "@/store/useAuth";
import { LoginModal } from "./LoginModal";
import { NotificationBell } from "./NotificationBell";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";

export function Navbar() {
  const { token, logout, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || '?';

  return (
    <>
      <nav className="glass" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--navbar-height)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-primary)',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderRadius: 0,
      }}>
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/" style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
            }}>
              Pulse
            </span>
          </Link>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {token ? (
              <>
                <Link
                  href={pathname === '/' ? '/projects' : '/'}
                  className="btn-icon"
                  title={pathname === '/' ? 'Dashboard' : 'Home'}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <LayoutDashboard size={18} />
                </Link>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)', margin: '0 8px' }} />

                <NotificationBell />

                {/* User badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 12px 4px 4px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-primary)',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'white',
                    letterSpacing: '0.5px',
                  }}>
                    {initials}
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                  }}>
                    {user?.username || 'User'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="btn-icon"
                  title="Sign Out"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn-ghost"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}
                >
                  Log in
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Get Started Free
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
    </>
  );
}
