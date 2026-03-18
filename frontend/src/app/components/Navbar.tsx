"use client";
import { useState } from "react";
import { useAuth } from "@/store/useAuth";
import { useTheme } from "@/store/useTheme";
import { LoginModal } from "./LoginModal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";

export function Navbar() {
  const { token, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
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
        <div style={{
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
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
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

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
                  onClick={logout}
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
                  style={{ padding: '8px 14px', fontSize: '13px' }}
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
