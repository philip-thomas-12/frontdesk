/**
 * startupSeed.ts
 * Runs once on server startup. If the database has no users (fresh/empty DB),
 * it pushes the schema and seeds all demo agents + tickets automatically.
 * Uses upsert everywhere — safe to run repeatedly.
 */
import { PrismaClient, Role, Priority, Status, SenderType, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const DEMO_AGENTS = [
  { name: 'Meera Patel',   email: 'meera@arvo.com',   role: Role.ADMIN, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { name: 'Alice Chen',    email: 'alice@arvo.com',    role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
  { name: 'Bob Miller',    email: 'bob@arvo.com',      role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { name: 'Charlie Davis', email: 'charlie@arvo.com',  role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { name: 'David Kumar',   email: 'david@arvo.com',    role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Elena Rostova', email: 'elena@arvo.com',    role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Farhan Ahmed',  email: 'farhan@arvo.com',   role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'Grace Hopper',  email: 'grace@arvo.com',    role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { name: 'Henry Clark',   email: 'henry@arvo.com',    role: Role.AGENT, avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
];

const HOLIDAYS_2026 = [
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

export async function runStartupSeed(): Promise<void> {
  try {
    // Check if DB already has users — if so, skip seeding
    const existingUserCount = await prisma.user.count();
    if (existingUserCount > 0) {
      console.log(`✅ Database already seeded (${existingUserCount} users found). Skipping startup seed.`);
      return;
    }

    console.log('🌱 Empty database detected — running startup seed...');

    // 1. Holidays
    for (const h of HOLIDAYS_2026) {
      await prisma.holiday.upsert({
        where: { date: h.date },
        update: { name: h.name },
        create: { date: h.date, name: h.name },
      });
    }
    console.log(`✅ Seeded ${HOLIDAYS_2026.length} holidays.`);

    // 2. Password hash (computed once for all agents)
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // 3. System automation user
    await prisma.user.upsert({
      where: { email: 'system@frontdesk.local' },
      update: { passwordHash },
      create: { name: 'System Automation', email: 'system@frontdesk.local', passwordHash, role: Role.ADMIN },
    });

    // 4. Seed 9 demo agents
    const seededAgents = [];
    for (const agent of DEMO_AGENTS) {
      const created = await prisma.user.upsert({
        where: { email: agent.email },
        update: { passwordHash, avatarUrl: agent.avatarUrl },
        create: { ...agent, passwordHash },
      });
      seededAgents.push(created);
    }
    console.log(`✅ Seeded ${seededAgents.length} demo agents.`);

    // 5. Demo customers
    const customers = await Promise.all([
      prisma.customer.upsert({ where: { email: 'john.doe@techcorp.io' }, update: {}, create: { name: 'John Doe', email: 'john.doe@techcorp.io', company: 'TechCorp Solutions' } }),
      prisma.customer.upsert({ where: { email: 'sarah.m@globalretail.com' }, update: {}, create: { name: 'Sarah Mitchell', email: 'sarah.m@globalretail.com', company: 'Global Retail Inc' } }),
      prisma.customer.upsert({ where: { email: 'r.patel@startupxyz.in' }, update: {}, create: { name: 'Raj Patel', email: 'r.patel@startupxyz.in', company: 'StartupXYZ' } }),
      prisma.customer.upsert({ where: { email: 'finance@cloudscale.io' }, update: {}, create: { name: 'CloudScale Finance', email: 'finance@cloudscale.io', company: 'CloudScale Systems' } }),
    ]);
    console.log(`✅ Seeded ${customers.length} demo customers.`);

    // 6. Sample tickets
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    await prisma.ticket.create({
      data: {
        title: 'Production database connection pool exhausted',
        description: 'API returns 500 Internal Server Error: Max client connections reached. Multiple customers affected.',
        customerId: customers[0].id,
        priority: Priority.URGENT,
        status: Status.OPEN,
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
        responseDueAt: new Date(now.getTime() + 75 * 60 * 1000),
        resolutionDueAt: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        messages: { create: { senderType: SenderType.CUSTOMER, senderName: customers[0].name, senderEmail: customers[0].email, content: 'API returns 500 Internal Server Error: Max client connections reached. Multiple customers affected.', type: MessageType.PUBLIC_REPLY, createdAt: new Date(now.getTime() - 45 * 60 * 1000) } },
        auditLogs: { create: { actorName: customers[0].name, actorRole: 'CUSTOMER', eventType: 'TICKET_CREATED', newValue: 'Ticket created with priority URGENT (Unassigned)', createdAt: new Date(now.getTime() - 45 * 60 * 1000) } },
      },
    });

    await prisma.ticket.create({
      data: {
        title: 'SSO integration failing with SAML assertion error',
        description: 'Single Sign-On stopped working after the latest update. Users cannot log in via our identity provider.',
        customerId: customers[1].id,
        assignedAgentId: seededAgents[0].id,
        priority: Priority.MEDIUM,
        status: Status.IN_PROGRESS,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        firstResponseAt: new Date(now.getTime() - 90 * 60 * 1000),
        responseDueAt: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
        resolutionDueAt: new Date(now.getTime() + 22 * 60 * 60 * 1000),
        assignments: { create: { agentId: seededAgents[0].id, assignedAt: new Date(now.getTime() - 90 * 60 * 1000) } },
        messages: {
          createMany: {
            data: [
              { senderType: SenderType.CUSTOMER, senderName: customers[1].name, senderEmail: customers[1].email, content: 'SSO completely broken after the update. No one can log in.', type: MessageType.PUBLIC_REPLY, createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
              { senderId: seededAgents[0].id, senderType: SenderType.AGENT, senderName: seededAgents[0].name, senderEmail: seededAgents[0].email, content: 'I have reproduced the issue in our test environment. Looking into the SAML certificate rotation.', type: MessageType.PUBLIC_REPLY, createdAt: new Date(now.getTime() - 90 * 60 * 1000) },
              { senderId: seededAgents[0].id, senderType: SenderType.AGENT, senderName: seededAgents[0].name, senderEmail: seededAgents[0].email, content: 'INTERNAL NOTE: Likely caused by expired IdP certificate. Checking with the SSO team.', type: MessageType.INTERNAL_NOTE, createdAt: new Date(now.getTime() - 60 * 60 * 1000) },
            ],
          },
        },
        auditLogs: {
          createMany: {
            data: [
              { actorName: customers[1].name, actorRole: 'CUSTOMER', eventType: 'TICKET_CREATED', newValue: 'Ticket created with priority MEDIUM', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
              { actorId: seededAgents[0].id, actorName: seededAgents[0].name, actorRole: 'AGENT', eventType: 'TICKET_ASSIGNED', newValue: seededAgents[0].name, createdAt: new Date(now.getTime() - 90 * 60 * 1000) },
            ],
          },
        },
      },
    });

    await prisma.ticket.create({
      data: {
        title: 'Request to add bulk user import via CSV',
        description: 'We need to onboard 200 users at once. Currently we have to create each user manually.',
        customerId: customers[2].id,
        priority: Priority.LOW,
        status: Status.WAITING_FOR_CUSTOMER,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        firstResponseAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        responseDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        resolutionDueAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        messages: {
          createMany: {
            data: [
              { senderType: SenderType.CUSTOMER, senderName: customers[2].name, senderEmail: customers[2].email, content: 'We need bulk CSV import urgently for our new office expansion.', type: MessageType.PUBLIC_REPLY, createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
              { senderId: seededAgents[1].id, senderType: SenderType.AGENT, senderName: seededAgents[1].name, senderEmail: seededAgents[1].email, content: 'Could you share a sample CSV with your expected column format?', type: MessageType.PUBLIC_REPLY, createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
            ],
          },
        },
        auditLogs: { create: { actorName: customers[2].name, actorRole: 'CUSTOMER', eventType: 'TICKET_CREATED', newValue: 'Ticket created with priority LOW', createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      },
    });

    await prisma.ticket.create({
      data: {
        title: 'Update billing invoice receipt email address',
        description: 'Please update our primary invoicing email address to billing@cloudscale.io.',
        customerId: customers[3].id,
        assignedAgentId: seededAgents[2].id,
        priority: Priority.LOW,
        status: Status.RESOLVED,
        createdAt: threeDaysAgo,
        firstResponseAt: new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000),
        resolvedAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000),
        responseDueAt: new Date(threeDaysAgo.getTime() + 9 * 60 * 60 * 1000),
        resolutionDueAt: new Date(threeDaysAgo.getTime() + 45 * 60 * 60 * 1000),
        assignments: { create: { agentId: seededAgents[2].id, assignedAt: threeDaysAgo } },
        messages: {
          createMany: {
            data: [
              { senderType: SenderType.CUSTOMER, senderName: customers[3].name, senderEmail: customers[3].email, content: 'Please update our primary invoicing email address to billing@cloudscale.io.', type: MessageType.PUBLIC_REPLY, createdAt: threeDaysAgo },
              { senderId: seededAgents[2].id, senderType: SenderType.AGENT, senderName: seededAgents[2].name, senderEmail: seededAgents[2].email, content: 'Done! All future invoices and receipts will be sent to billing@cloudscale.io.', type: MessageType.PUBLIC_REPLY, createdAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000) },
            ],
          },
        },
        auditLogs: {
          createMany: {
            data: [
              { actorName: customers[3].name, actorRole: 'CUSTOMER', eventType: 'TICKET_CREATED', newValue: 'Ticket created with priority LOW', createdAt: threeDaysAgo },
              { actorId: seededAgents[2].id, actorName: seededAgents[2].name, actorRole: 'AGENT', eventType: 'TICKET_RESOLVED', oldValue: 'IN_PROGRESS', newValue: 'RESOLVED', createdAt: new Date(threeDaysAgo.getTime() + 5 * 60 * 60 * 1000) },
            ],
          },
        },
      },
    });

    console.log('🎉 Startup seed completed successfully! 4 demo tickets created.');
  } catch (err) {
    // Log but do NOT crash the server if seeding fails
    console.error('⚠️  Startup seed failed (server will still start):', err);
  } finally {
    await prisma.$disconnect();
  }
}
