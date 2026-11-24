/**
 * startupSeed.ts
 * Manages database seeding for Frontdesk.
 * Guarantees idempotency: never duplicates tickets or users.
 */
import { PrismaClient, Role, Priority, Status, SenderType, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import slaService from '../services/sla.service';

const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_AGENTS = [
  { name: 'Meera Patel', email: 'meera@arvo.com', role: Role.ADMIN, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { name: 'Alice Chen', email: 'alice@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
  { name: 'Bob Miller', email: 'bob@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { name: 'Charlie Davis', email: 'charlie@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { name: 'David Kumar', email: 'david@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Elena Rostova', email: 'elena@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Farhan Ahmed', email: 'farhan@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'Grace Hopper', email: 'grace@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { name: 'Henry Clark', email: 'henry@arvo.com', role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
];

export const HOLIDAYS_2026 = [
  { date: new Date('2026-01-01'), name: 'New Year Day' },
  { date: new Date('2026-01-26'), name: 'Republic Day' },
  { date: new Date('2026-03-25'), name: 'Holi Festival' },
  { date: new Date('2026-05-01'), name: 'May Day' },
  { date: new Date('2026-08-15'), name: 'Independence Day' },
  { date: new Date('2026-10-02'), name: 'Gandhi Jayanti' },
  { date: new Date('2026-11-01'), name: 'Kerala Piravi / Regional Holiday' },
  { date: new Date('2026-11-08'), name: 'Diwali Festival' },
  { date: new Date('2026-11-09'), name: 'Diwali Day 2' },
  { date: new Date('2026-12-25'), name: 'Christmas Day' },
];

/**
 * Resets and creates the 4 clean, realistic demo tickets with current timestamps.
 * Guarantees zero duplicate tickets and realistic SLA countdowns.
 */
export async function resetAndSeedDemoTickets(): Promise<{ ticketCount: number }> {
  // 1. Seed Holidays
  for (const h of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: { name: h.name },
      create: { date: h.date, name: h.name },
    });
  }
  const holidays = await prisma.holiday.findMany();
  slaService.updateHolidays(holidays);

  // 2. Ensure Users & Agents Exist
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: 'system@frontdesk.local' },
    update: { passwordHash },
    create: { name: 'System Automation', email: 'system@frontdesk.local', passwordHash, role: Role.ADMIN },
  });

  const seededAgents = [];
  for (const agent of DEMO_AGENTS) {
    const u = await prisma.user.upsert({
      where: { email: agent.email },
      update: { passwordHash, avatarUrl: agent.avatarUrl },
      create: { ...agent, passwordHash },
    });
    seededAgents.push(u);
  }

  // 3. Ensure Customers Exist
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { email: 'ops@cloudscale.io' },
      update: {},
      create: { name: 'Claire Beauchamp', email: 'ops@cloudscale.io', company: 'CloudScale Global' },
    }),
    prisma.customer.upsert({
      where: { email: 'cto@fintechflow.com' },
      update: {},
      create: { name: 'Ananya Sharma', email: 'cto@fintechflow.com', company: 'FintechFlow Payments' },
    }),
    prisma.customer.upsert({
      where: { email: 'compliance@healthfirst.org' },
      update: {},
      create: { name: 'Raj Patel', email: 'compliance@healthfirst.org', company: 'HealthFirst Care' },
    }),
    prisma.customer.upsert({
      where: { email: 'billing@globalretail.com' },
      update: {},
      create: { name: 'Sarah Mitchell', email: 'billing@globalretail.com', company: 'Global Retail Inc' },
    }),
  ]);

  // 4. Delete existing tickets and associated records cleanly
  await prisma.sLAPause.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticketAuditLog.deleteMany();
  await prisma.ticket.deleteMany();

  // 5. Seed 4 Pristine Tickets
  const now = new Date();

  // Ticket 1: Urgent - OPEN, Unassigned (Ready for agents to Claim - Incident INC-0291)
  const t1Created = new Date(now.getTime() - 25 * 60 * 1000); // 25 mins ago
  const t1Sla = slaService.calculateInitialDeadlines(Priority.URGENT, t1Created);
  await prisma.ticket.create({
    data: {
      title: 'Database connection pool exhausted on production API',
      description: 'API returns 500 Internal Server Error: Max client connections reached (100/100). Multiple enterprise clients reporting failed API queries.',
      customerId: customers[0].id,
      priority: Priority.URGENT,
      status: Status.OPEN,
      createdAt: t1Created,
      responseDueAt: t1Sla.responseDueAt,
      resolutionDueAt: t1Sla.resolutionDueAt,
      messages: {
        create: {
          senderType: SenderType.CUSTOMER,
          senderName: customers[0].name,
          senderEmail: customers[0].email,
          content: 'API returns 500 Internal Server Error: Max client connections reached (100/100). Multiple enterprise clients reporting failed API queries.',
          type: MessageType.PUBLIC_REPLY,
          createdAt: t1Created,
        },
      },
      auditLogs: {
        create: {
          actorName: customers[0].name,
          actorRole: 'CUSTOMER',
          eventType: 'TICKET_CREATED',
          newValue: 'Ticket created with priority URGENT (Unassigned)',
          createdAt: t1Created,
        },
      },
    },
  });

  // Ticket 2: Urgent - IN_PROGRESS, Assigned to Meera Patel (Incident INC-0304 private note test)
  const t2Created = new Date(now.getTime() - 40 * 60 * 1000); // 40 mins ago
  const t2Response = new Date(now.getTime() - 20 * 60 * 1000); // Responded in 20 min (SLA met!)
  const t2Sla = slaService.calculateInitialDeadlines(Priority.URGENT, t2Created);
  await prisma.ticket.create({
    data: {
      title: 'Payment gateway webhook failing with HTTP 504 on checkout',
      description: 'Customer checkouts are timing out when attempting to process credit cards via the primary payment gateway webhook.',
      customerId: customers[1].id,
      assignedAgentId: seededAgents[0].id, // Meera Patel
      priority: Priority.URGENT,
      status: Status.IN_PROGRESS,
      createdAt: t2Created,
      firstResponseAt: t2Response,
      responseDueAt: t2Sla.responseDueAt,
      resolutionDueAt: t2Sla.resolutionDueAt,
      assignments: {
        create: {
          agentId: seededAgents[0].id,
          assignedAt: t2Created,
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customers[1].name,
              senderEmail: customers[1].email,
              content: 'Customer checkouts are timing out when attempting to process credit cards via the primary payment gateway webhook.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: t2Created,
            },
            {
              senderId: seededAgents[0].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[0].name,
              senderEmail: seededAgents[0].email,
              content: 'Investigating immediately. I have reproduced the timeout with gateway logs and escalated to infrastructure engineering.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: t2Response,
            },
          ],
        },
      },
      internalNotes: {
        create: {
          authorId: seededAgents[0].id,
          content: 'CONFIDENTIAL / INTERNAL NOTE: Payment provider acknowledged upstream outage in Mumbai datacenter. Failover initiated.',
          createdAt: new Date(now.getTime() - 15 * 60 * 1000),
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorName: customers[1].name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority URGENT',
              createdAt: t2Created,
            },
            {
              actorId: seededAgents[0].id,
              actorName: seededAgents[0].name,
              actorRole: 'AGENT',
              eventType: 'TICKET_ASSIGNED',
              newValue: seededAgents[0].name,
              createdAt: t2Created,
            },
            {
              actorId: seededAgents[0].id,
              actorName: seededAgents[0].name,
              actorRole: 'AGENT',
              eventType: 'FIRST_RESPONSE_SENT',
              newValue: 'First response delivered within 20 working minutes (SLA Target: 2 hours)',
              createdAt: t2Response,
            },
          ],
        },
      },
    },
  });

  // Ticket 3: Medium - WAITING_FOR_CUSTOMER, Assigned to Alice Chen (SLA Paused test)
  const t3Created = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const t3Response = new Date(now.getTime() - 90 * 60 * 1000);
  const t3Sla = slaService.calculateInitialDeadlines(Priority.MEDIUM, t3Created);
  const t3 = await prisma.ticket.create({
    data: {
      title: 'Request for custom CSV export format for daily compliance audits',
      description: 'We need to export daily ticket lifecycle logs to S3 in an ISO-compliant CSV format with actor IDs.',
      customerId: customers[2].id,
      assignedAgentId: seededAgents[1].id, // Alice Chen
      priority: Priority.MEDIUM,
      status: Status.WAITING_FOR_CUSTOMER,
      createdAt: t3Created,
      firstResponseAt: t3Response,
      responseDueAt: t3Sla.responseDueAt,
      resolutionDueAt: t3Sla.resolutionDueAt,
      assignments: {
        create: {
          agentId: seededAgents[1].id,
          assignedAt: t3Created,
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customers[2].name,
              senderEmail: customers[2].email,
              content: 'We need to export daily ticket lifecycle logs to S3 in an ISO-compliant CSV format with actor IDs.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: t3Created,
            },
            {
              senderId: seededAgents[1].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[1].name,
              senderEmail: seededAgents[1].email,
              content: 'We can configure an S3 bucket delivery. Could you confirm whether you need comma or tab delimiters, and provide your AWS KMS key ARN?',
              type: MessageType.PUBLIC_REPLY,
              createdAt: t3Response,
            },
          ],
        },
      },
      slaPauses: {
        create: {
          startedAt: t3Response,
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorName: customers[2].name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority MEDIUM',
              createdAt: t3Created,
            },
            {
              actorId: seededAgents[1].id,
              actorName: seededAgents[1].name,
              actorRole: 'AGENT',
              eventType: 'TICKET_STATUS_CHANGED',
              oldValue: 'IN_PROGRESS',
              newValue: 'WAITING_FOR_CUSTOMER',
              metadata: { reason: 'SLA timer paused while awaiting customer configuration parameters.' },
              createdAt: t3Response,
            },
          ],
        },
      },
    },
  });

  // Ticket 4: Low - RESOLVED, Assigned to Bob Miller (Incident 5-day reopening test)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const resolvedTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Resolved 4 hours ago
  const t4Sla = slaService.calculateInitialDeadlines(Priority.LOW, twoDaysAgo);
  await prisma.ticket.create({
    data: {
      title: 'Update billing invoice recipient email to accounts@globalretail.com',
      description: 'Please update our primary invoicing email address to accounts@globalretail.com for automated AP routing.',
      customerId: customers[3].id,
      assignedAgentId: seededAgents[2].id, // Bob Miller
      priority: Priority.LOW,
      status: Status.RESOLVED,
      createdAt: twoDaysAgo,
      firstResponseAt: new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000),
      resolvedAt: resolvedTime,
      responseDueAt: t4Sla.responseDueAt,
      resolutionDueAt: t4Sla.resolutionDueAt,
      assignments: {
        create: {
          agentId: seededAgents[2].id,
          assignedAt: twoDaysAgo,
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customers[3].name,
              senderEmail: customers[3].email,
              content: 'Please update our primary invoicing email address to accounts@globalretail.com for automated AP routing.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: twoDaysAgo,
            },
            {
              senderId: seededAgents[2].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[2].name,
              senderEmail: seededAgents[2].email,
              content: 'We have updated your billing destination profile in Stripe. All future monthly tax invoices will automatically route to accounts@globalretail.com.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: resolvedTime,
            },
          ],
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorName: customers[3].name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority LOW',
              createdAt: twoDaysAgo,
            },
            {
              actorId: seededAgents[2].id,
              actorName: seededAgents[2].name,
              actorRole: 'AGENT',
              eventType: 'TICKET_RESOLVED',
              oldValue: 'IN_PROGRESS',
              newValue: 'RESOLVED',
              metadata: { resolutionSummary: 'Billing recipient updated in Stripe settings.' },
              createdAt: resolvedTime,
            },
          ],
        },
      },
    },
  });

  const finalCount = await prisma.ticket.count();
  console.log(`✅ Pristine demo tickets seeded successfully (${finalCount} tickets).`);
  return { ticketCount: finalCount };
}

/**
 * Startup hook: runs on server boot. Skips if tickets already exist.
 */
export async function runStartupSeed(): Promise<void> {
  try {
    const existingTicketCount = await prisma.ticket.count();
    if (existingTicketCount > 0) {
      console.log(`✅ Database already seeded (${existingTicketCount} tickets found). Skipping startup seed.`);
      return;
    }

    console.log('🌱 Empty database detected — running initial startup seed...');
    await resetAndSeedDemoTickets();
  } catch (err) {
    console.error('⚠️ Startup seed check failed (server will still operate):', err);
  }
}
