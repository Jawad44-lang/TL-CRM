# Trading Legend — CRM Workspace

> **Unified Business Messaging CRM** — Telegram (Phase 1), Instagram & WhatsApp (coming soon).
> A full-stack, role-based Customer Relationship Management platform that brings **all your business messaging accounts, customers, groups, and team workflows into one professional dashboard**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem & The Idea](#2-the-problem--the-idea)
3. [Key Value Propositions](#3-key-value-propositions)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Roles & Permission Model](#6-roles--permission-model)
7. [Core Features](#7-core-features)
8. [Use Cases](#8-use-cases)
9. [Getting Started (Installation)](#9-getting-started-installation)
10. [Demo Data & Demo Mode](#10-demo-data--demo-mode)
11. [Real Telegram Integration (Coming)](#11-real-telegram-integration-coming)
12. [Admin Guide](#12-admin-guide)
13. [Manager Guide](#13-manager-guide)
14. [Employee (User) Guide](#14-employee-user-guide)
15. [API Reference](#15-api-reference)
16. [Real-Time Events (Socket.IO)](#16-real-time-events-socketio)
17. [Data Models](#17-data-models)
18. [Security](#18-security)
19. [Roadmap](#19-roadmap)
20. [FAQ](#20-faq)

---

## 1. Project Overview

**Trading Legend CRM** is a complete, production-ready **Business Messaging CRM** built for companies that handle a high volume of customer conversations through messaging platforms.

Today, when a business uses messaging apps (Telegram, WhatsApp, Instagram DMs) to talk to customers, the conversations live inside individual employees' phones. This creates serious problems:

- ❌ Customer data is trapped in personal accounts
- ❌ Nobody knows which employee replied to which customer, or when
- ❌ If an employee leaves or is unavailable, no one can cover their chats
- ❌ Managers have zero visibility into team performance
- ❌ Customer history is lost the moment a chat is deleted

**Trading Legend CRM solves all of this.** Every customer conversation from your business accounts flows into a central system where it can be **assigned, tracked, replied to, audited, and measured** — by the right people, with the right permissions, in real time.

### At a Glance

| Aspect | Detail |
|---|---|
| **Product** | Role-based Business Messaging CRM |
| **Platforms supported** | Telegram (active), Instagram & WhatsApp (coming soon) |
| **Users per setup** | Unlimited — Admins, Managers, Employees |
| **Frontend** | React 18 + Vite + Socket.IO client |
| **Backend** | Node.js (Express 4) + Socket.IO server |
| **Database** | MongoDB (Mongoose 8) |
| **Real-time** | Socket.IO (permission-aware rooms) |
| **Auth** | JWT, bcrypt password hashing |
| **License** | Private — all rights reserved |

---

## 2. The Problem & The Idea

### The Business Reality

In trading, sales, and support businesses, messaging **is** the business. Customers message the business account to ask prices, place orders, and request support. The current way of handling this is broken:

```
Today (Without CRM):
Customer → Business Account → Employee's personal phone → ❌ Lost forever
```

### The Idea

This CRM introduces a **centralized message gateway with a layered permission system**:

```
With This CRM:
Customer → Business Account → CRM Server → Assigned Employee → Tracked, Audited & Measured
                                          ↘ Manager oversight
                                          ↘ Admin full control
```

**The core idea — three pillars:**

1. **Central Inbox** — Every chat from every connected business account appears in one organized interface. No chat is ever lost.
2. **Smart Ownership** — Each customer is *assigned* to a specific employee. Unassigned customers are visible to managers and admins, so no inquiry is ever ignored.
3. **Layered Access Control** — Access is not "all or nothing." It's computed in layers: role → assignment → temporary coverage → explicit grants. This is enterprise-grade permission logic, rare in off-the-shelf CRMs.

---

## 3. Key Value Propositions

| # | Value | Explanation |
|---|---|---|
| 1 | **Nothing gets lost** | Every incoming message is stored, indexed, and searchable — even from customers no employee has been assigned yet. |
| 2 | **Clear ownership** | Every customer belongs to exactly one employee. Managers can reassign instantly when someone is on leave. |
| 3 | **Temporary coverage** | An employee going on vacation? Grant another employee temporary access to their customers for a date range. Access auto-expires. |
| 4 | **Flexible escalation** | Managers can grant extra actions (send, reply, assign, resolve) at Platform / Account / Group / Single-Customer scope — without changing anyone's role. |
| 5 | **Ceiling discipline** | A manager can never grant an action they don't have themselves. Permissions can be delegated safely. |
| 6 | **Full audit trail** | Every assignment, reassignment, grant, and message is logged with who/when/why. |
| 7 | **Workforce analytics** | Attendance month-view + performance scoring (attendance %, messages sent, customers handled) per employee. |
| 8 | **Real-time everything** | New messages, new conversations, typing indicators, and notifications arrive instantly via Socket.IO. |
| 9 | **Team management built-in** | Hierarchy (Admin → Manager → Employee) means each manager sees and manages only their own team — automatically. |
| 10 | **Future-proof adapters** | The Telegram adapter interface is already coded; switching from demo data to real Telegram chats requires **zero changes to core logic**. |

---

## 4. Technology Stack

### Frontend

| Tech | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework (functional components + hooks) |
| Vite | 5.4 | Dev server & production bundler |
| React Router | 6.26 | SPA routing with role-protected routes |
| Socket.IO Client | 4.7 | Real-time messaging, typing, notifications |
| Axios | 1.7 | REST API client with auth interceptor |
| Phosphor Icons | 2.1 | Icon system |
| Custom CSS (`styles.css`) | — | Complete bespoke design system (no UI framework) |

### Backend

| Tech | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18.11 | Runtime (ES Modules) |
| Express | 4.19 | REST API framework |
| Mongoose | 8.6 | MongoDB ODM with schema validation |
| Socket.IO | 4.7 | Real-time bidirectional events |
| JSON Web Token | 9.0 | Stateless authentication |
| bcryptjs | 2.4 | Password hashing (10 salt rounds) |
| dotenv | 16.4 | Environment configuration |
| CORS | 2.8 | Cross-origin policy |

### Database

**MongoDB** — 14 collections:

`User`, `Platform`, `ConnectedAccount`, `AccessGrant`, `TemporaryAccess`, `Customer`, `Group`, `Conversation`, `Message`, `ReadStatus`, `AssignmentHistory`, `Notification`, `ActivityLog`, `Attendance`

### Project Structure

```
CRM/
├── backend/
│   ├── server.js                 # HTTP + Socket.IO bootstrap
│   └── src/
│       ├── app.js                # Express app (routes, middleware)
│       ├── config/               # env.js, db.js
│       ├── controllers/          # 14 controllers (auth, users, customers,
│       │                         #  conversations, messages, groups, temp access,
│       │                         #  notifications, platforms, access, dashboard,
│       │                         #  demo, activity, attendance)
│       ├── middleware/           # auth.js (JWT + RBAC), errorHandler.js
│       ├── models/               # 14 Mongoose models
│       ├── routes/index.js       # Single route registry with role guards
│       ├── seeds/                # Demo data generators
│       ├── services/
│       │   ├── assignment/       # assignment, group, temp-access services
│       │   ├── integrations/     # demoAdapter ✅ | telegramAdapter (Phase 2)
│       │   ├── message/          # messageProcessor (pipeline), messageService
│       │   ├── notification/     # notificationService
│       │   └── permission/       # permission, audience, scope, ceiling services
│       ├── sockets/index.js      # Permission-aware Socket.IO
│       └── utils/                # ApiError, asyncHandler, pagination, logActivity…
├── frontend/
│   └── src/
│       ├── components/           # ChatUI, WorkforceDashboard, SimulatorModal, ui…
│       ├── context/              # AuthContext, ThemeContext
│       ├── layouts/AppLayout.jsx
│       ├── pages/                # admin/ manager/ shared/ auth/
│       ├── routes/ProtectedRoute.jsx
│       ├── services/api.js       # Axios instance
│       ├── socket/socket.jsx
│       └── utils/format.js
├── package.json                  # Root scripts (install-all, dev, build, start)
└── README.md
```

---

## 5. System Architecture

### High-Level Flow

```
┌────────────────────┐      ┌──────────────────────────────┐
│  External Platform │      │        Browser Clients       │
│ (Telegram / demo)  │      │  Admin │ Manager │ Employee  │
└─────────┬──────────┘      └──────────────┬───────────────┘
          │ webhook / adapter              │ HTTPS REST + WSS
          ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Express)                 │
│                                                              │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ REST API   │  │ Message Pipeline │  │  Socket.IO Hub   │  │
│  │ /api/*     │  │ (messageProcessor│  │  (JWT handshake, │  │
│  │ JWT guards │  │  → audience →    │  │   scoped rooms)  │  │
│  │ RBAC       │  │  notify → emit)  │  │                  │  │
│  └─────┬──────┘  └────────┬─────────┘  └────────┬─────────┘  │
│        │                  │                     │            │
│  ┌─────▼──────────────────▼─────────────────────▼─────────┐  │
│  │     Permission Engine (role → assignment → temp →      │  │
│  │     grants, with manager ceiling enforcement)          │  │
│  └──────────────────────────┬─────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │     MongoDB      │
                    └──────────────────┘
```

### The Message Pipeline (the heart of the system)

Every incoming message — whether simulated (demo) or a real Telegram webhook (future) — flows through **one identical pipeline** (`messageProcessor.js`):

1. **Identify Account** — validate the connected business account is active.
2. **Identify Entity** — find or create the Customer / Group on first contact (auto-upsert by `accountId + externalId`).
3. **Find/Create Conversation** — one conversation per customer or group.
4. **Persist Message** — stored with direction, sender type, external ID, timestamp, media.
5. **Update Counters** — conversation `lastMessage`, entity `lastMessageAt`.
6. **Compute Audience** — the server decides *exactly* who is allowed to see this conversation (audience service).
7. **Create Notifications** — targeted per audience (assigned employee, team manager, unassigned watchers).
8. **Emit Real-Time Events** — `message:new`, `conversation:new` to permission-scoped rooms only.

> **Why this matters:** because both the demo adapter and the future Telegram adapter feed the *same* pipeline, going live with real Telegram Business chats requires only wiring the webhook — nothing else changes.

---

## 6. Roles & Permission Model

### Role Hierarchy

```
ADMIN
 ├── MANAGER 1  →  Employees (own team)
 └── MANAGER 2  →  Employees (own team)
 (Admin has full access to everything)
```

| Capability | ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|
| View everything (all accounts/customers/chats) | ✅ | — | — |
| Create / edit users | ✅ | ✅ (own team) | — |
| Delete users | ✅ | — | — |
| Manage connected accounts | ✅ | — | — |
| Manage permissions & grants | ✅ | ✅ (within ceiling) | — |
| See own team's customers + assign/reassign | — | ✅ | — |
| Grant temporary access | — | ✅ | — |
| Reply to assigned customers | — | ✅ (team) | ✅ (own) |
| View attendance & performance | ✅ (all) | ✅ (team) | — |
| View activity logs | ✅ | — | — |
| Chats, notifications, settings | ✅ | ✅ | ✅ |

### The Four Access Layers

Effective permission on any resource is computed as a **union of layers** (`permissionService.js`):

1. **Role layer** — ADMIN sees all; MANAGER sees their team's workload.
2. **Assignment layer** — an employee's assigned customers (BASE_ACTIONS: VIEW, READ, SEND, REPLY) and group memberships.
3. **Temporary access layer** — active time-boxed coverage grants.
4. **Explicit grant layer** — AccessGrants at PLATFORM / ACCOUNT / GROUP / CUSTOMER scope, each with a custom action set.

### Scopes

| Scope | Applies to | Example |
|---|---|---|
| `PLATFORM` | every account on a platform | "Give Bilal access to all Telegram accounts" |
| `ACCOUNT` | one business account | "Sales account only" |
| `GROUP` | one group chat | "Corporate accounts group" |
| `CUSTOMER` | one single customer | "Coverage while Sara is away" |

### Actions

`VIEW · READ · SEND · REPLY · DELETE · EDIT · ASSIGN · REASSIGN · RESOLVE · MANAGE`

**Manager Ceiling Rule:** a manager can never grant an action that they themselves do not have on the target scope (ceiling service). This keeps delegation safe and auditable.

---

## 7. Core Features

### Messaging
- **Unified Inbox (Chats page)** — all customer and group conversations across all connected accounts, with unread badges, last-message previews, resolve toggle, and file attachments view.
- **Real-time chat UI** — messages appear instantly; typing indicators between team members.
- **Outgoing replies** — sent messages show the customer only the **Business Account** identity — personal employee identities are never exposed.
- **Media support** — conversation file listings and media messages.

### Customer Management
- Auto-created customer records on first message (name, username, phone, platform).
- Assignment & reassignment with full **AssignmentHistory** (who assigned, to whom, when, why).
- Customer online status, last-message timestamps, status tracking.

### Groups
- Group chats with **multiple employees as members** — everyone sees the shared conversation.
- Managers/admins can add or remove employees from groups.

### Permissions & Access
- Access Grants (scope + action sets) created by Admins and Managers.
- Temporary Access with **start/end dates** — ideal for leave coverage; auto-expiry.
- Manager ceiling enforcement.

### Workforce Management
- **Attendance** — month grid per employee (PRESENT / ABSENT / LEAVE / LATE) with percentage summary.
- **Performance** — composite score per employee: attendance % (50%) + messages sent (30%) + customers handled (20%).
- **Activity logs** — full audit of system events.

### Platform & Accounts
- Platform registry: Telegram (ACTIVE), Instagram & WhatsApp (COMING_SOON).
- Multiple business accounts per platform, each with its own team and manager.

### Notifications
- Per-user notification feed: new messages, new unassigned customers, group messages, assignments.
- Mark one / mark all read.

### Demo Tools (DEMO_MODE only)
- **Message Simulator** — inject simulated incoming customer messages to test workflows live.
- Demo reset & re-seed (admin).

---

## 8. Use Cases

### UC-1: New Customer Inquiries
A customer messages the Telegram business account for the first time. The CRM auto-creates the customer + conversation, marks it **Unassigned**, and notifies all managers. A manager assigns it to the right employee within seconds. **Nothing falls through the cracks.**

### UC-2: Employee Leave Coverage
Sara (employee) goes on leave for a week. Her manager opens **Temporary Access**, grants Usman coverage of Sara's customers until she returns. Usman can VIEW/READ/SEND/REPLY on all of Sara's chats. Access **auto-expires** — no manual cleanup.

### UC-3: Scaling a Sales Team
The business adds a new Telegram sales account. The admin creates the account, grants the sales manager full actions on it, and the manager adds employees. The account's chats start flowing in immediately, isolated from other accounts unless explicitly granted.

### UC-4: Escalating a Critical Customer
A VIP customer needs senior handling. The manager grants a specific employee extra actions (ASSIGN, RESOLVE) on *that single customer* only — precise, revocable, audited.

### UC-5: Performance Review
Month-end: the admin opens **Attendance & Performance**, filters the month, and sees each employee's attendance %, messages sent, customers handled, and a composite score — objective data for reviews and incentives.

### UC-6: Multi-Employee Group Support
A corporate Telegram group is managed by 3 employees simultaneously. All three see the group conversation live; any can reply; the manager monitors from the overview.

### UC-7: Auditing a Dispute
A customer claims "no one replied to me for days." The admin opens the customer's conversation, message timestamps, and assignment history — a complete, timestamped record settles the dispute instantly.

### UC-8: Onboarding a New Employee
Manager creates the user (role EMPLOYEE), assigns customers, and the employee logs in to see exactly their workload. No training on "who owns what" needed.

---

## 9. Getting Started (Installation)

### Prerequisites
- **Node.js** ≥ 18.11
- **MongoDB** running locally (or a MongoDB Atlas URI)

### 1) Install dependencies

```bash
npm run install-all
```

(Installs root + backend + frontend packages in one command.)

### 2) Configure the backend environment

Create `backend/.env` (see `backend/.env.example`):

```env
MONGO_URI=mongodb://127.0.0.1:27017/messaging_crm
JWT_SECRET=change-this-to-a-long-random-string
PORT=5050
CLIENT_URL=http://localhost:5173
DEMO_MODE=true
```

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing auth tokens (change in production!) |
| `PORT` | Backend port |
| `CLIENT_URL` | Frontend URL (CORS) |
| `DEMO_MODE` | `true` enables demo tools & auto-seed; set `false` in production |

### 3) Run everything

```bash
npm run dev
```

Starts backend (with auto-reload) and frontend (Vite) together:
- Frontend → http://localhost:5173
- Backend API → http://localhost:5050/api

If the database is empty, demo data seeds automatically on first start.

### 4) Manual seed (optional)

```bash
npm --prefix backend run seed
```

### 5) Production build

```bash
npm run build     # builds frontend → frontend/dist
npm start         # serves the backend
```

### Demo Login Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@123` |
| Manager 1 | `manager1@example.com` | `Manager@123` |
| Manager 2 | `manager2@example.com` | `Manager@123` |
| Employees 1–6 | `employee1@example.com` … `employee6@example.com` | `Employee@123` |

> ⚠️ Change all passwords and the JWT secret before any real deployment.

---

## 10. Demo Data & Demo Mode

> ### ⚠️ Important note for the client
> **The system currently runs on DEMO DATA.** All customers, groups, chats, messages, attendance records, and connected accounts you see are **simulated sample data** generated by the built-in demo seeder (9 users, 3 Telegram accounts, 60 customers, 12 groups, and hundreds of messages).

This is intentional and is the correct way to deliver the project, because:

1. **Safe evaluation** — you can explore every screen, permission, and workflow without touching a single real customer conversation.
2. **Full workflow testing** — use the built-in **Message Simulator** (Admin/Manager) to inject new "incoming customer messages" and watch them arrive in real time, get assigned, replied to, and audited.
3. **Zero-risk reset** — Admin can reset/seed the demo data at any time from the demo tools.

### What changes when you go live?

| Area | Now (Demo) | Live (Real Data) |
|---|---|---|
| Chats | Simulated threads | **Your real Telegram Business account chats** flow in automatically |
| Customers | Generated names | Real customers, auto-created from their Telegram profiles on first contact |
| Accounts | Demo placeholders (`mode: DEMO`) | Your actual business accounts connected via Telegram |
| Messages | Simulator-generated | Real customer messages, stored permanently |
| Everything else | Identical | **Identical** — users, permissions, teams, attendance, analytics all work the same |

**No retraining, no workflow changes, no data migration of business logic.** The moment real Telegram integration is connected, your team keeps using the exact same interface they practiced on.

---

## 11. Real Telegram Integration (Coming)

The system was deliberately built with a **pluggable adapter architecture**:

```
Telegram Webhook → telegramAdapter.processWebhookUpdate() → messageProcessor.processIncomingMessage() → CRM
```

- ✅ `demoAdapter.js` — active now (simulates the platform side)
- 🔜 `telegramAdapter.js` — the interface is already implemented and waiting for Phase 2 wiring (bot token + webhook URL)

Once connected:

> 💬 **"Aapke Telegram Business account ki saari chats automatically yahan aa jayengi."**
> Every conversation customers have with your Telegram business account will land in this CRM in real time — assigned, tracked, and reply-able — while your team works entirely from this dashboard instead of scattered phones.

Phase 2 checklist (server-side, no core changes):
1. Register the bot / business account and set the webhook URL to the backend.
2. Implement `processWebhookUpdate()` in `telegramAdapter.js` (map Telegram update → pipeline parameters).
3. Implement `sendMessage()` (Telegram Bot API call) and set `isActive = true`.
4. Switch accounts from `DEMO` to live mode and turn `DEMO_MODE=false`.

---

## 12. Admin Guide

**Who is this for:** the system owner / IT administrator. The Admin has complete control of the platform.

### 12.1 First Login
1. Open the app → log in with the admin account.
2. You land on **Overview** — a live dashboard of users, accounts, customers, groups, chats, and activity.

### 12.2 Overview Dashboard
Key metrics at a glance: total users by role, connected accounts, customer counts (assigned vs unassigned), active conversations, and recent activity.

### 12.3 Managing Users (`Users`)
- **Create user** — name, email, password, role (ADMIN/MANAGER/EMPLOYEE), and for managers/employees, their reporting manager (this defines the team hierarchy).
- **Edit user** — update details, change role, disable (`DISABLED`) instead of deleting to preserve history.
- **Delete user** — admin only. Prefer disabling to keep the audit trail intact.
- **Employee profile** — click any user to see their assignments, activity, attendance, and performance.

### 12.4 Managing Platforms & Accounts (`Platforms`)
- View the platform registry: Telegram is ACTIVE; Instagram & WhatsApp are COMING SOON.
- **Create a connected account** — e.g., "Telegram Sales" business account. Each account is an isolated workspace: its customers, groups, and chats are only visible to people granted access.
- **Edit / delete accounts** — deleting an account removes its access surface (use with care).

### 12.5 Managing Permissions (`Permissions`)
- Create **Access Grants**: pick a user → pick scope (Platform / Account / Group / Customer) → pick actions → save with an optional note.
- Review all existing grants; delete any grant instantly (revocation is immediate).
- Use the note field ("why was this granted?") — future auditors will thank you.

### 12.6 Attendance & Performance
- Select any month → see every employee & manager's day-by-day attendance grid (PRESENT/ABSENT/LEAVE/LATE) with percentages.
- Performance tab shows messages sent, customers handled, and a composite score per person.

### 12.7 Activity Logs (`Activity`)
Full audit trail of system events — assignments, grants, account changes, message activity. Use it to answer "who did what, when?"

### 12.8 Shared Pages
- **Customers** — browse all customers across all accounts; inspect any conversation.
- **Groups** — see all groups and their member employees.
- **Chats** — the unified inbox; admin can read every conversation and reply as the business account.
- **Notifications / Settings** — personal feed and preferences (theme, profile).

### 12.9 Demo Tools (when DEMO_MODE=true)
- **Simulate a message** — pick an account and customer, inject an incoming message, and watch the real-time flow.
- **Reset demo / Re-seed** — restore the full sample dataset at any time.

### Admin Best Practices
- ✅ Create managers first, then employees under them — the hierarchy powers visibility everywhere.
- ✅ Give managers ACCOUNT-scope grants with full team actions; let them delegate downward.
- ✅ Use DISABLED status, not deletion, for departing staff.
- ✅ Turn `DEMO_MODE=false` before going live so demo endpoints are disabled at the route level.

---

## 13. Manager Guide

**Who is this for:** team leads / supervisors. A manager sees and manages **only their own team** — automatically, based on the hierarchy set by the admin.

### 13.1 Overview (`Overview`)
Your team dashboard: your employees, their workload, unassigned customers, active conversations, and your team's attendance snapshot.

### 13.2 Adding Team Members (`New`)
Create employee accounts directly from the manager panel. New employees automatically report to you and inherit team-level visibility.

### 13.3 Managing Employees (`Employees`)
- Browse your team, open any **Employee Profile** to see their assigned customers, message activity, attendance, and performance.
- Reassign customers between team members when workloads become unbalanced.

### 13.4 Customers & Assignment
- See all customers of your team's accounts — including **Unassigned** ones (highlighted so none are missed).
- **Assign** a new customer to an employee; **Reassign** with a recorded reason. Every change is written to AssignmentHistory.

### 13.5 Groups
View groups on your accounts, see which employees are members, and manage membership (add/remove team members).

### 13.6 Chats
Your unified inbox: your team's customer chats and group chats. You can read everything your team handles and reply as the business account when escalation is needed.

### 13.7 Granting Permissions
- Create Access Grants for your employees — but only **within your own ceiling**: you can't grant an action you don't have on that scope.
- Typical use: give an employee extra READ access to an account, or SEND/REPLY on one specific customer.

### 13.8 Temporary Access (`Temp Access`)
The leave-coverage tool:
1. Choose the employee going on leave.
2. Choose the covering employee.
3. Choose scope: **All of their customers** or **specific customers**.
4. Set start/end dates → save.
Access is active only within the window and auto-expires; revoke instantly anytime.

### 13.9 Attendance & Performance
Month view for **your team only** — day-by-day attendance plus performance scores to guide reviews and workload balancing.

### Manager Best Practices
- ✅ Check "Unassigned" customers daily — new inquiries land there first.
- ✅ Use temporary access instead of permanent grants for coverage.
- ✅ Use reassignment reasons — they make audits painless.

---

## 14. Employee (User) Guide

**Who is this for:** front-line staff. You see exactly your own workload — nothing more, nothing less.

### 14.1 Chats (your main workspace)
- The left panel lists **your assigned customers' conversations** plus groups you're a member of (and anything you've been temporarily granted).
- Unread badges show what needs attention; the list is sorted by latest message.
- Open a conversation → read history → type your reply → **Send**. Messages go out under the **Business Account** name (customers never see personal names).
- Resolve finished conversations with the **Resolve** toggle to keep the inbox clean.

### 14.2 Typing Indicators
When a teammate is typing in the same conversation, you'll see it live — no double replies.

### 14.3 Notifications
- Get notified instantly for: new messages on your customers, new group messages, assignments, and coverage grants.
- Mark individual or all notifications as read.

### 14.4 Settings
- Update your profile (name, phone, avatar color).
- Change password.
- Switch light/dark theme.

### 14.5 What you can't do (by design)
- You don't see other employees' customers (unless granted) — customer data stays protected.
- You can't assign/reassign customers — ask your manager.

### Employee Best Practices
- ✅ Reply within your SLA — every message is timestamped and visible to management.
- ✅ Use Resolve when a conversation is finished; it keeps dashboards accurate.
- ✅ If you'll be away, ask your manager to set up Temporary Access coverage — customers keep getting replies.

---
<!-- PART9 -->

