"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTimeout(() => {
        setMounted(false);
        resetForm();
      }, 400); // Wait for exit animation
    }
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  function resetForm() {
    setEmail(''); setPassword(''); setConfirmPassword('');
    setName(''); setUsername(''); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register({ email, password, username, fullName: name });
      } else {
        await login({ email, password });
      }
      onSuccess();
      router.push('/projects');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .auth-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          opacity: ${isOpen ? 1 : 0};
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .auth-modal {
          position: relative;
          width: 100%; max-width: 480px;
          background: rgba(17, 17, 17, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 32px 64px -12px rgba(0,0,0,0.6);
          overflow: hidden;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)'};
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .auth-glow {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.15), transparent 50%);
          pointer-events: none; z-index: 0;
        }
        .auth-content {
          position: relative; z-index: 1;
        }
        .auth-input-group {
          position: relative; margin-bottom: 20px;
        }
        .auth-input {
          width: 100%; background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 16px 16px 16px 16px;
          color: #fff; font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
        }
        .auth-input:focus {
          border-color: rgba(249, 115, 22, 0.5);
          background: rgba(0,0,0,0.5);
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
        }
        .auth-input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .auth-label {
          display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6);
          margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .auth-tab {
          flex: 1; padding: 16px; background: none; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.4);
          position: relative; transition: color 0.3s ease;
        }
        .auth-tab.active { color: #fff; }
        .auth-tab-indicator {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          background: #f97316;
          transform-origin: center; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .auth-btn {
          width: 100%; padding: 16px; border-radius: 12px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff; font-size: 16px; font-weight: 700;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .auth-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .auth-btn:active { transform: translateY(0); }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
      `}</style>
      
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <div className="auth-glow" />
          
          <div className="auth-content">
            {/* Header */}
            <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pulse</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                  {mode === 'login' ? 'Welcome back. Sign in to your workspace.' : 'Start managing projects the smart way.'}
                </p>
              </div>
              <button onClick={onClose} style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginTop: '24px' }}>
              <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
                Sign In
                {mode === 'login' && <div className="auth-tab-indicator" />}
              </button>
              <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>
                Create Account
                {mode === 'signup' && <div className="auth-tab-indicator" />}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
              {mode === 'signup' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', animation: 'fadeIn 0.3s forwards' }}>
                  <div className="auth-input-group" style={{ marginBottom: '0' }}>
                    <label className="auth-label">Full Name</label>
                    <input className="auth-input" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="auth-input-group" style={{ marginBottom: '0' }}>
                    <label className="auth-label">Username</label>
                    <input className="auth-input" type="text" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>
                </div>
              )}

              <div className="auth-input-group" style={{ marginTop: mode === 'signup' ? '20px' : '0' }}>
                <label className="auth-label">Email Address</label>
                <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              {mode === 'signup' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', animation: 'fadeIn 0.3s forwards' }}>
                  <div className="auth-input-group" style={{ marginBottom: '0' }}>
                    <label className="auth-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="auth-input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0
                      }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-input-group" style={{ marginBottom: '0' }}>
                    <label className="auth-label">Confirm Pass</label>
                    <input className="auth-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  </div>
                </div>
              ) : (
                <div className="auth-input-group">
                  <label className="auth-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="auth-input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '48px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0
                    }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444', fontSize: '14px', fontWeight: '500', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <div style={{ width: '4px', height: '16px', background: '#ef4444', borderRadius: '2px' }} />
                  {error}
                </div>
              )}

              <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: mode === 'signup' ? '12px' : '24px' }}>
                {loading ? (
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
