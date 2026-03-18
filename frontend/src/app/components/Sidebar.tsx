"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { api, setAuthToken } from "@/lib/api";
import {
  LayoutDashboard,
  ChevronLeft,
  Star,
  Hash,
  Plus,
  Folder,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const { token } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [boardsExpanded, setBoardsExpanded] = useState(true);

  // Load projects from API
  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      setAuthToken(token);
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (e) {
      console.error('Failed to load sidebar projects:', e);
    }
  }, [token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load starred projects from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pulse-starred');
      if (stored) setStarredIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function toggleStar(projectId: string) {
    setStarredIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      localStorage.setItem('pulse-starred', JSON.stringify(next));
      return next;
    });
  }

  const starred = projects.filter(p => starredIds.includes(p.id));
  const sidebarW = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <aside style={{
      width: sidebarW,
      minWidth: sidebarW,
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      paddingTop: 'var(--navbar-height)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      transition: 'width var(--transition-slow), min-width var(--transition-slow)',
      overflow: 'hidden',
    }}>
      {/* Collapse toggle */}
      <div style={{
        padding: collapsed ? '12px 0' : '12px 12px',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end',
      }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-icon"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            transition: 'transform var(--transition-base)',
            transform: collapsed ? 'rotate(180deg)' : 'none',
          }}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{
        padding: collapsed ? '0 8px' : '0 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        <SidebarLink
          href="/projects"
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={pathname === '/projects'}
          collapsed={collapsed}
        />
      </nav>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'var(--border-primary)',
        margin: collapsed ? '12px 8px' : '12px',
      }} />

      {/* Starred Projects */}
      {!collapsed && starred.length > 0 && (
        <div style={{ padding: '0 12px', marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 8px',
            marginBottom: '4px',
          }}>
            Starred
          </div>
          {starred.map(project => (
            <ProjectLink
              key={project.id}
              project={project}
              pathname={pathname}
              starred={true}
              onToggleStar={toggleStar}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}

      {/* Your Boards */}
      <div style={{ padding: collapsed ? '0 8px' : '0 12px', flex: 1, overflow: 'auto' }}>
        {!collapsed && (
          <button
            onClick={() => setBoardsExpanded(!boardsExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              marginBottom: '4px',
              color: 'var(--text-tertiary)',
            }}
          >
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Your Boards
            </span>
            <ChevronLeft
              size={14}
              style={{
                transform: boardsExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </button>
        )}

        {boardsExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {projects.map(project => (
              <ProjectLink
                key={project.id}
                project={project}
                pathname={pathname}
                starred={starredIds.includes(project.id)}
                onToggleStar={toggleStar}
                collapsed={collapsed}
              />
            ))}

            {projects.length === 0 && !collapsed && (
              <div style={{
                padding: '16px 8px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
              }}>
                No boards yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create new board shortcut */}
      {!collapsed && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-primary)' }}>
          <Link
            href="/projects"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-soft)',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Plus size={16} />
            Create Board
          </Link>
        </div>
      )}
    </aside>
  );
}

/* ─── Sub-components ─── */

function SidebarLink({ href, icon, label, active, collapsed }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: collapsed ? '10px 0' : '8px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-primary-soft)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: active ? '600' : '500',
        transition: 'all var(--transition-fast)',
        borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
      }}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
}

function ProjectLink({ project, pathname, starred, onToggleStar, collapsed }: {
  project: Project;
  pathname: string;
  starred: boolean;
  onToggleStar: (id: string) => void;
  collapsed: boolean;
}) {
  const isActive = pathname === `/projects/${project.id}`;
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
  const color = colors[project.name.length % colors.length];

  return (
    <Link
      href={`/projects/${project.id}`}
      title={collapsed ? project.name : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: collapsed ? '8px 0' : '6px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'var(--accent-primary-soft)' : 'transparent',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: isActive ? '600' : '400',
        transition: 'all var(--transition-fast)',
        position: 'relative',
      }}
    >
      {collapsed ? (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '700',
          color: 'white',
        }}>
          {project.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <>
          <Hash size={14} style={{ color, flexShrink: 0 }} />
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {project.name}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(project.id); }}
            style={{
              display: 'flex',
              padding: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: starred ? '#f59e0b' : 'var(--text-tertiary)',
              opacity: starred ? 1 : 0,
              transition: 'opacity var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!starred) e.currentTarget.style.opacity = '0'; }}
          >
            <Star size={13} fill={starred ? '#f59e0b' : 'none'} />
          </button>
        </>
      )}
    </Link>
  );
}
