"use client";
import { useState } from "react";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";

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

  if (!isOpen) return null;

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
        await register({ email, password, username, name });
      } else {
        await login({ email, password });
      }
      resetForm();
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
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '0', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 28px 20px',
          background: 'var(--accent-gradient)',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Zap size={22} color="white" fill="white" />
            <span style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Pulse</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: 0 }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your free account.'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: mode === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: mode === tab ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'signup' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Username
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '12px',
              fontSize: '14px',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
