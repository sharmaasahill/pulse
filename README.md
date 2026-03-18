<div align="center">

<h1>Pulse</h1>
<p><strong>Real-time project management with Kanban boards</strong></p>

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=netlify)](https://pulse-front.netlify.app/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

![Next.js](https://img.shields.io/badge/Next.js-000?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)

</div>

---

## What is Pulse?

Pulse is a full-stack Kanban board application for managing projects and tasks. It features real-time updates, drag-and-drop task management, dark/light theme switching, and per-user project isolation.

---

## Features

| Feature | Description |
|---|---|
| **Email & Password Auth** | Register and login with email, username, and bcrypt-hashed passwords |
| **Per-User Projects** | Each user sees only their own boards — projects are isolated by owner |
| **Kanban Board** | Drag-and-drop tickets across To Do, In Progress, and Done columns |
| **Real-Time Sync** | Changes appear instantly for all connected users via WebSockets |
| **Dark / Light Theme** | One-click toggle with system preference detection — persisted in localStorage |
| **Board Colors** | Choose from 6 gradient color themes per board |
| **Collapsible Sidebar** | Shrink to icon-only mode, star your favorite boards |
| **Responsive Design** | Works on desktop, tablet, and mobile screens |
| **Super User Mode** | Password-protected admin mode showing ticket author attribution |

---

## Tech Stack

**Frontend** — Next.js · TypeScript · Zustand · @dnd-kit · Socket.io Client · Axios

**Backend** — NestJS · Prisma ORM · JWT · Passport.js · bcrypt · Socket.io

**Database** — PostgreSQL (Supabase)

**Deployment** — Netlify (frontend) · Railway (backend)

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/sharmaasahill/pulse.git && cd pulse

# 2. Start the backend
cd backend && npm install && cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and SUPER_PASSWORD
npm run start:dev

# 3. Start the frontend (new terminal)
cd frontend && npm install && cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

### Environment Variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://..."      # Supabase PostgreSQL connection string
JWT_SECRET="your-jwt-secret"
SUPER_PASSWORD="your-admin-password"
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Project Structure

```
pulse/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT authentication (register/login)
│   │   ├── projects/       # Project CRUD (user-scoped)
│   │   ├── tickets/        # Ticket management
│   │   ├── realtime/       # WebSocket gateway
│   │   ├── notifications/  # In-app notifications
│   │   ├── activities/     # Activity logging
│   │   ├── admin/          # Super user controls
│   │   └── prisma/         # Database service
│   └── server/prisma/      # Schema & migrations
└── frontend/
    └── src/
        ├── app/            # Next.js App Router pages
        │   ├── components/ # Navbar, Sidebar, LoginModal, ThemeInitializer
        │   └── projects/   # Dashboard & Kanban board pages
        ├── lib/            # API client & Socket.io setup
        └── store/          # Zustand stores (auth, theme, UI)
```

---

## API Endpoints

```
POST /auth/register           → Create account
POST /auth/login              → Login → JWT token

GET    /projects              → List user's projects
POST   /projects              → Create project
GET    /projects/:id          → Get project with tickets
PATCH  /projects/:id          → Update project
DELETE /projects/:id          → Delete project

POST   /tickets               → Create ticket
PATCH  /tickets/:id           → Update ticket (title, status, etc.)
DELETE /tickets/:id           → Delete ticket

GET    /activities/:projectId → Activity feed
POST   /admin/super-verify    → Unlock super user mode
```

---

## Deployment

| Layer | Platform | Config |
|---|---|---|
| Frontend | **Netlify** | Auto-deploys from `master`, build: `npm run build` |
| Backend | **Railway** | Root dir: `backend`, start: `npm run start:prod` |
| Database | **Supabase** | PostgreSQL with Prisma ORM |

---

<div align="center">

Made by **[Sahil Sharma](https://github.com/sharmaasahill)**

</div>