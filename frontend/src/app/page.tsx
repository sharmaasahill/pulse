"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { LoginModal } from "./components/LoginModal";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Users, Shield, BarChart3,
  Columns3, Zap, CheckCircle, TrendingUp, ChevronRight, Menu, X,
  Github, Slack, Figma, Twitter, Heart,
  Terminal, Globe
} from "lucide-react";

/* ── Responsive styles injected as a style tag ── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  .lp-root * { box-sizing: border-box; }
  .lp-root { font-family: 'Inter', -apple-system, sans-serif; }

  /* ── Navbar ── */
  .lp-nav { 
    display: flex; align-items: center; justify-content: space-between; 
    position: relative; width: 100%; max-width: 1200px; margin: 0 auto; 
    padding: 0 28px; height: 58px;
  }
  .lp-nav-logo { flex: 1; display: flex; justify-content: flex-start; }
  .lp-nav-actions { flex: 1; display: flex; gap: 12px; align-items: center; justify-content: flex-end; }
  
  /* Absolute center for nav links */
  .lp-nav-links { 
    display: flex; gap: 32px; align-items: center; 
    position: absolute; left: 50%; transform: translateX(-50%);
  }
  .lp-nav-link {
    font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.5);
    text-decoration: none; transition: color 0.2s;
  }
  .lp-nav-link:hover { color: #fff; }
  .lp-hamburger { display: none; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); }

  /* ── Hero ── */
  .lp-hero-content { text-align: center; max-width: 860px; width: 100%; position: relative; z-index: 10; }
  .lp-hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  
  /* ── Bento Dashboard ── */
  .lp-bento-main { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 12px; }
  .lp-bento-kanban { grid-column: 1; grid-row: 1; }
  .lp-bento-metric { grid-column: 2; grid-row: 1; }
  .lp-bento-tasks { grid-column: 1; grid-row: 2; }
  .lp-bento-activity { grid-column: 2; grid-row: 2; }
  .lp-kanban-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

  /* ── Stats ── */
  .lp-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center; }

  /* ── Features ── */
  .lp-features-bento {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 14px;
  }
  .lp-feat-1 { grid-column: 1 / 3; grid-row: 1; }
  .lp-feat-2 { grid-column: 3; grid-row: 1; }
  .lp-feat-3 { grid-column: 1; grid-row: 2; }
  .lp-feat-4 { grid-column: 2; grid-row: 2; }
  .lp-feat-5 { grid-column: 3 / 4; grid-row: 2; }

  /* ── Steps ── */
  .lp-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

  /* ── Testimonials ── */
  .lp-test-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

  /* ── Pricing ── */
  .lp-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 800px; margin: 0 auto; }

  /* ── Tech stack ── */
  .lp-tech-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  /* ── Section container ── */
  .lp-section { padding: 100px 48px; }
  .lp-container { max-width: 1100px; margin: 0 auto; }
  .lp-container-sm { max-width: 900px; margin: 0 auto; }

  /* ── Divider ── */
  .lp-divider { border-top: 1px solid rgba(255,255,255,0.05); }

  /* ── Card ── */
  .lp-card { border-radius: 16px; padding: 28px; position: relative; overflow: hidden; }
  .lp-card-dark { background: #1c1c1e; border: 1px solid rgba(255,255,255,0.07); }
  .lp-card-orange { background: #f97316; }
  .lp-card-hover { transition: all 0.25s; cursor: default; }
  .lp-card-hover:hover { transform: translateY(-3px); border-color: rgba(249,115,22,0.4) !important; }

  /* ── Btn ── */
  .lp-btn-orange {
    background: #f97316; border: none; color: #fff;
    font-size: 15px; font-weight: 700; cursor: pointer;
    padding: 14px 28px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s; box-shadow: 0 4px 24px rgba(249,115,22,0.3);
    font-family: inherit; white-space: nowrap;
  }
  .lp-btn-orange:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(249,115,22,0.45); background: #ea6c0a; }
  .lp-btn-ghost {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.8); font-size: 15px; font-weight: 600;
    padding: 14px 28px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    text-decoration: none; transition: all 0.2s; font-family: inherit; white-space: nowrap;
  }
  .lp-btn-ghost:hover { background: rgba(255,255,255,0.12); color: #fff; }

  /* ── Animations ── */
  @keyframes lp-float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-15px) scale(1.02); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lp-orb-1 { animation: lp-float 8s ease-in-out infinite; }
  .lp-orb-2 { animation: lp-float 10s ease-in-out infinite reverse; }

  /* ═══════════════════════════════
     TABLET  ≤ 1024px
  ═══════════════════════════════ */
  @media (max-width: 1024px) {
    .lp-section { padding: 80px 32px; }
    .lp-bento-main { grid-template-columns: 1fr 1fr; }
    .lp-bento-metric { display: none; }
    .lp-bento-tasks { grid-column: 2; grid-row: 1; }
    .lp-bento-activity { grid-column: 1 / 3; grid-row: 2; }
    .lp-features-bento { grid-template-columns: 1fr 1fr; }
    .lp-feat-1 { grid-column: 1 / 3; grid-row: 1; }
    .lp-feat-2 { grid-column: 1; grid-row: 2; }
    .lp-feat-3 { grid-column: 2; grid-row: 2; }
    .lp-feat-4 { grid-column: 1; grid-row: 3; }
    .lp-feat-5 { grid-column: 2; grid-row: 3; }
    .lp-tech-grid { grid-template-columns: repeat(3, 1fr); }
    .lp-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .lp-test-grid { grid-template-columns: 1fr 1fr; }
    
    /* Hide nav links on tablet so it doesn't collide with logo */
    .lp-nav-links { display: none; }
    .lp-hamburger { display: block; }
  }

  /* ═══════════════════════════════
     MOBILE  ≤ 640px
  ═══════════════════════════════ */
  @media (max-width: 640px) {
    .lp-section { padding: 60px 20px; }
    .lp-nav-actions .lp-login-btn, .lp-nav-actions .lp-btn-orange { display: none; }

    .lp-hero-content h1 { font-size: 34px !important; }
    .lp-hero-content p { font-size: 16px !important; }
    .lp-hero-btns { flex-direction: column; align-items: stretch; }
    .lp-btn-orange, .lp-btn-ghost { width: 100%; }

    .lp-bento-main { grid-template-columns: 1fr; }
    .lp-bento-kanban { grid-column: 1; grid-row: 1; }
    .lp-bento-metric { display: block; grid-column: 1; grid-row: 2; }
    .lp-bento-tasks { grid-column: 1; grid-row: 3; }
    .lp-bento-activity { grid-column: 1; grid-row: 4; }
    .lp-kanban-cols { grid-template-columns: 1fr; gap: 8px; }

    .lp-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }

    .lp-features-bento { grid-template-columns: 1fr; }
    .lp-feat-1 { grid-column: 1; grid-row: 1; }
    .lp-feat-2 { grid-column: 1; grid-row: 2; }
    .lp-feat-3 { grid-column: 1; grid-row: 3; }
    .lp-feat-4 { grid-column: 1; grid-row: 4; }
    .lp-feat-5 { grid-column: 1; grid-row: 5; }

    .lp-steps-grid { grid-template-columns: 1fr; gap: 16px; }
    .lp-test-grid { grid-template-columns: 1fr; gap: 16px; }
    .lp-price-grid { grid-template-columns: 1fr; gap: 16px; }
    .lp-tech-grid { grid-template-columns: repeat(2, 1fr); }

    .lp-section-title { font-size: 28px !important; }
    .lp-footer-inner { flex-direction: column; gap: 16px; text-align: center; }
  }
