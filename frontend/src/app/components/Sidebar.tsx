"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Inbox, 
  CalendarDays, 
  LayoutDashboard, 
  Settings,
  ChevronRight
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inbox", icon: Inbox, path: "/inbox", disabled: true },
    { name: "Planner", icon: CalendarDays, path: "/planner", disabled: true },
    { name: "Boards", icon: LayoutDashboard, path: "/projects" },
    { name: "Settings", icon: Settings, path: "/settings", disabled: true },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      paddingTop: '64px', // Space for navbar
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50
    }}>
      <div style={{ padding: '20px 16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '6px', 
            background: 'linear-gradient(135deg, #FF7E5F, #FEB47B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
            fontSize: '14px'
          }}>
            WS
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>My Workspace</div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Free</div>
          </div>
          <ChevronRight size={16} color="rgba(255, 255, 255, 0.4)" />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name}
                href={item.disabled ? '#' : item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  opacity: item.disabled ? 0.5 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !item.disabled) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !item.disabled) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

    </aside>
  );
}
