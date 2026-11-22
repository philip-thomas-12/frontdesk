import { PrismaClient, Role, Priority, Status, SenderType, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  { date: new Date('2026-10-20'), name: 'Diwali Festival' },
  { date: new Date('2026-10-21'), name: 'Diwali Day 2' },
  { date: new Date('2026-11-01'), name: 'Regional Holiday' },
  { date: new Date('2026-12-25'), name: 'Christmas Day' },
];

async function main() {
  console.log('🌱 Starting Frontdesk database seeding...');

  // 1. Seed Company & Festival Holidays
  for (const h of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: { name: h.name },
      create: { date: h.date, name: h.name },
    });
  }
  console.log(`✅ Seeded ${HOLIDAYS_2026.length} holidays for 2026.`);

  // 2. Seed System Automation User
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@frontdesk.local' },
    update: { passwordHash },
    create: {
      name: 'System Automation',
      email: 'system@frontdesk.local',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // 3. Seed 9 Demo Support Agents
  const seededAgents = [];
  for (const agent of DEMO_AGENTS) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: { name: agent.name, role: agent.role, avatarUrl: agent.avatarUrl, passwordHash },
      create: {
        name: agent.name,
        email: agent.email,
        passwordHash,
        role: agent.role,
        avatarUrl: agent.avatarUrl,
      },
    });
    seededAgents.push(user);
  }
  console.log(`✅ Seeded ${seededAgents.length} demo agents (Password: ${DEMO_PASSWORD}).`);

  // 4. Seed Demo Customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'dev@latencywatch.com' },
    update: {},
    create: {
      name: 'Sarah Connor',
      email: 'dev@latencywatch.com',
      company: 'Latency Watch Inc',
      phone: '+1 555-0199',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'finance@merchant.com' },
    update: {},
    create: {
      name: 'Marcus Brody',
      email: 'finance@merchant.com',
      company: 'Stripe Merchant Co',
      phone: '+1 555-0244',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { email: 'boss@difficult.com' },
    update: {},
    create: {
      name: 'Vikram Sethi',
      email: 'boss@difficult.com',
      company: 'Difficult Client Corp',
      phone: '+91 98765 43210',
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { email: 'ops@cloudscale.io' },
    update: {},
    create: {
      name: 'Claire Beauchamp',
      email: 'ops@cloudscale.io',
      company: 'CloudScale Global',
      phone: '+44 20 7946 0912',
    },
  });

  // 5. Seed Realistic Tickets with SLA metrics
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Ticket 1: Urgent - In Progress (Assigned to Meera)
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Payment gateway webhook failing with HTTP 504',
      description: 'Our customer checkouts are timing out when attempting to process credit cards via the primary gateway webhook.',
      customerId: customer2.id,
      assignedAgentId: seededAgents[0].id, // Meera Patel
      priority: Priority.URGENT,
      status: Status.IN_PROGRESS,
      createdAt: twoHoursAgo,
      firstResponseAt: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000), // Responded in 30 min
      responseDueAt: new Date(twoHoursAgo.getTime() + 2 * 60 * 60 * 1000),
      resolutionDueAt: new Date(twoHoursAgo.getTime() + 6 * 60 * 60 * 1000),
      assignments: {
        create: {
          agentId: seededAgents[0].id,
          assignedAt: twoHoursAgo,
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customer2.name,
              senderEmail: customer2.email,
              content: 'Our customer checkouts are timing out when attempting to process credit cards via the primary gateway webhook.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: twoHoursAgo,
            },
            {
              senderId: seededAgents[0].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[0].name,
              senderEmail: seededAgents[0].email,
              content: 'Hello Marcus, we are actively investigating the webhook latency on our gateway cluster. Checking ingress logs now.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000),
            },
          ],
        },
      },
      internalNotes: {
        create: {
          authorId: seededAgents[0].id,
          content: 'CONFIDENTIAL: DevOps team confirmed a pod restart on node-east-2. Traffic is being rerouted. Do not mention infrastructure details to client.',
          createdAt: new Date(twoHoursAgo.getTime() + 35 * 60 * 1000),
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorId: null,
              actorName: customer2.name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority URGENT',
              metadata: { priority: 'URGENT', status: 'OPEN' },
              createdAt: twoHoursAgo,
            },
            {
              actorId: seededAgents[0].id,
              actorName: seededAgents[0].name,
              actorRole: 'ADMIN',
              eventType: 'AGENT_ASSIGNED',
              oldValue: 'Unassigned',
              newValue: seededAgents[0].name,
              metadata: { agentId: seededAgents[0].id, action: 'CLAIM' },
              createdAt: twoHoursAgo,
            },
            {
              actorId: seededAgents[0].id,
              actorName: seededAgents[0].name,
              actorRole: 'ADMIN',
              eventType: 'STATUS_CHANGED',
              oldValue: 'OPEN',
              newValue: 'IN_PROGRESS',
              createdAt: twoHoursAgo,
            },
          ],
        },
      },
    },
  });

  // Ticket 2: Medium - Waiting for Customer (Paused SLA)
  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Request for custom CSV export of daily audit logs',
      description: 'We need an automated monthly extract of all user activity in CSV format for compliance reporting.',
      customerId: customer3.id,
      assignedAgentId: seededAgents[1].id, // Alice Chen
      priority: Priority.MEDIUM,
      status: Status.WAITING_FOR_CUSTOMER,
      createdAt: oneDayAgo,
      waitingSince: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
      responseDueAt: new Date(oneDayAgo.getTime() + 4.5 * 60 * 60 * 1000),
      resolutionDueAt: new Date(oneDayAgo.getTime() + 27 * 60 * 60 * 1000),
      assignments: {
        create: {
          agentId: seededAgents[1].id,
          assignedAt: oneDayAgo,
        },
      },
      slaPauses: {
        create: {
          startedAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customer3.name,
              senderEmail: customer3.email,
              content: 'We need an automated monthly extract of all user activity in CSV format for compliance reporting.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: oneDayAgo,
            },
            {
              senderId: seededAgents[1].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[1].name,
              senderEmail: seededAgents[1].email,
              content: 'Hi Vikram, could you please specify the exact date ranges and whether you need IP addresses included in the export?',
              type: MessageType.PUBLIC_REPLY,
              createdAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
            },
          ],
        },
      },
      internalNotes: {
        create: {
          authorId: seededAgents[1].id,
          content: 'Paused SLA. Awaiting customer reply on column specs. If no reply in 5 working days, system will auto-close.',
          createdAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorName: customer3.name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority MEDIUM',
              createdAt: oneDayAgo,
            },
            {
              actorId: seededAgents[1].id,
              actorName: seededAgents[1].name,
              actorRole: 'AGENT',
              eventType: 'SLA_PAUSED',
              newValue: 'Ticket moved to WAITING_FOR_CUSTOMER; SLA clocks paused',
              createdAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
            },
          ],
        },
      },
    },
  });

  // Ticket 3: Urgent - Unassigned (Open for Claiming!)
  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'Database connection pool exhausted on production API',
      description: 'API returns 500 Internal Server Error: Max client connections reached. Multiple customers affected.',
      customerId: customer1.id,
      assignedAgentId: null, // Unassigned!
      priority: Priority.URGENT,
      status: Status.OPEN,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
      responseDueAt: new Date(now.getTime() + 75 * 60 * 1000), // Due in 75 mins!
      resolutionDueAt: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      messages: {
        create: {
          senderType: SenderType.CUSTOMER,
          senderName: customer1.name,
          senderEmail: customer1.email,
          content: 'API returns 500 Internal Server Error: Max client connections reached. Multiple customers affected.',
          type: MessageType.PUBLIC_REPLY,
          createdAt: new Date(now.getTime() - 45 * 60 * 1000),
        },
      },
      auditLogs: {
        create: {
          actorName: customer1.name,
          actorRole: 'CUSTOMER',
          eventType: 'TICKET_CREATED',
          newValue: 'Ticket created with priority URGENT (Unassigned)',
          createdAt: new Date(now.getTime() - 45 * 60 * 1000),
        },
      },
    },
  });

  // Ticket 4: Low - Resolved (Eligible for Reopening within 5 days)
  const ticket4 = await prisma.ticket.create({
    data: {
      title: 'Updated billing invoice receipt email address',
      description: 'Please update our primary invoicing email address to billing@cloudscale.io.',
      customerId: customer4.id,
      assignedAgentId: seededAgents[2].id, // Bob Miller
      priority: Priority.LOW,
      status: Status.RESOLVED,
      createdAt: threeDaysAgo,
      firstResponseAt: new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000),
      resolvedAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000), // Resolved 3 days ago (< 5 working days)
      responseDueAt: new Date(threeDaysAgo.getTime() + 9 * 60 * 60 * 1000),
      resolutionDueAt: new Date(threeDaysAgo.getTime() + 45 * 60 * 60 * 1000),
      assignments: {
        create: {
          agentId: seededAgents[2].id,
          assignedAt: threeDaysAgo,
        },
      },
      messages: {
        createMany: {
          data: [
            {
              senderType: SenderType.CUSTOMER,
              senderName: customer4.name,
              senderEmail: customer4.email,
              content: 'Please update our primary invoicing email address to billing@cloudscale.io.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: threeDaysAgo,
            },
            {
              senderId: seededAgents[2].id,
              senderType: SenderType.AGENT,
              senderName: seededAgents[2].name,
              senderEmail: seededAgents[2].email,
              content: 'We have updated your organization billing profile to billing@cloudscale.io. All future receipts will go there.',
              type: MessageType.PUBLIC_REPLY,
              createdAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000),
            },
          ],
        },
      },
      auditLogs: {
        createMany: {
          data: [
            {
              actorName: customer4.name,
              actorRole: 'CUSTOMER',
              eventType: 'TICKET_CREATED',
              newValue: 'Ticket created with priority LOW',
              createdAt: threeDaysAgo,
            },
            {
              actorId: seededAgents[2].id,
              actorName: seededAgents[2].name,
              actorRole: 'AGENT',
              eventType: 'TICKET_RESOLVED',
              oldValue: 'IN_PROGRESS',
              newValue: 'RESOLVED',
              metadata: { resolutionSummary: 'Billing recipient updated in Stripe settings.' },
              createdAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000),
            },
          ],
        },
      },
    },
  });

  console.log(`✅ Seeded sample tickets (#${ticket1.ticketNumber}, #${ticket2.ticketNumber}, #${ticket3.ticketNumber}, #${ticket4.ticketNumber}).`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

