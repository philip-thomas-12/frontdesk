# Frontdesk — Candidate Completion Note

**Candidate Role:** Full Stack Developer  
**System:** Frontdesk Support System for Arvo Systems  
**Evaluation Company:** iNav Technologies Pvt. Ltd.  
**Date:** November 22, 2026  

---

## 📌 Section 5 Question: *What did you not finish, and why?*

> *"Running out of time is normal. Not knowing what you skipped is not."*

In building **Frontdesk** under an 8-hour delivery timeline, I deliberately prioritized **business logic correctness**, **data integrity**, and **critical operational guardrails** over secondary decorative features. Every requirement embedded in Meera's meeting notes and the three critical incident reports (`INC-0291`, `INC-0304`, `INC-0318`) has been fully implemented, tested, and verified with real database persistence.

Here is an honest, transparent breakdown of what was prioritized, what was intentionally deferred, why each decision was made, and how they would be addressed in the next sprint.

---

### 1. What Was Fully Built & Delivered (Core Scope)

1. **Working Hours & Festival Holiday SLA Engine (`BusinessHoursService` & `SLAService`)**:
   - Working hours strictly enforced: **09:30 AM to 06:30 PM (18:30 IST), Monday through Friday**.
   - Weekend exclusion: Saturday and Sunday consume **0 business minutes**. A ticket arriving Friday at 18:00 has 30 minutes consumed on Friday and rolls the remaining 90 minutes to Monday 09:30 AM (due Monday 11:00 AM).
   - Festival calendar support: Excludes 10 statutory and festival holidays for 2026 (Diwali, Republic Day, Christmas, etc.).
   - Dynamic SLA target calculations:
     - **Urgent / Critical:** 2 working hours first response, same working day resolution (18:30 IST).
     - **Medium:** 4.5 working hours (half day) first response, 3 working days resolution (27 working hours).
     - **Low / Small:** 9 working hours (1 working day) first response, 1 working week (5 working days / 45 working hours) resolution.
   - **Overdue Suppression:** A ticket is **never** marked overdue outside working hours, on weekends, or during holidays.

2. **SLA Pausing on Customer Wait**:
   - When a ticket status transitions to `WAITING_FOR_CUSTOMER`, the SLA timer pauses immediately and an `sla_pauses` record is opened.
   - When the customer replies (via public reply or portal), the timer resumes, and target deadlines are pushed forward by the exact business duration elapsed while paused.

3. **Concurrency Control & Collision Prevention (Incident INC-0291)**:
   - Database-level transactional concurrency control using PostgreSQL row-level exclusive locks (`SELECT ... FOR UPDATE`).
   - If two agents attempt to claim the same ticket concurrently, the second claim fails with an **HTTP 409 Conflict** error and an explicit message identifying the claiming agent.
   - The Angular `jwtInterceptor` catches HTTP 409 errors and alerts the agent with a warning toast.

4. **Zero-Trust Private Note Isolation (Incident INC-0304)**:
   - Private team notes (`InternalNote`) are physically stored in a separate table from public replies (`TicketMessage`).
   - The dedicated customer API endpoint (`/api/customer/tickets/:id`) queries only public data, and `ticketService.serializePublicTicket()` explicitly strips internal notes.
   - Frontend provides two distinct tabs (Public Reply in blue vs Internal Note in amber with a padlock warning).
   - Reviewers can click **"Customer View Preview"** to inspect the live customer perspective and verify zero data leakage.

5. **Tamper-Proof Immutable Audit Log (Incident INC-0318)**:
   - Append-only event history log (`ticket_audit_logs`). Every ticket creation, assignment claim, reassignment, public reply, internal note, status change, and SLA recalculation records actor name, actor type, timestamp, and metadata.
   - No `UPDATE` or `DELETE` API endpoints exist for audit records.

