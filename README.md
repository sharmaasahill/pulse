# Pulse
**Real-time project management with Kanban boards**

---

## What is Pulse?

Pulse is a high-performance, full-stack Kanban board application designed for seamless team collaboration. It features a modern glassmorphic UI, full real-time synchronization across all tabs and users, and a mobile-first interaction model.

---

## Key Features

| Feature | Description |
|---|---|
| **Real-Time Global Sync** | Project creations, deletions, and task movements reflect instantly across all sessions via user-specific WebSocket rooms. |
| **Mobile-First UX** | Optimized for touch: Native-scrolling board with an intuitive "Quick-Move" menu on task cards (replaces complex drag-and-drop on mobile). |
| **Desktop Drag-and-Drop** | Desktop users enjoy a fluid dragging experience powered by `@dnd-kit`. |
| **Smart Auth** | Secure Register/Login flow with JWT expiration and persistence; each user manages their own private workspace. |
| **Glassmorphic UI** | Premium dark-themed aesthetic with vibrant gradients, blurred backdrops, and interactive micro-animations. |
| **Board Customization** | 8 unique gradient color themes per board, Starred projects for quick access, and a collapsible sidebar. |

---

## Tech Stack

**Frontend** — Next.js 14 · TypeScript · Zustand (State) · Lucide Icons · Socket.io Client

**Backend** — NestJS · Prisma ORM (PostgreSQL) · JWT Auth · Passport · Socket.io Gateway

**Design** — Modern CSS with Glassmorphism and Responsive Mesh Gradients

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Supabase recommended)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/sharmaasahill/pulse.git && cd pulse

# Setup Backend
cd backend && npm install
# Create .env and add DATABASE_URL & JWT_SECRET
npm run start:dev

# Setup Frontend
cd frontend && npm install
# Create .env.local and add NEXT_PUBLIC_API_URL
npm run dev
```

### 3. Environment Variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Project Architecture

```
pulse/
├── backend/
│   ├── src/
│   │   ├── auth/          # Secure registration & login
│   │   ├── projects/      # Workspace & membership logic
│   │   ├── tickets/       # Task management & status routing
│   │   └── realtime/      # User-specific WebSocket gateways
└── frontend/
    └── src/
        ├── app/           # App Router, Layouts & Components
        ├── lib/           # Socket.io & API client wrappers
        └── store/         # Zustand persisted auth store
```

---

<div align="center">

Made with ❤️ by **[Sahil Sharma](https://github.com/sharmaasahill)**

</div>