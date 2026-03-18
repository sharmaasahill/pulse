"use client";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getSocket, joinProject } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import { useUi } from "@/store/useUi";
import { useAuth } from "@/store/useAuth";
import { Notifications } from "./notifications";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Project {
  id: string;
  name: string;
  tickets?: Ticket[];
}

interface Ticket {
  id: string;
  title: string;
  authorId?: string;
  author?: {
    id: string;
    email: string;
  };
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  description?: string;
}

// Draggable Ticket Component
function DraggableTicket({ 
  ticket, 
  superOn, 
  onEdit, 
  onDelete 
}: { 
  ticket: Ticket; 
  superOn: boolean;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style, 
        cursor: 'grab',
        background: '#1a1a1a',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#2a2a2a',
        transition: 'border-color 0.2s',
        position: 'relative'
      }}
      {...attributes}
      {...listeners}
      className="ticket-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3a3a3a';
        e.currentTarget.style.background = '#252525';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = '#2a2a2a';
          e.currentTarget.style.background = '#1a1a1a';
        }
      }}
    >
      {/* Ticket Actions */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        gap: '4px',
        opacity: 0,
        transition: 'opacity 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0';
      }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(ticket);
          }}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: 'none',
            background: '#1a1a1a',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ticket);
          }}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: 'none',
            background: '#fef2f2',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}
        >
          Delete
        </button>
      </div>

      <div style={{ marginBottom: '8px', paddingRight: '50px' }}>
        <h4 style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          margin: '0 0 4px 0', 
          color: '#ffffff',
          lineHeight: 1.4
        }}>
          {ticket.title}
        </h4>
        {ticket.description && (
          <p style={{ 
            fontSize: '12px', 
            color: '#9ca3af', 
            margin: '0 0 8px 0', 
            lineHeight: 1.4
          }}>
            {ticket.description}
          </p>
        )}
      </div>
      
      {superOn && (
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          borderTop: '1px solid #2a2a2a', 
          paddingTop: '8px',
          marginTop: '8px',
          background: '#1a1a1a',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          Created by: {ticket.author?.email ?? 'System'}
        </div>
      )}
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({ 
  id, 
  title, 
  tickets, 
  superOn, 
  className,
  onEdit,
  onDelete
}: { 
  id: string; 
  title: string; 
  tickets: Ticket[]; 
  superOn: boolean; 
  className: string;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getColumnStyle = () => {
    const baseStyle = {
      background: '#1a1a1a',
      borderRadius: '8px',
      padding: '16px',
      minHeight: '400px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#2a2a2a'
    };

    if (isOver) {
      return {
        ...baseStyle,
        borderColor: '#ffffff',
        background: '#1a1a1a'
      };
    }

    return baseStyle;
  };

  return (
    <div 
      ref={setNodeRef}
      className={`kanban-column ${className}`}
      style={getColumnStyle()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#ffffff' }}>
          {title}
        </h3>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #2a2a2a'
        }}>
          {tickets.length}
        </span>
      </div>
      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tickets.map((ticket) => (
          <DraggableTicket 
            key={ticket.id} 
            ticket={ticket} 
            superOn={superOn} 
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, logout, user } = useAuth();
  const { superOn, toggleSuper } = useUi();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    setAuthToken(token);
    
    api.get(`/projects/${projectId}`).then(r => setProject(r.data)).catch(() => logout());
    
      const socket = getSocket();
      
      if (socket.connected) {
        joinProject(projectId, user?.email || 'anonymous');
      } else {
        socket.on('connect', () => {
          joinProject(projectId, user?.email || 'anonymous');
        });
      }
      
      socket.on('ticket:updated', (payload: { type: string; ticket: Ticket }) => {
        console.log('Received ticket update:', payload);
        setProject((prev: Project | null) => {
        if (!prev) return prev;
        if (payload.type === 'created') {
          return { ...prev, tickets: [payload.ticket, ...(prev.tickets ?? [])] };
        } else if (payload.type === 'updated') {
          return {
            ...prev,
            tickets: (prev.tickets ?? []).map((t: Ticket) => t.id === payload.ticket.id ? payload.ticket : t),
          };
        }
        return prev;
      });
    });
    // Reconnect handling
    socket.on('reconnect', () => {
      console.log('Socket reconnected, rejoining project');
      joinProject(projectId, token ? 'user-' + Date.now() : undefined);
    });
    
    return () => {
      socket.off('ticket:updated');
      socket.off('reconnect');
    };
  }, [projectId, token, logout, router, user?.email]);

  // Initialize auth token on mount
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            if (!showEditModal && !showDeleteModal) {
              setTitle('');
              setDescription('');
              setEditingTicket(null);
              setShowEditModal(true);
            }
            break;
          case 'k':
            e.preventDefault();
            (document.querySelector('input[placeholder="Search tickets..."]') as HTMLInputElement)?.focus();
            break;
          case 'Escape':
            if (showEditModal) setShowEditModal(false);
            if (showDeleteModal) setShowDeleteModal(null);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, showDeleteModal]);

  async function createTicket() {
    if (!title) return;
    try {
      await api.post('/tickets', { projectId, title, description, authorEmail: user?.email });
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  }

  async function updateTicket() {
    if (!editingTicket || !title) return;
    try {
      await api.patch(`/tickets/${editingTicket.id}`, { title, description });
      setEditingTicket(null);
      setTitle("");
      setDescription("");
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  }

  async function deleteTicket(ticketId: string) {
    try {
      await api.delete(`/tickets/${ticketId}`);
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    }
  }

  function openEditModal(ticket: Ticket) {
    setEditingTicket(ticket);
    setTitle(ticket.title);
    setDescription(ticket.description || '');
    setShowEditModal(true);
  }

  function openDeleteModal(ticket: Ticket) {
    setShowDeleteModal(ticket);
  }

  function filteredTickets(tickets: Ticket[], status: string) {
    return tickets.filter(ticket => {
      const matchesStatus = ticket.status === status;
      const matchesSearch = !searchQuery || 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !project) return;

    const ticketId = active.id as string;
    const newStatus = over.id as 'TODO' | 'IN_PROGRESS' | 'DONE';
    
    const ticket = project.tickets?.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      // The realtime update will handle the UI update
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  }

  if (!project) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
      <div style={{ background: 'transparent', minHeight: 'calc(100vh - 64px)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#ffffff' }}>
      {/* Header */}
      <div className="header" style={{
        background: 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '24px 0',
        marginBottom: '24px'
      }}>
        <div className="container" style={{ padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#ffffff', letterSpacing: '-0.5px' }}>
                {project.name}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', fontWeight: '500' }}>
                {(project.tickets ?? []).length} tickets
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  if (!superOn) {
                    const pwd = prompt('Enter super-user password');
                    toggleSuper(pwd ?? undefined);
                  } else toggleSuper();
                }}
                style={{
                  background: superOn ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                  color: superOn ? '#0f0f0f' : '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: superOn ? '#10b981' : 'rgba(255, 255, 255, 0.3)',
                  display: 'inline-block'
                }} />
                {superOn ? 'Super Mode' : 'Super Mode'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '24px' }}>
        {/* Search and Add Ticket Form */}
        <div style={{ 
          marginBottom: '24px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#ffffff' }}>
              Add New Ticket
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                className="input" 
                placeholder="Search tickets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '200px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #2a2a2a',
                  background: '#0f0f0f',
                  fontSize: '14px',
                  color: '#ffffff'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              className="input" 
              placeholder="Enter ticket title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createTicket()}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #2a2a2a',
                background: '#0f0f0f',
                fontSize: '14px',
                color: '#ffffff'
              }}
            />
            <textarea 
              className="input" 
              placeholder="Enter ticket description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ 
                resize: 'vertical', 
                minHeight: '60px',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #2a2a2a',
                background: '#0f0f0f',
                fontSize: '14px',
                color: '#ffffff'
              }}
            />
            <button 
              onClick={createTicket}
              style={{
                background: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0f0f0f',
                cursor: 'pointer',
                alignSelf: 'flex-start'
              }}
            >
              Add Ticket
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-3" style={{ gap: '24px' }}>
            <DroppableColumn
              id="TODO"
              title="To Do"
              tickets={filteredTickets(project.tickets ?? [], 'TODO')}
              superOn={superOn}
              className="todo"
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
            <DroppableColumn
              id="IN_PROGRESS"
              title="In Progress"
              tickets={filteredTickets(project.tickets ?? [], 'IN_PROGRESS')}
              superOn={superOn}
              className="in-progress"
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
            <DroppableColumn
              id="DONE"
              title="Done"
              tickets={filteredTickets(project.tickets ?? [], 'DONE')}
              superOn={superOn}
              className="done"
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="ticket-card" style={{ transform: 'rotate(5deg)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <div style={{ marginBottom: 8 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px 0', color: '#1e293b' }}>
                    {(project.tickets ?? []).find(t => t.id === activeId)?.title}
                  </h4>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Activity Feed */}
        <div style={{ marginTop: 32 }}>
          <Notifications projectId={projectId} />
        </div>
      </div>

      {/* Edit Ticket Modal */}
      {showEditModal && editingTicket && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
              Edit Ticket
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 500, 
                color: 'var(--text-primary)', 
                marginBottom: 8 
              }}>
                Ticket Title
              </label>
              <input 
                className="input" 
                placeholder="Enter ticket title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 500, 
                color: 'var(--text-primary)', 
                marginBottom: 8 
              }}>
                Description (Optional)
              </label>
              <textarea 
                className="input" 
                placeholder="Enter ticket description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                onClick={updateTicket}
                disabled={!title.trim()}
              >
                Update Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Ticket Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              Delete Ticket
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                  Are you sure you want to delete &ldquo;<strong>{showDeleteModal.title}</strong>&rdquo;? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => deleteTicket(showDeleteModal.id)}
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


