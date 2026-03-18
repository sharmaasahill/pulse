"use client";
import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  function handleGetStarted(e: React.MouseEvent) {
    e.preventDefault();
    if (token) {
      router.push("/projects");
    } else {
      setShowLoginModal(true);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--background)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: 'var(--foreground)'
    }}>
      <Navbar />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
      />

      {/* Hero Section */}
      <section style={{
        paddingTop: '140px',
        paddingBottom: '120px',
        background: 'linear-gradient(135deg, rgba(0, 82, 204, 0.08) 0%, rgba(118, 56, 250, 0.08) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px',
          background: 'linear-gradient(135deg, #0052cc 0%, #7638fa 100%)',
          filter: 'blur(100px)', opacity: '0.15', borderRadius: '50%', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px',
          background: 'linear-gradient(135deg, #00b8d9 0%, #0052cc 100%)',
          filter: 'blur(100px)', opacity: '0.15', borderRadius: '50%', zIndex: 0
        }} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto',
            marginBottom: '60px'
          }}>
            <h1 style={{
              fontSize: 'clamp(48px, 8vw, 76px)',
              fontWeight: '800',
              lineHeight: '1.1',
              marginBottom: '24px',
              color: 'var(--foreground)',
              letterSpacing: '-0.03em'
            }}>
              Pulse keeps everything in the same place.
            </h1>
            <p style={{
              fontSize: 'clamp(18px, 2.5vw, 22px)',
              color: 'var(--muted)',
              lineHeight: '1.6',
              marginBottom: '40px',
              maxWidth: '660px',
              marginLeft: 'auto',
              marginRight: 'auto',
              fontWeight: '400'
            }}>
              Simple, flexible, and powerful. All it takes are boards, lists, and cards to get a clear view of who&apos;s doing what and what needs to get done.
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleGetStarted}
                style={{
                  padding: '16px 40px',
                  borderRadius: '12px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '600',
                  boxShadow: '0 8px 20px rgba(0, 82, 204, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 82, 204, 0.4)';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 82, 204, 0.3)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                Sign up - it&apos;s free!
              </button>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div style={{
            borderRadius: '24px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
            maxWidth: '1000px',
            margin: '0 auto',
            transform: 'perspective(1000px) rotateX(2deg) scale(0.98)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) scale(1) translateY(-10px)';
            e.currentTarget.style.boxShadow = '0 30px 60px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg) scale(0.98)';
            e.currentTarget.style.boxShadow = 'var(--shadow)';
          }}
          >
            <div style={{
              background: 'var(--background)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px'
            }}>
              {[
                { title: 'To Do', color: '#e2e8f0', tickets: ['Plan app architecture', 'Design landing page'] },
                { title: 'Doing', color: '#bfdbfe', tickets: ['Implement user auth'] },
                { title: 'Done', color: '#bbf7d0', tickets: ['Setup repository', 'Configure database'] }
              ].map((column, idx) => (
                <div key={column.title} style={{
                  background: 'var(--card-hover)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid var(--border)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)', margin: 0 }}>
                      {column.title}
                    </h3>
                    <span style={{
                      background: column.color,
                      color: 'var(--foreground)',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {column.tickets.length}
                    </span>
                  </div>
                  {column.tickets.map((ticket, i) => (
                    <div key={i} style={{
                      background: 'var(--card)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '14px',
                      color: 'var(--foreground)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      fontWeight: '500'
                    }}>
                      {ticket}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        paddingTop: '120px',
        paddingBottom: '120px',
        background: 'var(--background)',
        maxWidth: '1200px',
        margin: '0 auto',
        paddingLeft: '24px',
        paddingRight: '24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '800',
            color: 'var(--foreground)',
            marginBottom: '20px',
            letterSpacing: '-0.02em'
          }}>
            A productivity powerhouse
          </h2>
          <p style={{
            fontSize: '20px',
            color: 'var(--muted)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Simple, flexible, and powerful. All it takes are boards, lists, and cards to get a clear view of who&apos;s doing what and what needs to get done.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px'
        }}>
          {[
            {
              title: 'Boards',
              description: 'Pulse boards keep tasks organized and work moving forward. In a glance, see everything from "things to do" to "aww yeah, we did it!"',
              icon: '📋',
              color: 'rgba(0, 82, 204, 0.1)'
            },
            {
              title: 'Lists',
              description: 'The different stages of a task. Start simple with To Do, Doing or Done—or build a workflow custom fit to your team\'s needs. There\'s no wrong way to Pulse.',
              icon: '📝',
              color: 'rgba(16, 185, 129, 0.1)'
            },
            {
              title: 'Cards',
              description: 'Cards represent tasks and ideas and hold all the information to get the job done. As you make progress, move cards across lists to show their status.',
              icon: '🗂️',
              color: 'rgba(118, 56, 250, 0.1)'
            },
            {
              title: 'Secure Authentication',
              description: 'Sign in effortlessly using your email, username, and password. Fully secured utilizing bcrypt password hashing. Stay protected without the friction.',
              icon: '🔐',
              color: 'rgba(245, 158, 11, 0.1)'
            },
            {
              title: 'Real-Time Sync',
              description: 'Never refresh again. Changes made by your team appear instantly across all devices. Real-time collaboration made simple.',
              icon: '⚡',
              color: 'rgba(239, 68, 68, 0.1)'
            },
            {
              title: 'Project Dashboard',
              description: 'Manage multiple boards with a bird\'s eye view. Seamlessly navigate between different projects and team workspaces.',
              icon: '📊',
              color: 'rgba(6, 182, 212, 0.1)'
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--card)',
                borderRadius: '16px',
                padding: '40px 32px',
                border: '1px solid var(--border)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: feature.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '24px'
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: 'var(--foreground)',
                marginBottom: '16px'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '16px',
                color: 'var(--muted)',
                lineHeight: '1.6',
                margin: 0
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        paddingTop: '100px',
        paddingBottom: '120px',
        background: 'linear-gradient(135deg, #0052cc 0%, #7638fa 100%)',
        margin: '0 24px 60px 24px',
        borderRadius: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute', top: '-50%', left: '-10%', width: '100%', height: '100%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
          zIndex: 0
        }} />
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          padding: '0 24px'
        }}>
          <h2 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '24px',
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}>
            Get started with Pulse today
          </h2>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Join the teams who trust us to manage their projects, organize their work, and improve productivity.
          </p>
          <button
            onClick={handleGetStarted}
            style={{
              display: 'inline-block',
              padding: '18px 48px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#0052cc',
              border: 'none',
              fontSize: '18px',
              fontWeight: '700',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
            }}
          >
            Start your free board
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--background)',
        borderTop: '1px solid var(--border)',
        paddingTop: '60px',
        paddingBottom: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'var(--foreground)',
              letterSpacing: '-0.02em'
            }}>
              Pulse
            </span>
          </div>
          <p style={{
            color: 'var(--muted)',
            fontSize: '15px',
            margin: 0
          }}>
            © 2026 Pulse. Built with Next.js and NestJS.
          </p>
        </div>
      </footer>
    </div>
  );
}
