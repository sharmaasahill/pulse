"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { useTheme } from "@/store/useTheme";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { useRouter } from "next/navigation";
import {
  Zap, ArrowRight, LayoutDashboard, Users, Shield, BarChart3,
  Columns3, GripVertical, CheckCircle2, Moon, Sun,
} from "lucide-react";

/* ─── Intersection Observer hook for scroll animations ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export default function LandingPage() {
  const { token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);

  // Auto-redirect authenticated users to dashboard
  useEffect(() => {
    if (token) router.push("/projects");
  }, [token, router]);

  const hero = useInView();
  const features = useInView();
  const howItWorks = useInView();
  const testimonials = useInView();

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <Navbar />

      {/* ════════════ HERO ════════════ */}
      <section
        ref={hero.ref}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 'var(--navbar-height)',
        }}
      >
        {/* Gradient orbs background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <div style={{
            position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            top: '-100px', right: '-100px', animation: 'float 8s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            bottom: '-80px', left: '-80px', animation: 'float 10s ease-in-out infinite reverse',
          }} />
          <div style={{
            position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
            top: '40%', left: '50%', animation: 'float 12s ease-in-out infinite',
          }} />
        </div>

        <div style={{
          position: 'relative', zIndex: 1, textAlign: 'center',
          maxWidth: '800px', margin: '0 auto', padding: '0 24px',
          opacity: hero.visible ? 1 : 0,
          transform: hero.visible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: 'var(--radius-full)',
            background: 'var(--accent-primary-soft)',
            border: '1px solid var(--accent-primary-medium)',
            color: 'var(--accent-primary)',
            fontSize: '13px', fontWeight: '600', marginBottom: '28px',
          }}>
            <Zap size={14} fill="currentColor" />
            Now in Version 2.0
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: '900',
            lineHeight: '1.08',
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
          }}>
            Ship projects{' '}
            <span style={{
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              faster
            </span>
            <br />with your team
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '540px',
            margin: '0 auto 36px',
            lineHeight: '1.7',
          }}>
            Pulse is a real-time Kanban board for modern teams. Organize tasks, track progress, and collaborate — all in one beautiful workspace.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowLogin(true)}
              className="btn"
              style={{ padding: '14px 28px', fontSize: '15px' }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </button>
            <a
              href="#features"
              className="btn-secondary"
              style={{
                padding: '14px 28px', fontSize: '15px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                borderRadius: 'var(--radius-md)', fontWeight: '600',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              See Features
            </a>
          </div>

          {/* Mini dashboard preview */}
          <div style={{
            marginTop: '60px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-xl)',
            padding: '4px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
              padding: '20px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
            }}>
              {['To Do', 'In Progress', 'Done'].map((col, i) => (
                <div key={col} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  borderTop: `3px solid ${i === 0 ? 'var(--text-tertiary)' : i === 1 ? 'var(--accent-primary)' : 'var(--success)'}`,
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col}
                  </div>
                  {[0, 1].map(j => (
                    <div key={j} style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                    }}>
                      <div style={{
                        width: `${50 + j * 30}%`, height: '8px',
                        background: 'var(--border-primary)', borderRadius: '4px',
                      }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section
        id="features"
        ref={features.ref}
        style={{
          padding: '120px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '64px',
          opacity: features.visible ? 1 : 0,
          transform: features.visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s ease-out',
        }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800', letterSpacing: '-0.02em',
            marginBottom: '16px',
          }}>
            Everything you need to stay organized
          </h2>
          <p style={{
            fontSize: '17px', color: 'var(--text-secondary)',
            maxWidth: '500px', margin: '0 auto',
          }}>
            Powerful features designed to help your team focus on what matters most.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {[
            {
              icon: <Columns3 size={22} />,
              title: 'Kanban Boards',
              desc: 'Drag-and-drop cards across customizable columns. See your workflow at a glance.',
              gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
            },
            {
              icon: <GripVertical size={22} />,
              title: 'Real-Time Sync',
              desc: 'Changes appear instantly for everyone. No refresh needed — powered by WebSockets.',
              gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            },
            {
              icon: <Shield size={22} />,
              title: 'Secure Authentication',
              desc: 'Password-based sign up with bcrypt hashing. Your data stays safe and encrypted.',
              gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
            },
            {
              icon: <BarChart3 size={22} />,
              title: 'Project Analytics',
              desc: 'Track completion rates, task distribution, and team velocity with built-in charts.',
              gradient: 'linear-gradient(135deg, #10b981, #34d399)',
            },
            {
              icon: <Moon size={22} />,
              title: 'Dark & Light Mode',
              desc: 'Switch themes with one click. Your preference is saved and applied automatically.',
              gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            },
            {
              icon: <Users size={22} />,
              title: 'Team Workspace',
              desc: 'Create multiple boards, star your favorites, and organize projects your way.',
              gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                transition: 'all 0.3s ease',
                cursor: 'default',
                opacity: features.visible ? 1 : 0,
                transform: features.visible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 0.08}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: feature.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', marginBottom: '18px',
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '17px', fontWeight: '700', marginBottom: '8px',
                color: 'var(--text-primary)',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px', color: 'var(--text-secondary)',
                lineHeight: '1.65', margin: 0,
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section
        ref={howItWorks.ref}
        style={{
          padding: '100px 24px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-primary)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '64px',
            opacity: howItWorks.visible ? 1 : 0,
            transform: howItWorks.visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease-out',
          }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '16px',
            }}>
              Get started in minutes
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto' }}>
              Three simple steps to going from chaos to clarity.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { num: '01', title: 'Create an account', desc: 'Sign up with your email and a secure password. Takes less than 30 seconds.' },
              { num: '02', title: 'Set up your board', desc: 'Create a project, add tickets, and organize them across your columns.' },
              { num: '03', title: 'Track & ship', desc: 'Drag tasks to completion. Monitor progress with built-in analytics.' },
            ].map((step, i) => (
              <div
                key={step.num}
                style={{
                  textAlign: 'center', padding: '12px',
                  opacity: howItWorks.visible ? 1 : 0,
                  transform: howItWorks.visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s ease-out',
                  transitionDelay: `${i * 0.15}s`,
                }}
              >
                <div style={{
                  fontSize: '48px', fontWeight: '900',
                  background: 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '16px', lineHeight: 1,
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ TESTIMONIALS ════════════ */}
      <section
        ref={testimonials.ref}
        style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '56px',
          opacity: testimonials.visible ? 1 : 0,
          transform: testimonials.visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s ease-out',
        }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '16px',
          }}>
            Loved by developers
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--text-secondary)' }}>
            Here&apos;s what people are saying about Pulse.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {[
            { name: 'Aarav K.', role: 'Full Stack Developer', text: 'Pulse replaced three tools for my team. The real-time sync alone saves us hours every week.', avatar: '🚀' },
            { name: 'Priya M.', role: 'Project Manager', text: 'The Kanban board is incredibly smooth. Dark mode is beautiful, and the analytics help me report progress instantly.', avatar: '✨' },
            { name: 'Rishi S.', role: 'Startup Founder', text: 'We moved our entire sprint planning to Pulse. Clean, fast, and exactly what we needed.', avatar: '⚡' },
          ].map((t, i) => (
            <div
              key={t.name}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                opacity: testimonials.visible ? 1 : 0,
                transform: testimonials.visible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <p style={{
                fontSize: '15px', color: 'var(--text-secondary)',
                lineHeight: '1.7', marginBottom: '20px', fontStyle: 'italic',
              }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'var(--accent-primary-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section style={{
        padding: '100px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'var(--accent-gradient)', opacity: 0.04,
        }} />
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '16px',
          }}>
            Ready to build something great?
          </h2>
          <p style={{
            fontSize: '17px', color: 'var(--text-secondary)',
            marginBottom: '32px', lineHeight: '1.7',
          }}>
            Join Pulse for free and start organizing your projects today. No credit card needed.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="btn"
            style={{ padding: '16px 32px', fontSize: '16px' }}
          >
            Get Started Free
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer style={{
        padding: '40px 24px',
        borderTop: '1px solid var(--border-primary)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={13} color="white" fill="white" />
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Pulse</span>
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
          © 2026 Pulse. Built with Next.js and NestJS.
        </p>
      </footer>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />
    </div>
  );
}
