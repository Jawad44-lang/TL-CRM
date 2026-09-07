# MessagingCRM — Business Messaging CRM (MERN)

A complete business-messaging CRM prototype: centralize Telegram-style customer conversations,
assign them to your team, monitor everything in real time — **without any real Telegram/Instagram/WhatsApp API**.
A **Demo Messaging Engine** simulates the platform, and the architecture is adapter-based so a real
Telegram integration can later replace the demo engine **without rewriting the CRM core** (PRD §41/§42/§67).

## Tech Stack

- **MongoDB + Mongoose** — data layer
- **Express.js** — REST API
- **React 18 + Vite** — frontend (Finnova-style premium UI: light theme, indigo accents, dark panels)
- **Socket.IO** — real-time messages, notifications, typing indicators (permission-aware rooms)
- **JWT Authentication** + bcrypt password hashing
- **Role-based access** — ADMIN / MANAGER / EMPLOYEE with a mandatory **permission ceiling**

## Quick Start

```bash
# 1. Install dependencies
npm run install-all          # root + backend + frontend

# 2. Configure environment (backend/.env)
MONGO_URI=mongodb://127.0.0.1:27017/messaging_crm
JWT_SECRET=change-me
PORT=5050
CLIENT_URL=http://localhost:5173
DEMO_MODE=true

# 3. Run both servers
npm run dev                  # backend :5050 + frontend :5173 (concurrently)
```

## Troubleshooting (agar kisi PC pe na chale)

| Error in terminal | Reason | Fix |
| --- | --- | --- |
| `querySrv ECONNREFUSED _mongodb._tcp...` | `mongodb+srv://` URI ke liye DNS SRV lookup fail — **network/ISP dependent**, isi liye ek PC pe chalta hai dusre pe nahi | Ab code khud handle karta hai: `.env` mein standard `mongodb://` URI hai, aur agar kabhi `+srv` URI paste ho jaye to backend khud usse standard form mein convert karta hai (DoH fallback). DNS `8.8.8.8`/`1.1.1.1` bhi kar sakte ho |
| `EADDRINUSE: address already in use :::5000` | Port pe koi aur app baithi hai (is PC pe `python.exe app.py` / EarthScape ML 5000 pe thi) | Backend ab default **5050** pe hai. Aur conflict ho to `PORT` badlo `backend/.env` mein + `frontend/vite.config.js` ke dono proxy targets update karo |
| `bad auth / Authentication failed` | Atlas username/password galat | `backend/.env` ke `MONGO_URI` ki credentials check karo |
| Connection timeout (8s ke baad fail) | Internet band, ya Atlas **Network Access** mein tumhari IP whitelist nahi hai | Internet check karo; Atlas Dashboard → Network Access → `0.0.0.0/0` (dev ke liye) add karo |
| `bad option: --watch` / `npm run dev` turant fail | Node version purana hai (18.11 se kam) | Node.js 18+ install karo, ya bina watch ke chalao: `npm --prefix backend start` |

> Note: `frontend` backend ko `vite.config.js` ke proxies (`/api` **aur** `/socket.io` → `http://localhost:5050`)
> se hit karta hai — backend hamesha port 5050 pe chalna chahiye, warna frontend pe "Network Error" aayega
> aur socket bhi connect nahi hoga.

The database **auto-seeds** on first boot (60 customers, 12 groups, 3 Telegram accounts, 500+ messages,
assignment history, temporary-access examples, read/unread states). Manual reseed:

```bash
cd backend && npm run seed   # or use Admin dashboard → Reset Demo Data
```

## Demo Credentials (local development only — PRD §64)

| Role    | Email                   | Password      |
| ------- | ----------------------- | ------------- |
| Admin   | admin@example.com       | `Admin@123`   |
| Manager | manager1@example.com    | `Manager@123` |
| Manager | manager2@example.com    | `Manager@123` |
| Employee| employee1@example.com   | `Employee@123`|
| Employee| employee2…6@example.com | `Employee@123`|

> Managers 1 & 2 each have their own Telegram accounts and teams (employees 1–3 and 4–6).

## Feature Map (PRD coverage)

| Area | Where |
| ---- | ----- |
| Auth + role-based routes | `backend/src/controllers/authController.js`, `frontend/src/routes` |
| Permission system + ceiling | `backend/src/services/permission/*` (every API re-checks scope server-side) |
| Admin dashboard | Users, Platforms & Accounts, Permissions, Customers, Groups, Chats, Activity |
| Manager dashboard | Overview, New/Unassigned queue, Employees + full profiles, Temp Access, Chats, Groups |
| Employee dashboard | WhatsApp-style chat UI (auto-loaded assigned chats + groups) |
| Customers & assignment | One permanent employee per customer; reassignment stores full history |
| Temporary customer access | SPECIFIC or ALL scope; revoking restores original assignment |
| Groups | Multiple assigned employees, per-user read tracking |
| Read status | Per-user `ReadStatus` — internal colored chips; customers never see it |
| Internal sender tracking | `senderType: EMPLOYEE/MANAGER/ADMIN`; customer-facing identity is always "Business Account" |
| Real-time (Socket.IO) | `message:new/sent/read`, `conversation:new/updated`, `customer:assigned/reassigned`, `notification:new`, `typing:start/stop` — recipients computed server-side |
| Notifications | Per-user feed + header drawer + live toasts |
| Audit logs | `ActivityLog` on every important action (PRD §49) |
| Demo tools | Message Simulator (same pipeline as future webhook), Reset Demo Data (dev-only, `DEMO_MODE`) |
| Performance | Pagination everywhere, message cursor pagination ("load older"), Mongo indexes, socket rooms |

