"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { 
  FolderPlus, Search, SlidersHorizontal, Trash2, Edit2, 
  MoreVertical, Clock, CheckCircle2, Circle, AlertCircle, LayoutGrid, List, BarChart3, ChevronRight 
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  tickets?: Array<{ id: string; status: string; priority?: string; }>;
};

type SortOption = 'name' | 'date' | 'tickets' | 'recent';
type ViewMode = 'grid' | 'list';

export default function ProjectsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Advanced Features State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list for advanced view
  const [showAnalytics, setShowAnalytics] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setItems(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth-storage');
    let parsedToken = null;
    
    try {
      if (storedToken) {
        const parsed = JSON.parse(storedToken);
        parsedToken = parsed.state?.token;
      }
    } catch {
      console.log('No stored auth found');
    }

    if (!token && !parsedToken) {
      setAuthLoading(false);
      redirect("/");
      return;
    }
    
    const authToken = token || parsedToken;
    if (authToken) {
      setAuthToken(authToken);
      loadProjects();
      setAuthLoading(false);
    }
  }, [token, logout, loadProjects]);

  async function createProject() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/projects', { name: name.trim(), description: description.trim() });
      setItems([data, ...items]);
      setName("");
      setDescription("");
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProject() {
    if (!editingProject || !name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.patch(`/projects/${editingProject.id}`, { 
        name: name.trim(), 
        description: description.trim() 
      });
      setItems(items.map(p => p.id === editingProject.id ? data : p));
      setEditingProject(null);
      setName("");
      setDescription("");
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(projectId: string) {
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      setItems(items.filter(p => p.id !== projectId));
      setShowDeleteModal(null);
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleProjectSelection(projectId: string) {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  }

  async function bulkDeleteProjects() {
    if (selectedProjects.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProjects.length} projects?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedProjects.map(id => api.delete(`/projects/${id}`)));
      setItems(items.filter(p => !selectedProjects.includes(p.id)));
      setSelectedProjects([]);
    } catch (error) {
      console.error('Failed to delete projects:', error);
    } finally {
      setLoading(false);
    }
  }

  // Generate mock activity feed based on projects
  const activityFeed = useMemo(() => {
    if (!items.length) return [];
    
    return items.slice(0, 5).map((project, i) => ({
      id: `act-${i}`,
      user: 'i.sahilkrsharma',
      action: i % 2 === 0 ? 'created project' : 'updated tickets in',
      target: project.name,
      time: i === 0 ? 'Just now' : `${i * 2} hours ago`,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sahil'
    }));
  }, [items]);

  // Analytics Data
  const chartData = useMemo(() => {
    return items.slice(0, 6).map(project => ({
      name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
      tasks: project.tickets?.length || 0,
    }));
  }, [items]);
  
  const statusData = useMemo(() => {
    let todo = 0, inProgress = 0, done = 0;
    
    items.forEach(project => {
      project.tickets?.forEach(ticket => {
        if (ticket.status === 'TODO') todo++;
        else if (ticket.status === 'IN_PROGRESS') inProgress++;
        else if (ticket.status === 'DONE') done++;
      });
    });
    
    const total = todo + inProgress + done;
    if (total === 0) return [];
    
    return [
      { name: 'To Do', value: todo, color: '#94a3b8' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Done', value: done, color: '#10b981' }
    ];
  }, [items]);

  const stats = useMemo(() => {
    const totalTickets = items.reduce((sum, p) => sum + (p.tickets?.length || 0), 0);
    const completedTickets = items.reduce((sum, p) => sum + (p.tickets?.filter(t => t.status === 'DONE').length || 0), 0);
    const activeProjects = items.length;
    const progress = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

    return {
      totalProjects: activeProjects,
      totalTickets,
      completedTickets,
      progress
    };
  }, [items]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = items;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'tickets': return (b.tickets?.length || 0) - (a.tickets?.length || 0);
        case 'recent': return new Date((b.updatedAt || b.createdAt)).getTime() - new Date((a.updatedAt || a.createdAt)).getTime();
        default: return 0;
      }
    });
  }, [items, searchQuery, sortBy]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ animation: 'spin 1s linear infinite', width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Advanced Breadcrumb Header */}
      <div style={{ 
        background: 'var(--card)', 
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '14px', fontWeight: '500' }}>
            <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>My Workspace</span>
            <ChevronRight size={16} />
            <span style={{ color: 'var(--foreground)' }}>Projects</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Team Avatars */}
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
              {['Sahil', 'Alex', 'Sam'].map((name, i) => (
                <img 
                  key={name}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=e2e8f0`} 
                  alt={name}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    border: '2px solid var(--card)', marginLeft: i > 0 ? '-8px' : '0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
              ))}
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                border: '2px solid var(--border)', marginLeft: '-8px',
                background: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600', color: 'var(--muted)', zIndex: 1
              }}>
                +2
              </div>
            </div>

            <button 
              onClick={() => { setName(''); setDescription(''); setShowCreateModal(true); }}
              className="btn"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px' }}
            >
              <FolderPlus size={16} />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px', display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                Project Overview
              </h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '15px' }}>
                Track progress, manage timelines, and analyze team productivity.
              </p>
            </div>
          </div>

          {/* Advanced Analytics Section */}
          {showAnalytics && items.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', marginBottom: '32px' }}>
              
              {/* Primary Stat Card */}
              <div style={{ gridColumn: 'span 4', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}>
                  <PieChart width={150} height={150}>
                    <Pie data={[{value: 1}]} dataKey="value" cx="50%" cy="50%" outerRadius={70} fill="var(--primary)" />
                  </PieChart>
                </div>
                <h3 style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workspace Progress
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--foreground)', lineHeight: 1 }}>{stats.progress}%</span>
                  <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '600' }}>Completion</span>
                </div>
                <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
                  {stats.completedTickets} of {stats.totalTickets} tasks completed
                </p>
              </div>

              {/* Workload Bar Chart */}
              <div style={{ gridColumn: 'span 5', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} /> Volume Breakdown
                </h3>
                <div style={{ height: '140px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                      <Tooltip cursor={{ fill: 'var(--card-hover)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }} />
                      <Bar dataKey="tasks" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "var(--primary)" : "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

               {/* Status Donut Chart */}
               <div style={{ gridColumn: 'span 3', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600', margin: '0 0 8px 0' }}>Status Distribution</h3>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {statusData.length > 0 ? (
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="value">
                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.totalTickets}</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '600' }}>TASKS</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>No tasks found</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Data Grid Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Filter projects by name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 16px 8px 38px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedProjects.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', borderRight: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>{selectedProjects.length} selected</span>
                  <button onClick={bulkDeleteProjects} className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button onClick={() => setSelectedProjects([])} style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>Clear</button>
                </div>
              )}
            
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} style={{ padding: '8px 32px 8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '13px', fontWeight: '500', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%235e6c84%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '10px auto' }}>
                <option value="recent">Recently Updated</option>
                <option value="name">Alphabetical</option>
                <option value="tickets">Most Tasks</option>
              </select>

              <div style={{ display: 'flex', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', padding: '2px' }}>
                <button onClick={() => setViewMode('list')} style={{ padding: '6px 8px', background: viewMode === 'list' ? 'var(--card)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? 'var(--primary)' : 'var(--muted)' }}><List size={16} /></button>
                <button onClick={() => setViewMode('grid')} style={{ padding: '6px 8px', background: viewMode === 'grid' ? 'var(--card)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--muted)' }}><LayoutGrid size={16} /></button>
              </div>
            </div>
          </div>

          {/* Project List / Grid View */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <FolderPlus size={48} style={{ color: 'var(--muted)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--foreground)' }}>No projects in this workspace</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '15px' }}>Create your first project to start managing workflows.</p>
              <button onClick={() => { setName(''); setDescription(''); setShowCreateModal(true); }} className="btn">Create Project</button>
            </div>
          ) : viewMode === 'list' ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '16px 20px', width: '40px' }}><input type="checkbox" onChange={(e) => setSelectedProjects(e.target.checked ? filteredAndSortedProjects.map(p => p.id) : [])} checked={selectedProjects.length === filteredAndSortedProjects.length && items.length > 0} style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} /></th>
                    <th style={{ padding: '16px 12px', fontWeight: '600' }}>Project Name</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', width: '200px' }}>Progress</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', textAlign: 'right' }}>Updated</th>
                    <th style={{ padding: '16px 20px', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedProjects.map(project => {
                    const tickets = project.tickets || [];
                    const doneCount = tickets.filter(t => t.status === 'DONE').length;
                    const progress = tickets.length > 0 ? (doneCount / tickets.length) * 100 : 0;
                    const isSelected = selectedProjects.includes(project.id);
                    
                    return (
                      <tr 
                        key={project.id} 
                        onClick={() => router.push(`/projects/${project.id}`)}
                        style={{ 
                          borderBottom: '1px solid var(--border)', 
                          cursor: 'pointer', 
                          background: isSelected ? 'var(--card-hover)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--card-hover)' }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleProjectSelection(project.id)} style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }} />
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '15px', marginBottom: '4px' }}>{project.name}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description || 'No description provided.'}</div>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          {progress === 100 && tickets.length > 0 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><CheckCircle2 size={14} /> Completed</span>
                          ) : tickets.length === 0 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(100, 116, 139, 0.1)', color: 'var(--muted)', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><Circle size={14} /> Empty</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><Clock size={14} /> Active</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', width: '32px' }}>{Math.round(progress)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right', color: 'var(--muted)', fontSize: '13px' }}>
                          {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(project); }} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}><Edit2 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal({ id: project.id, name: project.name }); }} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
               {filteredAndSortedProjects.map((project, i) => {
                 const tickets = project.tickets || [];
                 const doneCount = tickets.filter(t => t.status === 'DONE').length;
                 const progress = tickets.length > 0 ? (doneCount / tickets.length) * 100 : 0;
                 // Assign a consistent gradient based on index
                 const gradients = ['var(--board-bg-blue)', 'var(--board-bg-purple)', 'var(--board-bg-green)', 'var(--board-bg-orange)'];
                 const headerGradient = gradients[i % gradients.length];
                
                 return (
                   <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                     <div style={{ height: '60px', background: headerGradient, position: 'relative' }}>
                       <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(project); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '6px' }}><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal({ id: project.id, name: project.name }); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '6px' }}><Trash2 size={14} /></button>
                       </div>
                     </div>
                     <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--foreground)', lineHeight: 1.2 }}>{project.name}</h3>
                      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 20px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '42px' }}>{project.description || 'No description'}</p>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px' }}>
                          <span>Tasks</span>
                          <span>{doneCount}/{tickets.length}</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '3px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex' }}>
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sahil" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--border)' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--muted)' }}>Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
                      </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>

        {/* Right Sidebar - Activity Feed */}
        <div style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '100px' }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 20px 0', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Recent Activity
            </h3>
            
            {activityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: '14px' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border)', zIndex: 0 }} />
                
                {activityFeed.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                    <img src={act.avatar} alt={act.user} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--card-hover)', border: '2px solid var(--card)' }} />
                    <div>
                      <div style={{ fontSize: '14px', lineHeight: 1.4, color: 'var(--foreground)' }}>
                        <span style={{ fontWeight: '600' }}>{act.user}</span>{' '}
                        <span style={{ color: 'var(--muted)' }}>{act.action}</span>{' '}
                        <span style={{ fontWeight: '600' }}>{act.target}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button style={{ width: '100%', marginTop: '24px', padding: '10px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* Modals remain mostly the same structurally but use .btn classes for styling */}
      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 30, 66, 0.54)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card)', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--foreground)' }}>Create New Project</h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Set up a new workspace to organize your team's tasks.</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' }}>Project Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" className="input" placeholder="e.g. Website Revamp, Q4 Marketing" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' }}>Description (Optional)</label>
              <textarea className="input" placeholder="Briefly describe the goal..." value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn" onClick={createProject} disabled={loading || !name.trim()}>
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProject && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 30, 66, 0.54)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
         <div style={{ background: 'var(--card)', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
           <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--foreground)' }}>Edit Workspace</h2>
           <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Update the details of your project.</p>
           <div style={{ marginBottom: '20px' }}>
             <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' }}>Project Name</label>
             <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
           </div>
           <div style={{ marginBottom: '32px' }}>
             <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' }}>Description</label>
             <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
           </div>
           <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
             <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
             <button className="btn" onClick={updateProject} disabled={loading || !name.trim()}>
               {loading ? 'Saving...' : 'Save Changes'}
             </button>
           </div>
         </div>
       </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 30, 66, 0.54)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card)', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(202, 53, 33, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '50%' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--foreground)', margin: 0 }}>Delete project?</h2>
              </div>
            </div>
            
            <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              Are you sure you want to delete <strong>"{showDeleteModal.name}"</strong>? This will permanently erase the project and all of its tickets. This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" disabled={loading} onClick={() => setShowDeleteModal(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={loading} onClick={() => deleteProject(showDeleteModal.id)}>
                {loading ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
