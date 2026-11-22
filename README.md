# Frontdesk — Centralized Support Ticket Management System

[![Frontdesk CI Pipeline](https://github.com/arvo-systems/frontdesk/actions/workflows/ci.yml/badge.svg)](https://github.com/arvo-systems/frontdesk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Angular](https://img.shields.io/badge/Angular-18.x-red.svg)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)

A full-stack support ticket management platform engineered for **Arvo Systems**. Built to eliminate unstructured spreadsheet and WhatsApp support tracking, Frontdesk provides 9 dedicated support agents with business-hours SLA calculations, atomic concurrency-safe ticket claiming, zero-leakage internal note privacy, and an immutable audit log.

---

## 📑 Table of Contents
1. [Business Problem & Solution](#-business-problem--solution)
2. [Technology Stack](#-technology-stack)
3. [Architecture & System Design](#-architecture--system-design)
4. [Incident Solutions & Operational Guarantees](#-incident-solutions--operational-guarantees)
   - [INC-0291: Concurrency-Safe Ticket Assignment](#inc-0291-concurrency-safe-ticket-assignment)
   - [INC-0304: Zero-Trust Private Note Isolation](#inc-0304-zero-trust-private-note-isolation)
   - [INC-0318: Tamper-Proof Audit Logging](#inc-0318-tamper-proof-audit-logging)
5. [Business Hours & SLA Engine Policy](#-business-hours--sla-engine-policy)
6. [Ticket Lifecycle & State Machine](#-ticket-lifecycle--state-machine)
7. [Priority Change Policy](#-priority-change-policy)
8. [Demo Login Credentials](#-demo-login-credentials)
9. [Local Setup & Installation](#-local-setup--installation)
10. [Running with Docker Compose](#-running-with-docker-compose)
11. [REST API Documentation](#-rest-api-documentation)
12. [Testing & Verification](#-testing--verification)
13. [Deployment Preparation](#-deployment-preparation)

---

## 🏢 Business Problem & Solution

**Arvo Systems** operates a support organization with **9 support agents** handling approximately **40 customer issues daily**. Previously, tickets were managed through shared spreadsheets and WhatsApp chats, resulting in:
- Untracked ticket histories and dropped customer queries.
- Duplicate ticket claiming and overlapping replies (Incident `INC-0291`).
- Accidental exposure of internal support conversations to external customers (Incident `INC-0304`).
- Missing accountability regarding who changed ticket statuses or priorities (Incident `INC-0318`).
- Inaccurate SLA tracking ignoring business hours, weekends, and festival holidays.

**Frontdesk** replaces these manual workflows with a single-pane-of-glass application enforcing domain business logic on the backend while providing a modern, responsive Angular frontend.

---

## 🛠 Technology Stack

### Frontend
- **Framework:** Angular 18 (Standalone Components, TypeScript)
- **Routing:** Angular Router (Lazy routing, Auth Guards)
- **Forms:** Angular Reactive Forms (Strict validation)
- **HTTP Client:** Angular `HttpClient` with HTTP Interceptors (JWT Bearer insertion, 401/409 handling)
- **Styling:** Tailwind CSS (Custom theme, responsive mobile/desktop layout)
- **State Management:** Reactive RxJS Services & Observables

### Backend
- **Runtime:** Node.js (v20+) with TypeScript
- **Framework:** Express.js (Clean architecture: Routes, Controllers, Services, Middleware, Schemas, Jobs)
- **Database:** PostgreSQL 15
- **ORM:** Prisma ORM (Type-safe schemas, migrations, connection pooling)
- **Authentication:** JWT (JSON Web Tokens) with 24h expiration + `bcryptjs` password hashing (Salt rounds: 10)
- **Validation:** Zod schemas (Runtime validation for query parameters, request bodies, and route params)
- **Job Scheduling:** Programmatic Node.js recurring background scheduler for 5-day dormant ticket auto-closures

### Testing Architecture
- **Framework:** Jest & `ts-jest`
- **Integration/HTTP Testing:** Supertest ready
- **Suites:** Independent domain unit tests for SLA calculations, business hours boundaries, holiday skips, and status transitions

### Infrastructure & CI/CD
- **Containerization:** Multi-stage Dockerfiles for backend and frontend (Nginx production alpine)
- **Orchestration:** Docker Compose (`docker-compose.yml`)
- **Version Control:** Git & GitHub
- **CI/CD Pipeline:** GitHub Actions (`.github/workflows/ci.yml`)

---

## 🏗 Architecture & System Design

```text
frontdesk/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL models, enums & relational constraints
│   │   └── seed.ts               # Demo agents, holidays, and realistic tickets seeder
│   ├── src/
│   │   ├── config/               # Database client, environment variables, SLA constants
│   │   ├── middleware/           # JWT authentication, RBAC authorization, Zod validation, error handler
│   │   ├── schemas/              # Zod schemas (auth, ticket, reply, note, assignment)
│   │   ├── services/
│   │   │   ├── businessHours.service.ts # Pure working-hours math (09:30-18:30 IST, holidays, weekends)
│   │   │   ├── sla.service.ts           # Response & resolution deadlines, pause/resume, overdue logic
│   │   │   ├── ticketLifecycle.service.ts # State machine, 5-day reopening, 5-day auto-closure
│   │   │   ├── ticket.service.ts        # Atomic assignment (SELECT FOR UPDATE), note isolation
│   │   │   ├── audit.service.ts         # Append-only immutable audit trail logger
│   │   │   └── dashboard.service.ts     # Workload metric aggregations
│   │   ├── controllers/          # Request handlers
│   │   ├── routes/               # Express REST routers
│   │   ├── jobs/                 # Recurring background sweep jobs (auto-close)
│   │   ├── utils/                # Date math, password hashing, JWT signing
│   │   ├── __tests__/            # SLA and domain logic automated test suites
│   │   ├── app.ts                # Express application factory
│   │   └── server.ts             # HTTP server bootstrap & background job runner
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/       # Angular CanActivate AuthGuard
│   │   │   │   ├── interceptors/ # Angular HTTP JWT Interceptor (Bearer token & 409 handling)
│   │   │   │   └── services/     # AuthService, ApiService, ToastService
│   │   │   ├── models/           # TypeScript interfaces (Ticket, User, Message, SLAMetrics)
│   │   │   ├── components/       # Navbar, Sidebar, Badges (Status, Priority, SLA), Toasts, Customer Preview
│   │   │   ├── pages/            # Login, Dashboard, Ticket List, Ticket Create, Ticket Detail, Profile
│   │   │   ├── app.component.ts  # Root layout shell
│   │   │   ├── app.routes.ts     # Client routing table
│   │   │   └── app.config.ts     # Angular dependency injection configuration
│   │   ├── styles.css            # Tailwind directives and custom scrollbars
│   │   └── index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml            # Unified orchestration (PostgreSQL, Backend, Frontend)
├── .github/workflows/ci.yml      # Automated GitHub Actions test & build pipeline
├── .gitignore
├── .env.example
└── README.md
```

---

## 🛡 Incident Solutions & Operational Guarantees

### INC-0291: Concurrency-Safe Ticket Assignment
- **Incident Description:** Two support agents simultaneously claimed an unassigned ticket, leading to duplicate replies and contradictory commitments to the customer.
- **Architectural Solution:**
  1. We enforce database-level transactional concurrency control using PostgreSQL row-level exclusive locks:
     ```sql
     SELECT id, "ticketNumber", "assignedAgentId", status FROM tickets WHERE id = $1 FOR UPDATE
     ```
  2. Inside a `prisma.$transaction`, if `assignedAgentId` is already set, the transaction aborts and returns an `HTTP 409 Conflict`:
     ```json
     {
       "success": false,
       "message": "Conflict (INC-0291): This ticket has already been claimed by Meera Patel."
     }
     ```
  3. The frontend captures HTTP 409 errors through its Angular `jwtInterceptor` and displays a persistent warning toast to the agent without corrupting application state.
  4. The successful claim transitions status atomically to `IN_PROGRESS`, inserts a `TicketAssignment` record, and creates an append-only audit event.

### INC-0304: Zero-Trust Private Note Isolation
- **Incident Description:** An internal support note regarding backend infrastructure instability was inadvertently forwarded to an enterprise customer.
- **Architectural Solution:**
  1. **Physical Schema Separation:** Internal notes are stored in a dedicated `internal_notes` table separate from the `ticket_messages` table.
  2. **Dedicated Customer Endpoints:** The public/customer endpoint (`GET /api/customer/tickets/:id`) queries only public ticket data and does not join `internal_notes`.
  3. **Backend Response Sanitizer:** `ticketService.serializePublicTicket()` explicitly strips `internalNotes`, `auditLogs`, `assignments`, and private metadata before serializing JSON payloads.
  4. **Frontend Separation:** The UI provides two separate tabs with distinct color schemes:
     - **Public Reply:** Blue card labeled *"Public Reply (Sent to Customer)"*.
     - **Internal Note:** Amber card with padlock icon labeled *"Internal Note — Support Only (Protected: Never sent to customer)"*.
  5. **Verification Sandbox:** Reviewers can click **"Customer View Preview"** directly from the navigation bar or ticket detail page to verify what the customer sees.

### INC-0318: Tamper-Proof Audit Logging
- **Incident Description:** Following an SLA breach dispute, the team was unable to prove which agent changed a ticket priority or when it entered a waiting state.
- **Architectural Solution:**
  1. **Immutable Append-Only Log:** Every critical ticket action writes to `ticket_audit_logs` atomically within the mutation transaction.
  2. **Zero Modification APIs:** No `PUT`, `PATCH`, or `DELETE` endpoints exist for audit logs.
  3. **Event Coverage:** Tracks `TICKET_CREATED`, `AGENT_ASSIGNED`, `AGENT_REASSIGNED`, `PRIORITY_CHANGED`, `STATUS_CHANGED`, `PUBLIC_REPLY_ADDED`, `INTERNAL_NOTE_ADDED`, `SLA_PAUSED`, `SLA_RESUMED`, `TICKET_RESOLVED`, `TICKET_REOPENED`, and `SYSTEM_AUTO_CLOSED`.
  4. **Actor Provenance:** Logs actor ID, actor display name, role (`ADMIN`, `AGENT`, `CUSTOMER`, `SYSTEM`), timestamps, and detailed JSON metadata.

---

## ⏱️ Business Hours & SLA Engine Policy

Frontdesk implements an independent, reusable SLA calculation service (`BusinessHoursService` & `SLAService`) adhering strictly to the company calendar:

### 1. Working Hours & Calendar Rules
- **Working Days:** Monday to Friday.
- **Working Hours:** **09:30 AM to 06:30 PM (18:30 IST)** (540 working minutes / 9 working hours per day).
- **Timezone:** `Asia/Kolkata` (UTC +05:30).
- **Weekend Exclusion:** Saturday and Sunday consume **0 business minutes**. A ticket arriving Friday at 18:00 has 30 minutes consumed on Friday and rolls the remaining time to Monday 09:30 AM.
- **Holiday Calendar:** 10 pre-configured statutory and festival holidays for 2026 are excluded (e.g., Diwali, Republic Day, Christmas).

### 2. Priority Levels & SLA Targets
| Priority | First Response SLA | Resolution SLA | Documented Business Target |
|---|---|---|---|
| **URGENT / CRITICAL** | **2 working hours** (120 min) | **Same working day** (by 18:30 IST) | Immediate triage; end-of-shift resolution |
| **MEDIUM** | **4.5 working hours** (270 min) | **3 working days** (27 working hours / 1,620 min) | Standard business request |
| **LOW / SMALL** | **9 working hours** (540 min) | **1 working week** (5 working days / 45 hours / 2,700 min) | Minor enhancement / non-blocking |

### 3. Edge-Case Boundary Rules
- **Tickets Created Before Hours (< 09:30 AM):** The SLA clock snaps to 09:30 AM of that working day.
- **Tickets Created After Hours (>= 18:30 PM):** The SLA clock snaps to 09:30 AM of the next available working day.
- **Tickets Created on Weekends or Holidays:** The SLA clock snaps to 09:30 AM of the next official working day.
- **Urgent Resolution Timing Policy:**
  - If created during business hours, resolution is due at **18:30 IST on that same day**.
  - If created outside business hours or near closing, resolution is due at **18:30 IST of the next working day**.
- **Overdue Status Suppression:** A ticket is **never** marked as overdue outside business hours, on weekends, or during holidays. Overdue indicators only fire during active working shifts.

### 4. Pausing SLA on `WAITING_FOR_CUSTOMER`
- When an agent requests information from a customer, the status moves to `WAITING_FOR_CUSTOMER`.
- An active `SLAPause` record is created and SLA countdowns freeze.
- When the customer responds (via public reply or customer portal), the clock resumes:
  - Exact working minutes elapsed during the pause are calculated.
  - Remaining `responseDueAt` (if unresponded) and `resolutionDueAt` are pushed forward by the exact paused working minutes.
  - An append-only `SLA_RESUMED` audit log is recorded.

---

## 🔄 Ticket Lifecycle & State Machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: Customer / Agent Creates Ticket
    OPEN --> IN_PROGRESS: Agent Claims Ticket
    OPEN --> CLOSED: Cancellation
    IN_PROGRESS --> WAITING_FOR_CUSTOMER: Agent Requests Information (SLA Paused)
    WAITING_FOR_CUSTOMER --> IN_PROGRESS: Customer Replies (SLA Resumed)
    WAITING_FOR_CUSTOMER --> CLOSED: 5 Working Days Inactivity (Auto-Close)
    IN_PROGRESS --> RESOLVED: Agent Solves Issue (Summary Mandatory)
    RESOLVED --> IN_PROGRESS: Reopened (Within 5 Working Days)
    RESOLVED --> CLOSED: Confirmed Closed
    CLOSED --> [*]: Terminal State (Immutable)
```

### 1. 5-Working-Day Automatic Closure
- When a ticket remains in `WAITING_FOR_CUSTOMER` for **5 consecutive working days (2,700 working minutes)** without a customer reply, the background scheduler automatically transitions the ticket to `CLOSED`.
- System records actor as `System Automation` with full audit metadata.

### 2. 5-Working-Day Reopening Window
- Resolved tickets may be reopened within **5 working days (2,700 working minutes)** of the recorded `resolvedAt` timestamp.
- Reopening resets status to `IN_PROGRESS`, clears `resolvedAt`, increments `reopenCount`, and retains full conversation and audit history on the same ticket ID.
- If more than 5 working days have elapsed, the backend rejects the request with HTTP 400 and directs the user to create a new ticket.

---

## 📈 Priority Change Policy

When a ticket's priority is modified during its lifecycle (e.g., upgraded from `LOW` to `URGENT`):
1. **Net Active Working Time Computation:** The engine computes the net active working minutes already elapsed since creation:
   $$\text{Active Minutes} = \text{Total Working Minutes} - \text{Total Paused Working Minutes}$$
2. **Policy Evaluation:**
   - If active elapsed time exceeds the new priority's response target, `responseDueAt` is immediately set to the change timestamp (flagging response breached if unfulfilled).
   - If active elapsed time is within limits, remaining minutes under the new policy are added from the change timestamp forward.
   - For `URGENT` resolution, the deadline snaps to 18:30 IST of the current working day.
3. **Audit Log:** An event (`PRIORITY_CHANGED`) is appended documenting old priority, new priority, reason, and recalculated due dates.

---

## 🔑 Demo Login Credentials

The database seed provisions all **9 Arvo Systems demo agents** with pre-configured tickets:

| Agent Name | Email Address | Role | Password |
|---|---|---|---|
| **Meera Patel** | `meera@arvo.com` | **Support Lead (Admin)** | `Password123!` |
| **Alice Chen** | `alice@arvo.com` | Support Agent | `Password123!` |
| **Bob Miller** | `bob@arvo.com` | Support Agent | `Password123!` |
| **Charlie Davis** | `charlie@arvo.com` | Support Agent | `Password123!` |
| **David Kumar** | `david@arvo.com` | Support Agent | `Password123!` |
| **Elena Rostova** | `elena@arvo.com` | Support Agent | `Password123!` |
| **Farhan Ahmed** | `farhan@arvo.com` | Support Agent | `Password123!` |
| **Grace Hopper** | `grace@arvo.com` | Support Agent | `Password123!` |
| **Henry Clark** | `henry@arvo.com` | Support Agent | `Password123!` |

> **Quick Login Tip:** On the login screen, click any of the 9 agent cards to populate credentials and log in instantly. You can also switch agents in 1 click from the navigation bar.

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js:** v18.x or v20.x+
- **PostgreSQL:** v14+ (running locally on port `5432` or via Docker)
- **npm:** v9+

### 1. Clone & Configure Environment
```bash
git clone https://github.com/arvo-systems/frontdesk.git
cd frontdesk
cp backend/.env.example backend/.env
```

Ensure `backend/.env` points to your PostgreSQL database:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/frontdesk_db?schema=public"
JWT_SECRET="arvo_frontdesk_jwt_secret_dev_key_2026_super_secure"
JWT_EXPIRES_IN="24h"
CORS_ORIGIN="http://localhost:4200"
SLA_TIMEZONE="Asia/Kolkata"
AUTO_CLOSE_INTERVAL_MS=3600000
```

### 2. Backend Setup & Seeding
```bash
cd backend
npm install
npx prisma db push
npm run prisma:seed
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Running the Development Servers
In Terminal 1 (Backend API):
```bash
cd backend
npm run dev
# API running at http://localhost:5001
```

In Terminal 2 (Angular Frontend):
```bash
cd frontend
npm start
# Application running at http://localhost:4200
```

---

## 🐳 Running with Docker Compose

To run the complete production-configured stack (PostgreSQL database, Node.js backend, and Nginx-hosted Angular frontend) with a single command:

```bash
docker-compose up --build
```

- **Frontend Portal:** [http://localhost:4200](http://localhost:4200)
- **Backend API:** [http://localhost:5001](http://localhost:5001)
- **Database:** PostgreSQL on `localhost:5432`

---

## 📡 REST API Documentation

All authenticated endpoints require an `Authorization: Bearer <JWT_TOKEN>` header.

### Authentication
- `POST /api/auth/login` — Sign in agent (`email`, `password`). Returns JWT and sanitized user profile.
- `GET /api/auth/me` — Retrieve current authenticated agent profile.
- `GET /api/auth/agents` — List all active Arvo Systems support agents.

### Dashboard Statistics
- `GET /api/dashboard/stats` — Real-time metrics (Total, Open, In-Progress, Waiting, Resolved, Closed, Overdue, My Assigned, Priority Breakdown, Shift Status).

### Ticket Management
- `GET /api/tickets` — Query tickets with filters:
  - `search`: Full-text search across title, description, customer name, email, or ticket ID.
  - `status`: Filter by `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`.
  - `priority`: Filter by `URGENT`, `MEDIUM`, `LOW`.
  - `assignedAgentId`: Filter by agent UUID, `MY_TICKETS`, or `UNASSIGNED`.
  - `isOverdue`: `true` to view only active tickets with breached SLA.
  - `sortBy`: `createdAt`, `priority`, `ticketNumber`, `responseDueAt`, `resolutionDueAt`.
  - `page`, `limit`: Pagination controls.
- `POST /api/tickets` — Raise a new ticket (`title`, `description`, `customerName`, `customerEmail`, `priority`).
- `GET /api/tickets/:id` — Retrieve ticket details with messages, internal notes, audit history, and live SLA gauges.
- `POST /api/tickets/:id/claim` — Concurrency-safe claim (`SELECT FOR UPDATE`). Returns 409 Conflict if claimed by another agent.
- `POST /api/tickets/:id/reassign` — Reassign ticket to another colleague (`targetAgentId`).
- `PATCH /api/tickets/:id/priority` — Update priority (`URGENT`, `MEDIUM`, `LOW`) with SLA recalculation.
- `PATCH /api/tickets/:id/status` — State machine transition (`status`, optional `resolutionSummary` if resolved).
- `POST /api/tickets/:id/reopen` — Reopen resolved ticket within 5 working days (`reason`).
- `POST /api/tickets/:id/replies` — Post public reply to customer (updates `firstResponseAt`).
- `POST /api/tickets/:id/notes` — Post internal support note (zero customer visibility).

### Customer Portal Endpoints (Zero Internal Note Exposure)
- `GET /api/customer/tickets/:id` — Public ticket view (internal notes and staff metadata stripped).
- `POST /api/customer/tickets/:id/reply` — Customer reply (automatically unpauses SLA if waiting).
- `POST /api/customer/tickets/:id/reopen` — Customer reopen ticket within 5 working days.

---

## 🧪 Testing & Verification

Run the automated test suite covering all strict business rules, SLA math, weekend roll-overs, and holiday skips:

```bash
cd backend
npm test
```

### Verified Test Cases
- ✅ **Working Hours Validation:** Mon–Fri 09:30–18:30 IST; before/after shift, weekend, and holiday exclusion.
- ✅ **Monday 10:00 AM Ticket:** Urgent (2h response: 12:00 PM, same-day resolution: 18:30 IST); Medium (4.5h response, 3 working days resolution); Low (9h response, 5 working days resolution skipping holidays).
- ✅ **Friday 18:00 Ticket (Weekend Crossing):** 30 mins used on Friday + 90 mins rolled across Saturday & Sunday to Monday 11:00 AM.
- ✅ **SLA Pauses & Extensions:** Deadlines extend by exact paused working minutes upon customer response.
- ✅ **Overdue Status Suppression:** Confirmed overdue status is suppressed during non-working hours and weekends.

---

## ☁️ Deployment Preparation

Frontdesk is engineered for straightforward cloud deployment without paid vendor lock-in:
- **Frontend:** Compatible with **Vercel**, **Netlify**, or **Cloudflare Pages** (`frontend/dist/frontend/browser`).
- **Backend:** Compatible with **Render**, **Railway**, **Fly.io**, or **AWS ECS/App Runner**.
- **Database:** Standard PostgreSQL (compatible with **Supabase**, **Neon**, **AWS RDS**, or **Aiven**).
- **Environment Variables:** All configs are loaded via standard environment variables.

