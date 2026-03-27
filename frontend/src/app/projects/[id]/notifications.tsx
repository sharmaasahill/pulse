"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Activity {
  id: string;
  message: string;
  type: string;
  createdAt: string;
  actorId: string;
  actor?: { name?: string; email: string; username?: string };
}

export function Notifications({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Activity[]>([]);
  
  useEffect(() => {
    api.get(`/activities/${projectId}`).then(r => setItems(r.data));
  }, [projectId]);

  const getActivityType = (type: string) => {
    switch (type) {
      case 'create': return 'Created';
      case 'update': return 'Updated';
      case 'move': return 'Moved';
      default: return 'Activity';
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#f8fafc' }}>
          Recent Activity
        </h3>
        <span style={{ 
          marginLeft: 8, 
          fontSize: 12, 
          background: '#1a1a1a',
          color: '#9ca3af',
          padding: '2px 8px', 
          borderRadius: 12 
        }}>
          {items.length}
        </span>
      </div>
      
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
          <p style={{ margin: 0, fontSize: 14 }}>No activity yet</p>
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {items.map((activity) => (
            <div 
              key={activity.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                padding: '12px 0', 
                borderBottom: '1px solid #2a2a2a',
                fontSize: 14
              }}
            >
              <div style={{ 
                fontSize: 11, 
                marginRight: 12, 
                marginTop: 2,
                minWidth: 60,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                fontWeight: '500'
              }}>
                {getActivityType(activity.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', color: '#f8fafc' }}>
                  {activity.message}
                </p>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#94a3b8'
                }}>
                  <span>by {activity.actor?.name || activity.actor?.username || activity.actor?.email || activity.actorId}</span>
                  <span>{new Date(activity.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


