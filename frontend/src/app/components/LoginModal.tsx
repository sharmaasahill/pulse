"use client";
import { FormEvent, useState } from "react";
import { useAuth } from "@/store/useAuth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, register } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      if (isLoginView) {
        await login({ email, password });
      } else {
        await register({ email, username, fullName, password });
      }
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(errorMessage || 'Authentication failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setIsLoginView(true);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setUsername("");
    setError("");
    onClose();
  }

  const inputStyle = {
    width: '100%',
    fontSize: '15px', 
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    background: '#0f0f0f',
    transition: 'border-color 0.2s',
    color: '#ffffff',
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block', 
    fontSize: '13px', 
    fontWeight: '500', 
    color: '#9ca3af', 
    marginBottom: '6px'
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '450px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid #2a2a2a',
          position: 'relative'
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            color: '#9ca3af',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#252525';
            e.currentTarget.style.color = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
            {isLoginView ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>
            {isLoginView ? 'Sign in to access your projects' : 'Sign up to start organizing your work'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#2a1a1a',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input 
                  type="text"
                  placeholder="John Doe" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input 
                  type="text"
                  placeholder="johndoe123" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={inputStyle}
                  minLength={3}
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email address</label>
            <input 
              type="email"
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input 
              type="password"
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              minLength={6}
            />
          </div>

          {!isLoginView && (
            <div>
              <label style={labelStyle}>Re-enter Password</label>
              <input 
                type="password"
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle}
                minLength={6}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              fontSize: '16px', 
              padding: '14px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              border: 'none',
              fontWeight: '600',
              color: '#0f0f0f',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              marginTop: '8px'
            }}
          >
            {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError("");
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontWeight: '600',
                marginLeft: '8px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLoginView ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
