<div align="center">

<h1>Pulse</h1>
<p><strong>A modern, full-stack project management dashboard</strong></p>

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=netlify)](https://pulse-front.netlify.app/)
[![Backend](https://img.shields.io/badge/API-Railway-8B5CF6?style=for-the-badge&logo=railway)](https://pulse-backend-prod.up.railway.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

![Next.js](https://img.shields.io/badge/Next.js_15-000?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)

</div>

---

## Features

| Feature | Description |
|---|---|
| **OTP Auth** | Passwordless email login with 10-min expiry codes |
| **Project Management** | Full CRUD with search, sort, and grid/list views |
| **Kanban Board** | Drag-and-drop ticket management across status columns |
| **Real-time** | Live updates via WebSockets across all connected users |
| **Notifications** | In-app + email alerts for team activity |
| **Super User** | Password-protected admin mode with user attribution |

---

## Tech Stack

**Frontend** — Next.js 15 · TypeScript · Zustand · @dnd-kit · Socket.io · Axios

**Backend** — NestJS · Prisma ORM · JWT · Passport.js · Nodemailer · Socket.io

**Infrastructure** — Supabase (PostgreSQL) · Railway (API) · Netlify (Frontend) · Resend (Email)

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/sharmaasahill/pulse.git && cd pulse

# 2. Backend
cd backend && npm install && cp .env.example .env
npm run start:dev

# 3. Frontend (new terminal)
cd frontend && npm install && cp .env.local.example .env.local
npm run dev
```

### Environment Variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://..."     # Supabase connection pooler URL (port 6543)
JWT_SECRET="your-secret"
SUPER_PASSWORD="your-admin-password"
SMTP_HOST="smtp.resend.com"
SMTP_PORT=465
SMTP_USER="resend"
SMTP_PASS="re_your_resend_api_key"
MAIL_FROM="no-reply@yourdomain.com"
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL="https://pulse-backend-prod.up.railway.app"
```

---

## Structure

```
pulse/
├── backend/
│   ├── src/
│   │   ├── auth/           # OTP authentication
│   │   ├── projects/       # Project CRUD
│   │   ├── tickets/        # Ticket management
│   │   ├── realtime/       # WebSocket gateway
│   │   ├── notifications/  # Email & in-app alerts
│   │   ├── admin/          # Super user controls
│   │   └── common/mail/    # Resend SMTP service
│   └── server/prisma/      # DB schema & migrations
└── frontend/
    └── src/
        ├── app/            # Next.js App Router
        ├── lib/            # API client (Axios)
        └── store/          # Zustand state
```

---

## API Reference

```
POST /auth/issue-otp          → Request OTP
POST /auth/verify-otp         → Login with OTP → JWT
GET  /projects                → List projects
POST /projects                → Create project
PATCH/DELETE /projects/:id    → Update / Delete
POST /tickets                 → Create ticket
PATCH/DELETE /tickets/:id     → Update / Delete
GET  /activities/:projectId   → Activity feed
POST /admin/super-verify      → Unlock admin mode
```

---

## Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | **Netlify** | Auto-deploys from `master` |
| Backend | **Railway** | Root dir: `backend`, start: `npm run start:prod` |
| Database | **Supabase** | PostgreSQL, use Transaction Pooler URL |
| Email | **Resend** | SMTP via `smtp.resend.com:465` |

---

<div align="center">

Made by **[Sahil Sharma](https://github.com/sharmaasahill)**

</div>