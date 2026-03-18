"use client";
import { useState } from "react";
import { useAuth } from "@/store/useAuth";
import { LoginModal } from "./LoginModal";
import Link from "next/link";
import { Activity, LayoutDashboard, LogOut, User } from "lucide-react";

export function Navbar() {
  const { token, logout, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(23, 43, 77, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100,
        padding: '12px 0'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.5px'
            }}>
              Pulse
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {token ? (
              <>
                <Link 
                  href="/projects"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <LayoutDashboard size={16} /> Boards
                </Link>
                
                <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 8px' }} />

                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: '#0052cc',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={14} />
                  {user?.username || 'User'}
                </div>
                <button
                  onClick={logout}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Sign Out"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Log in
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#0052cc',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#0065ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#0052cc'}
                >
                  Get Pulse for free
                </button>
              </>
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