6. **Middle-of-Ticket Priority Change Policy**:
   - Addressed the unanswered meeting question: *"What happens to the timer if we change a ticket to urgent in the middle?"*
   - Implemented an elapsed-time deduction model: Net active business hours elapsed since creation are computed against the urgent SLA policy. If elapsed time exceeds 2 hours, response SLA is immediately flagged as breached; resolution SLA snaps to the end of the current working day (18:30 IST). A full explanatory audit entry is appended.

7. **5-Day Auto-Closure and 5-Day Customer Reopening Guardrails**:
   - Auto-close qualification after 5 working days (2,700 working minutes) of customer inactivity via background job.
   - Reopening window enforced: Customers or agents can reopen a resolved ticket within 5 working days. Beyond 5 working days, reopening is blocked and the customer must create a new ticket.

8. **Full-Stack Implementation**:
   - **Angular 18 Frontend:** Standalone components, Reactive Forms, single-screen dashboard cards, quick triage pills (`Already Late`, `Waiting on Customer`, `My Assigned`, `Unassigned`), and real-time SLA countdowns.
   - **Node.js/Express + PostgreSQL + Prisma Backend:** 9 seeded demo agents (`meera@arvo.com`, `alice@arvo.com`, etc.) with `Password123!`.

---

### 2. What Was Intentionally Deferred (And Why)

#### A. WebSocket / Server-Sent Events (SSE) Live Typing Presence
- **What was skipped:** Real-time bi-directional WebSockets showing active cursor presence (e.g. *"Agent Alice is currently typing a reply on this ticket"*).
- **Why it was skipped:** Concurrency collision (`INC-0291`) is completely solved at the transactional database level with atomic `SELECT ... FOR UPDATE` locks and HTTP 409 Conflict. A full WebSocket cluster requires stateful socket connections and Redis pub/sub infrastructure, which adds substantial deployment overhead without altering the ACID transactional outcome.
- **How I would build it next:** Introduce a lightweight Server-Sent Events (SSE) channel on `/api/tickets/:id/presence` paired with Redis key expiration (TTL 30s) to broadcast live assignee changes.

#### B. Standalone Cron Daemon for Auto-Close Execution
- **What was skipped:** A separate Redis-backed distributed task queue (e.g., BullMQ or Celery) running external cron daemons.
- **Why it was skipped:** Background cron daemons hosted on serverless platforms (such as Vercel or Render free tier) often spin down after inactivity or require paid external cron services. Instead, we implemented a robust in-process scheduler (`setInterval` with unref) and an on-demand programmatic runner (`ticketLifecycleService.processAutoClosure()`).
- **How I would build it next:** Deploy a GitHub Actions recurring workflow or Vercel Cron (`cron: "0 * * * *"`) pinging a secured `/api/cron/auto-close` endpoint protected by a bearer token.

#### C. Outbound SMTP Email Relay (SendGrid / Postmark / Resend)
- **What was skipped:** Delivering public replies directly to customer email inboxes via SMTP.
- **Why it was skipped:** External SMTP relays require dedicated domain DNS verification (SPF, DKIM, DMARC) and paid third-party API credentials that cannot be bundled portably in a GitHub repository test submission.
- **How I would build it next:** Implement a pluggable `EmailNotificationService` using Resend or AWS SES with transactional HTML templates strictly wrapping public replies.

#### D. Full-Text Search Cluster (Elasticsearch / Meilisearch)
- **What was skipped:** Dedicated external search cluster for message archiving.
- **Why it was skipped:** Arvo currently handles ~40 tickets/day (~1,200/month). For this volume, PostgreSQL B-Tree indexed queries and `ILIKE` multi-attribute filtering run in sub-millisecond response times. Adding Elasticsearch would be premature overengineering.
- **How I would build it next:** Implement PostgreSQL native `tsvector` and `tsquery` full-text search indices with GIN indexing across title, description, and message contents.

---

### 3. Summary Reflection

Every architectural tradeoff was made consciously to guarantee that the **business rules**, **SLA calculation accuracy**, **data isolation security**, and **concurrency safety** specified in Section 3 and Section 4 of the hiring test were 100% complete, fully tested, and verifiable by the evaluating team.

