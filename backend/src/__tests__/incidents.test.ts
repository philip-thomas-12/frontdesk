import request from 'supertest';
import { createApp } from '../app';
import ticketService from '../services/ticket.service';
import ticketLifecycleService from '../services/ticketLifecycle.service';
import { generateToken } from '../utils/jwt.util';
import prisma from '../config/db';
import { Status, Priority } from '@prisma/client';

describe('Incident Guardrails & Security Stories Verification', () => {
  const app = createApp();

  const validUuid = '11111111-1111-4111-a111-111111111111';
  const mockAgentToken = generateToken({
    userId: validUuid,
    name: 'Alice Chen',
    email: 'alice@arvo.com',
    role: 'AGENT',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Prevent tests from failing if local postgres is offline
    jest.spyOn(prisma.holiday, 'findMany').mockResolvedValue([] as any);
  });

  describe('1. Incident INC-0304: Zero-Trust Customer Portal Data Leakage Prevention', () => {
    it('serializePublicTicket completely strips internalNotes, auditLogs, assignments, and internal IDs', () => {
      const internalTicket: any = {
        id: validUuid,
        ticketNumber: 42,
        title: 'Payment gateway timeout',
        description: 'Customer facing problem',
        status: Status.IN_PROGRESS,
        priority: Priority.URGENT,
        customerId: validUuid,
        assignedAgentId: validUuid,
        createdAt: new Date(),
        updatedAt: new Date(),
        responseDueAt: new Date(),
        resolutionDueAt: new Date(),
        assignedAgent: { id: validUuid, name: 'Meera Patel', email: 'meera@arvo.com' },
        customer: { id: validUuid, name: 'John Doe', email: 'john@example.com' },
        internalNotes: [
          { id: 'note-1', content: 'SECRET: Do not tell the customer about the Mumbai outage!', authorName: 'Meera Patel' },
        ],
        auditLogs: [
          { id: 'log-1', eventType: 'PRIORITY_CHANGED', actorName: 'Meera Patel' },
        ],
        assignments: [
          { id: 'assign-1', agentId: validUuid },
        ],
        messages: [
          { id: 'msg-1', content: 'Public reply to customer', type: 'PUBLIC_REPLY' },
        ],
      };

      const publicView = ticketService.serializePublicTicket(internalTicket);

      // Verify complete stripping of confidential fields
      expect(publicView.internalNotes).toBeUndefined();
      expect(publicView.auditLogs).toBeUndefined();
      expect(publicView.assignments).toBeUndefined();
      expect(publicView.slaPauses).toBeUndefined();

      // Verify public information is intact
      expect(publicView.ticketNumber).toBe(42);
      expect(publicView.title).toBe('Payment gateway timeout');
      expect(publicView.messages).toHaveLength(1);
      expect(publicView.messages[0].content).toBe('Public reply to customer');
    });

    it('customer endpoint returns 404 for nonexistent ticket without leaking internal state', async () => {
      jest.spyOn(ticketService, 'getTicketById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/customer/tickets/${validUuid}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
      expect(res.body.ticket).toBeUndefined();
    });
  });

  describe('2. Incident INC-0291: Concurrency Collision Prevention (HTTP 409 Conflict)', () => {
    it('rejects claim with HTTP 409 if ticket is already claimed by another agent', async () => {
      // Mock ticketService.claimOrAssignTicket to simulate the database-level SELECT ... FOR UPDATE conflict
      const spy = jest.spyOn(ticketService, 'claimOrAssignTicket').mockRejectedValueOnce(
        Object.assign(new Error('This ticket has already been claimed by Alice Chen.'), {
          statusCode: 409,
        })
      );

      const res = await request(app)
        .post(`/api/tickets/${validUuid}/claim`)
        .set('Authorization', `Bearer ${mockAgentToken}`)
        .send({ agentId: validUuid })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been claimed by Alice Chen');

      spy.mockRestore();
    });
  });

  describe('3. Incident INC-0318: Provenance & Immutable Audit Log Guardrails', () => {
    it('customer reply endpoint binds identity to verified customer record to prevent spoofing', async () => {
      const mockTicket: any = {
        id: validUuid,
        ticketNumber: 1,
        title: 'Test ticket',
        status: Status.OPEN,
        customer: { id: validUuid, name: 'Real Customer', email: 'real@customer.com' },
      };

      const getSpy = jest.spyOn(ticketService, 'getTicketById').mockResolvedValueOnce(mockTicket);
      const replySpy = jest.spyOn(ticketService, 'addPublicReply').mockResolvedValueOnce({
        id: 'm-1',
        content: 'Customer response',
      } as any);

      // Attacker attempts to post reply spoofing as "Meera Patel (Admin)"
      await request(app)
        .post(`/api/customer/tickets/${validUuid}/reply`)
        .send({
          content: 'Legitimate customer reply',
          customerName: 'Meera Patel (Admin)', // Spoofed name
          customerEmail: 'meera@arvo.com',
        })
        .expect(201);

      // Verify the controller bound the reply to the REAL verified customer, rejecting the spoof
      expect(replySpy).toHaveBeenCalledWith(
        validUuid,
        'Legitimate customer reply',
        expect.objectContaining({
          name: 'Real Customer', // Bound to verified customer!
          email: 'real@customer.com',
          role: 'CUSTOMER',
        })
      );

      getSpy.mockRestore();
      replySpy.mockRestore();
    });
  });

  describe('4. 5-Working-Day Reopening Guardrail', () => {
    it('allows reopening within 5 working days of resolution', async () => {
      const resolvedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const ticket: any = {
        id: 't-resolved',
        status: Status.RESOLVED,
        resolvedAt: resolvedYesterday,
      };

      const eligibility = await ticketLifecycleService.checkReopeningEligibility(ticket, new Date());
      expect(eligibility.eligible).toBe(true);
    });

    it('rejects reopening beyond 5 working days (2700 working minutes)', async () => {
      // Resolved 15 calendar days ago (> 5 working days)
      const resolvedLongAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const ticket: any = {
        id: 't-resolved-old',
        status: Status.RESOLVED,
        resolvedAt: resolvedLongAgo,
      };

      const eligibility = await ticketLifecycleService.checkReopeningEligibility(ticket, new Date());
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('5-working-day post-resolution window has passed');
    });
  });
});
