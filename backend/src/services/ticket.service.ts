import { Priority, Status, SenderType, MessageType, Prisma } from '@prisma/client';
import prisma from '../config/db';
import slaService from './sla.service';
import ticketLifecycleService from './ticketLifecycle.service';
import auditService from './audit.service';
import { BusinessHoursService } from './businessHours.service';

export interface CreateTicketDTO {
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCompany?: string | null;
  priority: Priority;
  creatorId?: string;
  creatorName?: string;
  creatorRole?: string;
}

export interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  isOverdue?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class TicketService {
  /**
   * Create a new ticket with customer record, SLA calculation, initial message, and audit log.
   */
  public async createTicket(data: CreateTicketDTO) {
    // 1. Ensure customer exists or create new
    const customer = await prisma.customer.upsert({
      where: { email: data.customerEmail.toLowerCase().trim() },
      update: {
        name: data.customerName.trim(),
        phone: data.customerPhone || undefined,
        company: data.customerCompany || undefined,
      },
      create: {
        name: data.customerName.trim(),
        email: data.customerEmail.toLowerCase().trim(),
        phone: data.customerPhone || null,
        company: data.customerCompany || null,
      },
    });

    // 2. Fetch holidays to compute SLA deadlines
    const holidays = await prisma.holiday.findMany();
    slaService.updateHolidays(holidays);

    const now = new Date();
    const { responseDueAt, resolutionDueAt } = slaService.calculateInitialDeadlines(data.priority, now);

    // 3. Atomically create ticket, initial customer message, and audit event
    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          customerId: customer.id,
          priority: data.priority,
          status: Status.OPEN,
          createdAt: now,
          updatedAt: now,
          responseDueAt,
          resolutionDueAt,
          messages: {
            create: {
              senderId: data.creatorId || null,
              senderType: data.creatorRole === 'AGENT' || data.creatorRole === 'ADMIN' ? SenderType.AGENT : SenderType.CUSTOMER,
              senderName: data.creatorName || data.customerName,
              senderEmail: data.customerEmail,
              content: data.description.trim(),
              type: MessageType.PUBLIC_REPLY,
              createdAt: now,
            },
          },
        },
        include: {
          customer: true,
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
        },
      });

      // Audit log entry
      await auditService.logEvent(
        {
          ticketId: createdTicket.id,
          actorId: data.creatorId || null,
          actorName: data.creatorName || data.customerName,
          actorRole: data.creatorRole || 'CUSTOMER',
          eventType: 'TICKET_CREATED',
          newValue: `Ticket #${createdTicket.ticketNumber} created with priority ${data.priority}`,
          metadata: {
            priority: data.priority,
            status: Status.OPEN,
            customerEmail: data.customerEmail,
          },
        },
        tx
      );

      return createdTicket;
    });

    return ticket;
  }

  /**
   * List tickets with pagination, search, status, priority, assigned agent, and overdue filtering.
   */
  public async listTickets(filters: TicketFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    // Search by title, description, ticket number or customer name/email
    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      const num = parseInt(term.replace(/^FD-|^TICK-|^#/i, ''), 10);

      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
      ];

      if (!isNaN(num)) {
        where.OR.push({ ticketNumber: num });
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status as Status;
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'ALL') {
      where.priority = filters.priority as Priority;
    }

    // Assigned Agent filter
    if (filters.assignedAgentId && filters.assignedAgentId !== 'ALL') {
      if (filters.assignedAgentId === 'UNASSIGNED') {
        where.assignedAgentId = null;
      } else {
        where.assignedAgentId = filters.assignedAgentId;
      }
    }

    // Overdue filter logic
    if (filters.isOverdue === 'true') {
      const now = new Date();
      where.AND = [
        { status: { in: [Status.OPEN, Status.IN_PROGRESS] } },
        {
          OR: [
            {
              AND: [{ firstResponseAt: null }, { responseDueAt: { lt: now } }],
            },
            {
              AND: [{ resolvedAt: null }, { resolutionDueAt: { lt: now } }],
            },
          ],
        },
      ];
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: Prisma.TicketOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: true,
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          _count: {
            select: { messages: true, internalNotes: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    // Attach real-time SLA metrics to each ticket
    const holidays = await prisma.holiday.findMany();
    slaService.updateHolidays(holidays);
    const now = new Date();

    const formattedTickets = tickets.map((t) => {
      const overdueStatus = slaService.evaluateOverdueStatus(t, now);
      const remainingResponseMinutes = slaService.calculateRemainingWorkingMinutes(t.responseDueAt, now);
      const remainingResolutionMinutes = slaService.calculateRemainingWorkingMinutes(t.resolutionDueAt, now);

      return {
        ...t,
        formattedId: `FD-${String(t.ticketNumber).padStart(4, '0')}`,
        sla: {
          ...overdueStatus,
          remainingResponseMinutes,
          remainingResolutionMinutes,
        },
      };
    });

    return {
      tickets: formattedTickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get ticket details with messages, internal notes, audit log, and SLA analysis.
   */
  public async getTicketById(idOrNumber: string, includeInternalNotes: boolean = true) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({
      where,
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
          },
        },
        ...(includeInternalNotes && {
          internalNotes: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
              },
            },
          },
          assignments: {
            orderBy: { assignedAt: 'desc' },
            include: {
              agent: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
              },
            },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
          },
          slaPauses: {
            orderBy: { startedAt: 'desc' },
          },
        }),
      },
    });

    if (!ticket) return null;

    // Attach computed SLA status
    const holidays = await prisma.holiday.findMany();
    slaService.updateHolidays(holidays);
    const now = new Date();

    const overdueStatus = slaService.evaluateOverdueStatus(ticket, now);
    const remainingResponseMinutes = slaService.calculateRemainingWorkingMinutes(ticket.responseDueAt, now);
    const remainingResolutionMinutes = slaService.calculateRemainingWorkingMinutes(ticket.resolutionDueAt, now);

    return {
      ...ticket,
      formattedId: `FD-${String(ticket.ticketNumber).padStart(4, '0')}`,
      sla: {
        ...overdueStatus,
        remainingResponseMinutes,
        remainingResolutionMinutes,
      },
    };
  }

  /**
   * Concurrency-Safe Ticket Assignment (Incident INC-0291)
   * Uses PostgreSQL row-locking `SELECT ... FOR UPDATE` inside a transaction.
   * If already claimed by another agent, returns HTTP 409 Conflict.
   */
  public async claimOrAssignTicket(
    idOrNumber: string,
    targetAgentId: string,
    actor: { id: string; name: string; role: string }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);

    // Verify target agent exists and has AGENT/ADMIN role
    const agent = await prisma.user.findUnique({
      where: { id: targetAgentId },
    });

    if (!agent || !['ADMIN', 'AGENT'].includes(agent.role)) {
      const error: any = new Error('The target agent must be an active AGENT or ADMIN user.');
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire exclusive row lock on the ticket row
      const rows: any[] = isNum
        ? await tx.$queryRaw`SELECT id, "ticketNumber", "assignedAgentId", status, title FROM tickets WHERE "ticketNumber" = ${parseInt(idOrNumber)} FOR UPDATE`
        : await tx.$queryRaw`SELECT id, "ticketNumber", "assignedAgentId", status, title FROM tickets WHERE id = ${idOrNumber} FOR UPDATE`;

      if (!rows || rows.length === 0) {
        const error: any = new Error('Ticket not found.');
        error.statusCode = 404;
        throw error;
      }

      const lockedTicket = rows[0];

      // 2. Concurrency check: If already assigned to another agent, throw 409 Conflict!
      if (lockedTicket.assignedAgentId && lockedTicket.assignedAgentId !== targetAgentId) {
        // Fetch current assignee name for a polite error message
        const currentAssignee = await tx.user.findUnique({
          where: { id: lockedTicket.assignedAgentId },
          select: { name: true },
        });

        const error: any = new Error(
          `Conflict (INC-0291): This ticket has already been claimed by ${currentAssignee?.name || 'another agent'}.`
        );
        error.statusCode = 409;
        throw error;
      }

      const now = new Date();
      const newStatus = lockedTicket.status === Status.OPEN ? Status.IN_PROGRESS : lockedTicket.status;

      // 3. Atomically update ticket
      const updatedTicket = await tx.ticket.update({
        where: { id: lockedTicket.id },
        data: {
          assignedAgentId: agent.id,
          status: newStatus,
          updatedAt: now,
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          customer: true,
        },
      });

      // 4. Record active assignment record
      await tx.ticketAssignment.create({
        data: {
          ticketId: lockedTicket.id,
          agentId: agent.id,
          assignedAt: now,
          releasedAt: null,
        },
      });

      // 5. Append-only audit log
      await auditService.logEvent(
        {
          ticketId: lockedTicket.id,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          eventType: 'AGENT_ASSIGNED',
          oldValue: lockedTicket.assignedAgentId ? 'Previously Assigned' : 'Unassigned',
          newValue: agent.name,
          metadata: {
            agentId: agent.id,
            action: actor.id === agent.id ? 'CLAIM' : 'ASSIGN',
            assignedBy: actor.name,
          },
        },
        tx
      );

      return updatedTicket;
    });

    return result;
  }

  /**
   * Reassign a ticket to a new agent.
   * Closes previous active TicketAssignment (releasedAt = now) and creates a new one.
   */
  public async reassignTicket(
    idOrNumber: string,
    newAgentId: string,
    actor: { id: string; name: string; role: string }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);

    const targetAgent = await prisma.user.findUnique({
      where: { id: newAgentId },
    });

    if (!targetAgent || !['ADMIN', 'AGENT'].includes(targetAgent.role)) {
      const error: any = new Error('The target agent must be an active AGENT or ADMIN user.');
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      const rows: any[] = isNum
        ? await tx.$queryRaw`SELECT id, "ticketNumber", "assignedAgentId", status, title FROM tickets WHERE "ticketNumber" = ${parseInt(idOrNumber)} FOR UPDATE`
        : await tx.$queryRaw`SELECT id, "ticketNumber", "assignedAgentId", status, title FROM tickets WHERE id = ${idOrNumber} FOR UPDATE`;

      if (!rows || rows.length === 0) {
        const error: any = new Error('Ticket not found.');
        error.statusCode = 404;
        throw error;
      }

      const locked = rows[0];

      if (locked.assignedAgentId === newAgentId) {
        const error: any = new Error('Ticket is already assigned to this agent.');
        error.statusCode = 400;
        throw error;
      }

      const now = new Date();

      // Close previous active assignment
      await tx.ticketAssignment.updateMany({
        where: {
          ticketId: locked.id,
          releasedAt: null,
        },
        data: {
          releasedAt: now,
        },
      });

      // Create new active assignment
      await tx.ticketAssignment.create({
        data: {
          ticketId: locked.id,
          agentId: targetAgent.id,
          assignedAt: now,
          releasedAt: null,
        },
      });

      // Update ticket
      const updated = await tx.ticket.update({
        where: { id: locked.id },
        data: {
          assignedAgentId: targetAgent.id,
          updatedAt: now,
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          customer: true,
        },
      });

      // Audit log
      await auditService.logEvent(
        {
          ticketId: locked.id,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          eventType: 'AGENT_REASSIGNED',
          oldValue: locked.assignedAgentId,
          newValue: targetAgent.name,
          metadata: {
            newAgentId: targetAgent.id,
            reassignedBy: actor.name,
          },
        },
        tx
      );

      return updated;
    });

    return result;
  }

  /**
   * Update ticket priority with SLA recalculation (considers active elapsed working time).
   */
  public async updatePriority(
    idOrNumber: string,
    newPriority: Priority,
    reason?: string,
    actor?: { id: string; name: string; role: string }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({
      where,
      include: { slaPauses: true },
    });

    if (!ticket) {
      const error: any = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }

    if (ticket.priority === newPriority) {
      return ticket;
    }

    // Recalculate SLA targets
    const holidays = await prisma.holiday.findMany();
    slaService.updateHolidays(holidays);

    const now = new Date();
    const { responseDueAt, resolutionDueAt } = slaService.recalculateOnPriorityChange(ticket, newPriority, now);

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          priority: newPriority,
          responseDueAt,
          resolutionDueAt,
          updatedAt: now,
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          customer: true,
        },
      });

      await auditService.logEvent(
        {
          ticketId: ticket.id,
          actorId: actor?.id || null,
          actorName: actor?.name || 'Support Agent',
          actorRole: actor?.role || 'AGENT',
          eventType: 'PRIORITY_CHANGED',
          oldValue: ticket.priority,
          newValue: newPriority,
          metadata: {
            reason: reason || 'Priority changed by agent',
            recalculatedResponseDueAt: responseDueAt,
            recalculatedResolutionDueAt: resolutionDueAt,
          },
        },
        tx
      );

      return res;
    });

    return updated;
  }

  /**
   * Update ticket status with lifecycle validation, SLA pause/resume, and resolution summary.
   */
  public async updateStatus(
    idOrNumber: string,
    newStatus: Status,
    options: {
      resolutionSummary?: string;
      reason?: string;
      actor?: { id: string; name: string; role: string };
    } = {}
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({
      where,
      include: {
        slaPauses: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      const error: any = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }

    // 1. No-op if status is unchanged
    if (ticket.status === newStatus) {
      return ticket;
    }

    // 2. Terminal status protection
    if (ticket.status === Status.CLOSED) {
      const error: any = new Error('Cannot change status: Ticket is permanently CLOSED.');
      error.statusCode = 400;
      throw error;
    }

    // 3. State machine validation
    if (!ticketLifecycleService.isTransitionAllowed(ticket.status, newStatus)) {
      const error: any = new Error(
        `Invalid status transition from ${ticket.status} to ${newStatus}. Allowed next states: ${(
          ticketLifecycleService.isTransitionAllowed
        )}`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Resolution summary mandatory when marking RESOLVED
    if (newStatus === Status.RESOLVED) {
      if (!options.resolutionSummary || options.resolutionSummary.trim().length < 5) {
        const error: any = new Error('A resolutionSummary of at least 5 characters is required when resolving a ticket.');
        error.statusCode = 400;
        throw error;
      }
    }

    const now = new Date();
    const holidays = await prisma.holiday.findMany();
    const businessHours = new BusinessHoursService(holidays);

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.TicketUpdateInput = {
        status: newStatus,
        updatedAt: now,
      };

      // Case A: Entering WAITING_FOR_CUSTOMER -> PAUSE SLA CLOCK
      if (newStatus === Status.WAITING_FOR_CUSTOMER) {
        updateData.waitingSince = now;
        await tx.sLAPause.create({
          data: {
            ticketId: ticket.id,
            startedAt: now,
          },
        });
      }

      // Case B: Leaving WAITING_FOR_CUSTOMER -> RESUME SLA CLOCK AND EXTEND DEADLINES
      if (ticket.status === Status.WAITING_FOR_CUSTOMER && newStatus !== Status.WAITING_FOR_CUSTOMER) {
        const activePause = ticket.slaPauses.find((p) => p.endedAt === null);
        if (activePause) {
          const pausedWorkingMinutes = businessHours.calculateWorkingMinutesBetween(activePause.startedAt, now);

          await tx.sLAPause.update({
            where: { id: activePause.id },
            data: {
              endedAt: now,
              durationWorkingMinutes: pausedWorkingMinutes,
            },
          });

          // Extend SLA deadlines by paused working minutes
          const extended = slaService.extendDeadlinesForPause(ticket, pausedWorkingMinutes);
          updateData.responseDueAt = extended.responseDueAt;
          updateData.resolutionDueAt = extended.resolutionDueAt;
        }
        updateData.waitingSince = null;
      }

      // Case C: Transitioning to RESOLVED
      if (newStatus === Status.RESOLVED) {
        updateData.resolvedAt = now;
      }

      // Case D: Transitioning to CLOSED
      if (newStatus === Status.CLOSED) {
        updateData.closedAt = now;
        if (!ticket.resolvedAt) {
          updateData.resolvedAt = now;
        }
      }

      const res = await tx.ticket.update({
        where: { id: ticket.id },
        data: updateData,
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          customer: true,
        },
      });

      // Audit log event
      await auditService.logEvent(
        {
          ticketId: ticket.id,
          actorId: options.actor?.id || null,
          actorName: options.actor?.name || 'Support Staff',
          actorRole: options.actor?.role || 'AGENT',
          eventType:
            newStatus === Status.RESOLVED
              ? 'TICKET_RESOLVED'
              : newStatus === Status.CLOSED
              ? 'TICKET_CLOSED'
              : newStatus === Status.WAITING_FOR_CUSTOMER
              ? 'SLA_PAUSED'
              : ticket.status === Status.WAITING_FOR_CUSTOMER
              ? 'SLA_RESUMED'
              : 'STATUS_CHANGED',
          oldValue: ticket.status,
          newValue: newStatus,
          metadata: {
            resolutionSummary: options.resolutionSummary || null,
            reason: options.reason || null,
          },
        },
        tx
      );

      return res;
    });

    return updated;
  }

  /**
   * Reopen a RESOLVED ticket (Allowed strictly within 5 working days of resolution).
   */
  public async reopenTicket(
    idOrNumber: string,
    reason: string,
    actor: { id: string; name: string; role: string }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({ where });

    if (!ticket) {
      const error: any = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const eligibility = await ticketLifecycleService.checkReopeningEligibility(ticket, now);

    if (!eligibility.eligible) {
      const error: any = new Error(eligibility.reason);
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: Status.IN_PROGRESS,
          reopenedAt: now,
          reopenCount: { increment: 1 },
          resolvedAt: null, // Clear resolution timestamp
          updatedAt: now,
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          customer: true,
        },
      });

      await auditService.logEvent(
        {
          ticketId: ticket.id,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          eventType: 'TICKET_REOPENED',
          oldValue: Status.RESOLVED,
          newValue: Status.IN_PROGRESS,
          metadata: {
            reason,
            reopenCount: ticket.reopenCount + 1,
            reopenedBy: actor.name,
          },
        },
        tx
      );

      return updated;
    });

    return result;
  }

  /**
   * Add a public message to a ticket (Visible to customers).
   * If added by staff and firstResponseAt is null, stamps firstResponseAt.
   * If added by customer and status is WAITING_FOR_CUSTOMER, resumes SLA clock and transitions to IN_PROGRESS.
   */
  public async addPublicReply(
    idOrNumber: string,
    content: string,
    sender: {
      id?: string | null;
      name: string;
      email?: string | null;
      role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
    }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({
      where,
      include: {
        slaPauses: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      const error: any = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }

    const isStaff = sender.role === 'ADMIN' || sender.role === 'AGENT';
    const now = new Date();
    const holidays = await prisma.holiday.findMany();
    const businessHours = new BusinessHoursService(holidays);

    const message = await prisma.$transaction(async (tx) => {
      // 1. Create public message
      const createdMessage = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: sender.id || null,
          senderType: isStaff ? SenderType.AGENT : SenderType.CUSTOMER,
          senderName: sender.name,
          senderEmail: sender.email || null,
          content: content.trim(),
          type: MessageType.PUBLIC_REPLY,
          createdAt: now,
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
        },
      });

      const ticketUpdate: Prisma.TicketUpdateInput = { updatedAt: now };

      // 2. If staff replied and firstResponseAt is not set, set it!
      if (isStaff && !ticket.firstResponseAt) {
        ticketUpdate.firstResponseAt = now;
      }

      // 3. If customer replied while ticket was WAITING_FOR_CUSTOMER, resume SLA timer and move to IN_PROGRESS
      if (!isStaff && ticket.status === Status.WAITING_FOR_CUSTOMER) {
        const activePause = ticket.slaPauses.find((p) => p.endedAt === null);
        if (activePause) {
          const pausedWorkingMinutes = businessHours.calculateWorkingMinutesBetween(activePause.startedAt, now);

          await tx.sLAPause.update({
            where: { id: activePause.id },
            data: {
              endedAt: now,
              durationWorkingMinutes: pausedWorkingMinutes,
            },
          });

          // Extend SLA deadlines
          const extended = slaService.extendDeadlinesForPause(ticket, pausedWorkingMinutes);
          ticketUpdate.responseDueAt = extended.responseDueAt;
          ticketUpdate.resolutionDueAt = extended.resolutionDueAt;
        }

        ticketUpdate.status = Status.IN_PROGRESS;
        ticketUpdate.waitingSince = null;

        await auditService.logEvent(
          {
            ticketId: ticket.id,
            actorId: null,
            actorName: sender.name,
            actorRole: 'CUSTOMER',
            eventType: 'SLA_RESUMED',
            oldValue: Status.WAITING_FOR_CUSTOMER,
            newValue: Status.IN_PROGRESS,
            metadata: {
              reason: 'Customer replied to ticket; SLA timer resumed',
            },
          },
          tx
        );
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: ticketUpdate,
      });

      // Audit log entry for message
      await auditService.logEvent(
        {
          ticketId: ticket.id,
          actorId: sender.id || null,
          actorName: sender.name,
          actorRole: sender.role,
          eventType: 'PUBLIC_REPLY_ADDED',
          newValue: 'Public reply added',
          metadata: {
            messageId: createdMessage.id,
            isStaff,
          },
        },
        tx
      );

      return createdMessage;
    });

    return message;
  }

  /**
   * Add an internal note to a ticket (Incident INC-0304).
   * Stored in dedicated internal_notes table. Strictly invisible to customers!
   */
  public async addInternalNote(
    idOrNumber: string,
    content: string,
    author: { id: string; name: string; role: string }
  ) {
    const isNum = !isNaN(parseInt(idOrNumber)) && /^\d+$/.test(idOrNumber);
    const where = isNum ? { ticketNumber: parseInt(idOrNumber) } : { id: idOrNumber };

    const ticket = await prisma.ticket.findUnique({ where });

    if (!ticket) {
      const error: any = new Error('Ticket not found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    const note = await prisma.$transaction(async (tx) => {
      const createdNote = await tx.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: author.id,
          content: content.trim(),
          createdAt: now,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: now },
      });

      // Append-only audit log
      await auditService.logEvent(
        {
          ticketId: ticket.id,
          actorId: author.id,
          actorName: author.name,
          actorRole: author.role,
          eventType: 'INTERNAL_NOTE_ADDED',
          newValue: 'Internal note added by support staff',
          metadata: { noteId: createdNote.id },
        },
        tx
      );

      return createdNote;
    });

    return note;
  }

  /**
   * Customer-Safe Serializer (Incident INC-0304):
   * Strips internal notes, internal metadata, and private audit details.
   */
  public serializePublicTicket(ticket: any) {
    if (!ticket) return null;
    const { internalNotes, auditLogs, assignments, slaPauses, ...publicData } = ticket;
    return publicData;
  }
}

export default new TicketService();