## Architecture (future Telegram-ready)

```
        Demo Simulator            (future) Telegram Webhook
              │                              │
        Demo Adapter                 Telegram Adapter (stub, not connected)
              └──────────────┬───────────────────────┘
                       Message Processor   ← single shared pipeline
             (identify account → customer/group → assignment check
              → save message → notifications → Socket.IO emit)
                               │
                        MongoDB + Socket.IO → CRM
```

Key rule respected throughout: **demo logic lives in the adapter, never in controllers**.
Switching to Telegram later = implement `telegramAdapter` + set account `mode: 'LIVE'`.

## Project Structure

```
backend/
├── server.js                 # entry: express + socket.io + db + auto-seed
└── src/
    ├── config/               # env, db
    ├── controllers/          # auth, users, profile, customers, conversations,
    │                         # messages, groups, tempAccess, notifications,
    │                         # platforms, access, dashboard, demo, activity
    ├── middleware/           # JWT protect, roles, error handler
    ├── models/               # User, Platform, ConnectedAccount, AccessGrant, Customer,
    │                         # Group, Conversation, Message, ReadStatus,
    │                         # AssignmentHistory, TemporaryAccess, Notification, ActivityLog
    ├── routes/               # all REST endpoints (PRD §56)
    ├── services/
    │   ├── assignment/       # assign/reassign, temp access, group members
    │   ├── integrations/     # demoAdapter (ACTIVE), telegramAdapter (stub)
    │   ├── message/          # messageProcessor (shared pipeline), messageService
    │   ├── notification/     # create + socket push
    │   └── permission/       # scope, access computation, audience, ceiling
    ├── seeds/                # realistic demo data (PRD §38)
    ├── sockets/              # permission-aware Socket.IO
    └── utils/

frontend/
└── src/
    ├── components/           # ChatUI, SimulatorModal, shared UI, toasts
    ├── context/              # AuthContext
    ├── layouts/              # AppLayout (Finnova-style pill header + drawer)
    ├── pages/
    │   ├── auth/             # Login (with quick-fill demo creds)
    │   ├── admin/            # Overview, Users, Accounts, Permissions, Activity
    │   ├── manager/          # Overview, New queue, Employees, Profile, Temp Access
    │   └── shared/           # Chats (3-pane), Customers, Groups, Notifications, Settings
    ├── routes/               # ProtectedRoute (role-based)
    ├── services/             # axios + JWT interceptors
    ├── socket/               # Socket.IO provider + useSocketEvent hook
    └── utils/
```

## API Overview

Auth: `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
Users: `GET/POST /api/users` · `GET/PATCH/DELETE /api/users/:id` · `GET /api/users/:id/profile`
Customers: `GET /api/customers` · `GET /api/customers/:id` · `POST /api/customers/:id/assign` · `POST /api/customers/:id/reassign`
Conversations: `GET /api/conversations` · `GET /api/conversations/:id` · `POST /api/conversations/:id/read` · `POST /api/conversations/:id/resolve`
Messages: `GET /api/messages/:conversationId?before=` · `POST /api/messages/:conversationId`
Groups: `GET /api/groups` · `GET /api/groups/:id` · `POST /api/groups/:id/assign` · `DELETE /api/groups/:id/assign/:employeeId`
Temporary access: `POST/GET /api/temporary-access` · `DELETE /api/temporary-access/:id`
Notifications: `GET /api/notifications` · `POST /api/notifications/:id/read` · `POST /api/notifications/read-all`
Platforms/Accounts: `GET /api/platforms` · `GET/POST /api/accounts` · `PATCH/DELETE /api/accounts/:id`
Permissions: `GET /api/access?userId=` · `POST /api/access` · `DELETE /api/access/:id` · `GET /api/access/options`
Dashboard: `GET /api/dashboard` · Activity: `GET /api/activity`
Demo (dev-only): `GET /api/demo/options` · `POST /api/demo/message` · `POST /api/demo/reset` · `POST /api/demo/seed`

All protected endpoints verify: **authenticated user → role → resource → permission → scope** (PRD §8).
Unauthorized requests return `403 { "success": false, "message": "..." }`.