`;

/* ──────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1800, t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Task pill ── */
function TaskPill({ label, done, color }: { label: string; done: boolean; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: done ? 'rgba(255,255,255,0.04)' : color + '18',
      borderRadius: '10px', padding: '10px 14px', marginBottom: '7px',
      border: `1px solid ${done ? 'rgba(255,255,255,0.05)' : color + '40'}`,
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
        background: done ? 'rgba(255,255,255,0.08)' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done && <CheckCircle size={11} color="rgba(255,255,255,0.5)" />}
      </div>
      <span style={{
        fontSize: '13px', fontWeight: '500', flex: 1,
        color: done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
        textDecoration: done ? 'line-through' : 'none',
      }}>{label}</span>
    </div>
  );
}

/* ── Icon Box ── */
function IconBox({ icon, color }: { icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      width: '44px', height: '44px', borderRadius: '12px', marginBottom: '20px',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{icon}</div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const sectionIntegrations = useInView();
  const sectionFeatures = useInView();
  const sectionSteps = useInView();
  const sectionTestimonials = useInView();
  const sectionPricing = useInView();
  const sectionTech = useInView();
  const sectionCta = useInView();

  const go = () => token ? router.push('/projects') : setShowLogin(true);
  const navLinks = ['Features', 'How It Works', 'Testimonials'];

  return (
    <div className="lp-root" style={{ background: '#111111', color: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ════════════════ NAVBAR ════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(17,17,17,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="lp-nav">
          {/* Left: Logo */}
          <div className="lp-nav-logo">
            <span style={{
              fontSize: '20px', fontWeight: '900', letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              cursor: 'pointer',
            }} onClick={() => window.scrollTo(0,0)}>Pulse</span>
          </div>

          {/* Center: Nav links */}
          <nav className="lp-nav-links">
            {navLinks.map(label => (
              <a key={label} className="lp-nav-link"
                href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}>
                {label}
              </a>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="lp-nav-actions">
            <button className="lp-login-btn" onClick={go} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)',
              fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: '8px 16px',
              fontFamily: 'inherit',
            }}>Log in</button>
            <button className="lp-btn-orange" onClick={go} style={{
              fontSize: '13px', padding: '8px 18px', borderRadius: '10px',
            }}>
              Get Started
            </button>
            {/* Hamburger (Mobile/Tablet only) */}
            <button className="lp-hamburger" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            background: '#1a1a1a', borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            {navLinks.map(label => (
              <a key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '12px 0', fontSize: '15px', fontWeight: '500',
                  color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >{label}</a>
            ))}
            <button className="lp-btn-orange" onClick={() => { setMenuOpen(false); go(); }}
              style={{ marginTop: '16px', padding: '12px', justifyContent: 'center' }}>
              Get Started Free
            </button>
            <button className="lp-btn-ghost" onClick={() => { setMenuOpen(false); go(); }}
              style={{ marginTop: '8px', padding: '12px', justifyContent: 'center', border: 'none' }}>
              Log in
            </button>
          </div>
        )}
      </header>

      {/* ════════════════ HERO ════════════════ */}
      <section style={{
        minHeight: '100vh', paddingTop: '58px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Abstract Grid BG */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.2,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
          pointerEvents: 'none',
        }} />
        {/* Glow orbs */}
        <div className="lp-orb-1" style={{
          position: 'absolute', width: '800px', height: '500px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 60%)',
          top: '0%', left: '50%', transform: 'translateX(-50%)',
        }} />
        <div className="lp-orb-2" style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)',
          bottom: '10%', right: '-10%',
        }} />

        <div className="lp-hero-content">
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '100px',
            background: 'rgba(249,115,22,0.1) ',
            border: '1px solid rgba(249,115,22,0.2)',
            fontSize: '13px', fontWeight: '600', color: '#fb923c',
            marginBottom: '32px', letterSpacing: '0.01em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
            Pulse 2.0 is now live
          </div>

          <h1 style={{
            fontSize: 'clamp(42px, 7vw, 84px)',
            fontWeight: '900', lineHeight: '1.05',
            letterSpacing: '-0.04em', marginBottom: '24px',
            textShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            Manage projects the{' '}
            <span style={{ color: '#f97316', display: 'inline-block' }}>smart way</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'rgba(255,255,255,0.5)',
            maxWidth: '560px', margin: '0 auto 40px',
            lineHeight: '1.6',
          }}>
            Pulse gives your team a real-time Kanban workspace. Drag tasks, 
            track velocity, and collaborate — all in one clean dashboard.
          </p>

          <div className="lp-hero-btns" style={{ marginBottom: '80px' }}>
            <button className="lp-btn-orange" onClick={go} style={{ padding: '16px 32px', fontSize: '16px' }}>
              {token ? 'Open Dashboard' : 'Start for free'}
              <ArrowRight size={18} />
            </button>
            <a href="#features" className="lp-btn-ghost" style={{ padding: '16px 32px', fontSize: '16px' }}>
              See how it works <ChevronRight size={18} />
            </a>
          </div>

          {/* ── Dashboard Bento Preview ── */}
          <div style={{
            background: '#161616',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '20px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02) inset',
            width: '100%',
          }}>
            {/* Window dots */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', paddingLeft: '8px', paddingTop: '4px' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
              ))}
            </div>

            <div className="lp-bento-main">
              {/* Kanban board */}
              <div className="lp-bento-kanban lp-card lp-card-dark" style={{ textAlign: 'left', animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Board — Sprint 12</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />)}
                  </div>
                </div>
                <div className="lp-kanban-cols">
                  {[
                    { title: 'To Do', color: 'rgba(255,255,255,0.2)', tasks: ['Design hero section', 'Write copy'] },
                    { title: 'In Progress', color: '#f97316', tasks: ['API integration', 'Auth flow'] },
                    { title: 'Done', color: '#10b981', tasks: ['Setup CI/CD', 'DB schema'] },
                  ].map(col => (
                    <div key={col.title}>
                      <div style={{
                        fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        marginBottom: '10px', paddingBottom: '8px',
                        borderBottom: `2px solid ${col.color}`,
                      }}>{col.title}</div>
                      {col.tasks.map((t, j) => (
                        <div key={j} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
                        }}>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px', fontWeight: '500' }}>{t}</div>
                          <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: col.color + '60' }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Velocity metric */}
              <div className="lp-bento-metric lp-card lp-card-orange" style={{ textAlign: 'left', animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s backwards' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Velocity</div>
                    <div style={{ fontSize: '46px', fontWeight: '900', lineHeight: 1, letterSpacing: '-0.03em' }}>
                      94<span style={{ fontSize: '20px', fontWeight: '600' }}>pts</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px' }}>
                    <TrendingUp size={20} color="white" />
                  </div>
                </div>
                {/* Bar chart */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
                  {[55, 70, 50, 80, 65, 90, 75, 94].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, background: i < 7 ? 'rgba(255,255,255,0.25)' : 'white',
                      borderRadius: '4px 4px 0 0', height: `${(h / 100) * 60}px`,
                    }} />
                  ))}
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  ↑ 18% vs last sprint
                </div>
              </div>

              {/* Active tasks */}
              <div className="lp-bento-tasks lp-card lp-card-dark" style={{ textAlign: 'left', animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s backwards' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>Active Tasks</span>
                  <div style={{ background: '#f97316', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', color: 'white' }}>3 open</div>
                </div>
                <TaskPill label="Implement drag-and-drop" done={false} color="#f97316" />
                <TaskPill label="Add socket events" done={true} color="#10b981" />
                <TaskPill label="Write API docs" done={false} color="#6366f1" />
              </div>

              {/* Team activity */}
              <div className="lp-bento-activity lp-card lp-card-dark" style={{ textAlign: 'left', animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s backwards' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>Team Activity</span>
                  <div style={{ display: 'flex' }}>
                    {['#f97316', '#6366f1', '#10b981', '#fbbf24'].map((c, i) => (
                      <div key={i} style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: c, border: '2px solid #1c1c1e',
                        marginLeft: i > 0 ? '-8px' : '0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '800', color: 'white',
                      }}>{'ASRM'[i]}</div>
                    ))}
                  </div>
                </div>
                {[
                  { user: 'Alex', action: 'moved task to Done', time: '2m', color: '#f97316' },
                  { user: 'Sara', action: 'added a comment', time: '8m', color: '#6366f1' },
                  { user: 'Raj', action: 'created Sprint 13', time: '15m', color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                      background: item.color + '15', border: `1px solid ${item.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '800', color: item.color,
                    }}>{item.user[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>{item.user} </span>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{item.action}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{item.time} ago</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section id="features" ref={sectionFeatures.ref} className="lp-section lp-divider">
        <div className="lp-container">
          {/* Heading */}
          <div style={{
            marginBottom: '48px',
            opacity: sectionFeatures.visible ? 1 : 0,
            transform: sectionFeatures.visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease-out',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Features</div>
            <h2 className="lp-section-title" style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.08', maxWidth: '600px',
            }}>
              Everything your team needs to ship faster
            </h2>
          </div>

          {/* Feature Bento */}
          <div className="lp-features-bento" style={{
            opacity: sectionFeatures.visible ? 1 : 0,
            transition: 'opacity 0.8s ease-out 0.2s',
          }}>
            {/* 1 — Large orange Kanban */}
            <div className="lp-feat-1 lp-card lp-card-orange" style={{ padding: '40px' }}>
              <IconBox icon={<Columns3 size={24} color="white" />} color="rgba(255,255,255,0.2)" />
              <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>Kanban Boards</h3>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.65', maxWidth: '440px' }}>
                Drag-and-drop tasks across To Do, In Progress, and Done. 
                Customizable columns with real-time sync across your whole team.
              </p>
            </div>

            {/* 2 — Real-time */}
            <div className="lp-feat-2 lp-card lp-card-dark lp-card-hover" style={{ padding: '36px' }}>
              <IconBox icon={<Zap size={22} color="#818cf8" />} color="rgba(99,102,241,0.15)" />
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Real-Time Sync</h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', margin: 0 }}>
                WebSocket-powered. Every change appears instantly for all team members.
              </p>
            </div>

            {/* 3 — Secure */}
            <div className="lp-feat-3 lp-card lp-card-dark lp-card-hover" style={{ padding: '36px' }}>
              <IconBox icon={<Shield size={22} color="#34d399" />} color="rgba(16,185,129,0.15)" />
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Secure by Default</h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', margin: 0 }}>
                JWT + bcrypt hashing. Your data is encrypted and safe, always.
              </p>
            </div>

            {/* 4 — Analytics */}
            <div className="lp-feat-4 lp-card lp-card-dark lp-card-hover" style={{ padding: '36px' }}>
              <IconBox icon={<BarChart3 size={22} color="#fbbf24" />} color="rgba(251,191,36,0.15)" />
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Analytics</h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', margin: 0 }}>
                Completion rates, team velocity, and task distribution — all built in.
              </p>
            </div>

            {/* 5 — Team (Now consistently styled like 2,3,4) */}
            <div className="lp-feat-5 lp-card lp-card-dark lp-card-hover" style={{ padding: '36px' }}>
              <IconBox icon={<Users size={22} color="#f97316" />} color="rgba(249,115,22,0.15)" />
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Team Workspace</h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', margin: 0 }}>
                Multiple boards, starred favorites, roles — built for teams of any size.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section id="how-it-works" ref={sectionSteps.ref} className="lp-section lp-divider">
        <div className="lp-container-sm">
          <div style={{
            marginBottom: '56px', textAlign: 'center',
            opacity: sectionSteps.visible ? 1 : 0,
            transform: sectionSteps.visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease-out',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>How It Works</div>
            <h2 className="lp-section-title" style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.08',
            }}>
              Up and running in minutes
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.4)', marginTop: '16px', lineHeight: '1.6', maxWidth: '440px', margin: '16px auto 0' }}>
              No complicated onboarding. Three simple steps to go from sign-up to shipping your first project.
            </p>
          </div>

          <div className="lp-steps-grid" style={{
            opacity: sectionSteps.visible ? 1 : 0,
            transition: 'opacity 0.8s ease-out 0.2s',
          }}>
            {[
              { num: '01', title: 'Create an account', desc: 'Sign up with your email. Less than 30 seconds, no card required.', accent: '#f97316' },
              { num: '02', title: 'Set up your board', desc: 'Create a project, add tickets, and organize across custom columns.', accent: '#818cf8' },
              { num: '03', title: 'Track & ship', desc: 'Drag tasks to completion. Watch team velocity grow with built-in analytics.', accent: '#34d399' },
            ].map((step, i) => (
              <div key={step.num} className="lp-card lp-card-dark" style={{
                padding: '40px 32px',
                borderTop: `4px solid ${step.accent}`,
                textAlign: 'center',
                opacity: sectionSteps.visible ? 1 : 0,
                transform: sectionSteps.visible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.5s ease-out',
                transitionDelay: `${i * 0.12}s`,
              }}>
                <div style={{
                  fontSize: '56px', fontWeight: '900', lineHeight: 1,
                  color: step.accent, marginBottom: '24px', fontVariantNumeric: 'tabular-nums'
                }}>{step.num}</div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>{step.title}</h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.65', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TESTIMONIALS ════════════════ */}
      <section id="testimonials" ref={sectionTestimonials.ref} className="lp-section lp-divider">
        <div className="lp-container">
          <div style={{
            marginBottom: '48px',
            opacity: sectionTestimonials.visible ? 1 : 0,
            transform: sectionTestimonials.visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease-out',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Loved by teams</div>
            <h2 className="lp-section-title" style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.08',
            }}>Don't just take our word for it</h2>
          </div>

          <div className="lp-test-grid" style={{
            opacity: sectionTestimonials.visible ? 1 : 0,
            transition: 'opacity 0.8s ease-out 0.2s',
          }}>
            {[
              {
                text: "Pulse completely changed how our team works. It’s fast, incredibly intuitive, and doesn't get in your way like heavier tools do.",
                author: "Sarah Jenkins", role: "Software Engineer", imgColor: "#818cf8"
              },
              {
                text: "The real-time synchronization allows our distributed team to collaborate seamlessly. It feels magical during daily standups.",
                author: "Marcus Chen", role: "Product Manager", imgColor: "#10b981"
              },
              {
                text: "Finally, a project management tool that is beautifully designed. The dark mode is just perfect for long coding sessions.",
                author: "Elena Rodriguez", role: "Frontend Developer", imgColor: "#f97316"
              }
            ].map((t, i) => (
              <div key={i} className="lp-card lp-card-dark" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', gap: '4px', color: '#fbbf24', marginBottom: '16px' }}>
                  {[...Array(5)].map((_, j) => <span key={j}>★</span>)}
                </div>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginBottom: '24px' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: t.imgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '14px', color: 'white'
                  }}>{t.author[0]}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{t.author}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TECH STACK ════════════════ */}
      <section id="tech-stack" ref={sectionTech.ref} className="lp-section lp-divider">
        <div className="lp-container">
          <div style={{
            marginBottom: '48px',
            opacity: sectionTech.visible ? 1 : 0,
            transform: sectionTech.visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease-out',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Tech Stack</div>
            <h2 className="lp-section-title" style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: '900', letterSpacing: '-0.03em',
            }}>Built with modern tech</h2>
          </div>

          <div className="lp-tech-grid" style={{
            opacity: sectionTech.visible ? 1 : 0,
            transition: 'opacity 0.8s ease-out 0.2s',
          }}>
            {[
              { name: 'Next.js', desc: 'React framework, SSR & SG.', color: '#ffffff' },
              { name: 'NestJS', desc: 'Modular Node.js backend.', color: '#e0234e' },
              { name: 'TypeScript', desc: 'End-to-end type safety.', color: '#3178C6' },
              { name: 'Prisma', desc: 'Type-safe ORM.', color: '#5a67d8' },
              { name: 'PostgreSQL', desc: 'Reliable relational DB.', color: '#336791' },
              { name: 'Socket.io', desc: 'Real-time comms.', color: '#f97316' },
              { name: 'Zustand', desc: 'Lightweight state management.', color: '#c9a84c' },
              { name: 'dnd-kit', desc: 'Fluid drag & drop toolkit.', color: '#a78bfa' },
            ].map((tech, i) => (
              <div key={tech.name} className="lp-card lp-card-dark lp-card-hover" style={{ padding: '24px',
                opacity: sectionTech.visible ? 1 : 0, transform: sectionTech.visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.05}s`
              }}>
                <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px', color: tech.color }}>{tech.name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.55' }}>{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section ref={sectionCta.ref} className="lp-divider" style={{
        padding: '120px 24px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 800px 400px at 50% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'relative', maxWidth: '580px', margin: '0 auto',
          opacity: sectionCta.visible ? 1 : 0,
          transform: sectionCta.visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s ease-out',
        }}>
          <h2 style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '20px',
          }}>
            Ready to ship faster?
          </h2>
          <p style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.45)',
            marginBottom: '40px', lineHeight: '1.7',
          }}>
            Join thousands of teams using Pulse to organize their work. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="lp-btn-orange" onClick={go} style={{ fontSize: '16px', padding: '16px 40px', borderRadius: '14px' }}>
              {token ? 'Open Dashboard' : 'Get Started Free'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="lp-divider" style={{ padding: '48px 32px' }}>
        <div className="lp-footer-inner" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          maxWidth: '1200px', margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '20px', fontWeight: '900', letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Pulse</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: '500' }}>
              Built with Next.js & NestJS
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', margin: 0 }}>
            © 2026 Pulse Inc. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Twitter', 'GitHub', 'Terms', 'Privacy'].map(l => (
              <a key={l} href="#" style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />
    </div>
  );
}
