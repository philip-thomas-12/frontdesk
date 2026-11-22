import { Status, Ticket, Holiday } from '@prisma/client';
import prisma from '../config/db';
import { BusinessHoursService } from './businessHours.service';
import { SLA_CONSTANTS } from '../config/sla.constants';
import auditService from './audit.service';

export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  OPEN: [Status.IN_PROGRESS, Status.CLOSED],
  IN_PROGRESS: [Status.WAITING_FOR_CUSTOMER, Status.RESOLVED, Status.CLOSED, Status.OPEN],
  WAITING_FOR_CUSTOMER: [Status.IN_PROGRESS, Status.RESOLVED, Status.CLOSED],
  RESOLVED: [Status.IN_PROGRESS, Status.CLOSED],
  CLOSED: [], // Terminal status: no transitions allowed out of CLOSED
};

export class TicketLifecycleService {
  /**
   * Validate if a status transition is permitted by the state machine
   */
  public isTransitionAllowed(fromStatus: Status, toStatus: Status): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Check whether a resolved ticket is eligible for reopening (within 5 working days)
   */
  public async checkReopeningEligibility(
    ticket: Ticket,
    now: Date = new Date()
  ): Promise<{ eligible: boolean; reason?: string; workingMinutesElapsed?: number }> {
    if (ticket.status !== Status.RESOLVED) {
      return {
        eligible: false,
        reason: `Only tickets with status RESOLVED can be reopened (Current status: ${ticket.status}).`,
      };
    }

    if (!ticket.resolvedAt) {
      return {
        eligible: false,
        reason: 'Ticket has no recorded resolution timestamp.',
      };
    }

    const holidays = await prisma.holiday.findMany();
    const businessHours = new BusinessHoursService(holidays);

    const workingMinutesElapsed = businessHours.calculateWorkingMinutesBetween(ticket.resolvedAt, now);

    if (workingMinutesElapsed > SLA_CONSTANTS.REOPENING_WINDOW_WORKING_MINUTES) {
      const daysElapsed = (workingMinutesElapsed / SLA_CONSTANTS.WORK_DAY_MINUTES).toFixed(1);
      return {
        eligible: false,
        workingMinutesElapsed,
        reason: `Reopening window expired. The 5-working-day post-resolution window has passed (${daysElapsed} working days elapsed). Please create a new support ticket instead.`,
      };
    }

    return {
      eligible: true,
      workingMinutesElapsed,
    };
  }

  /**
   * Execute auto-closure for tickets waiting on customer for >= 5 working days (2,700 working minutes)
   */
  public async processAutoClosure(options: { now?: Date; dryRun?: boolean } = {}) {
    const now = options.now ? new Date(options.now) : new Date();
    const dryRun = Boolean(options.dryRun);

    const holidays = await prisma.holiday.findMany();
    const businessHours = new BusinessHoursService(holidays);

    // Fetch tickets currently in WAITING_FOR_CUSTOMER
    const waitingTickets = await prisma.ticket.findMany({
      where: {
        status: Status.WAITING_FOR_CUSTOMER,
      },
      include: {
        slaPauses: {
          orderBy: { startedAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const closedTickets = [];

    for (const ticket of waitingTickets) {
      const activePause = ticket.slaPauses.find((p) => p.endedAt === null);
      const waitingSince = activePause?.startedAt || ticket.waitingSince || ticket.updatedAt;

      // Calculate working minutes in waiting state
      const workingMinutesWaiting = businessHours.calculateWorkingMinutesBetween(waitingSince, now);

      if (workingMinutesWaiting >= SLA_CONSTANTS.AUTO_CLOSE_WORKING_MINUTES) {
        if (!dryRun) {
          await prisma.$transaction(async (tx) => {
            // Lock and verify ticket is still WAITING_FOR_CUSTOMER
            const current = await tx.ticket.findUnique({
              where: { id: ticket.id },
              select: { id: true, status: true, ticketNumber: true },
            });

            if (!current || current.status !== Status.WAITING_FOR_CUSTOMER) {
              return;
            }

            // Close active pause
            if (activePause) {
              await tx.sLAPause.update({
                where: { id: activePause.id },
                data: {
                  endedAt: now,
                  durationWorkingMinutes: workingMinutesWaiting,
                },
              });
            }

            // Update ticket to CLOSED
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: Status.CLOSED,
                closedAt: now,
                resolvedAt: ticket.resolvedAt || now,
                updatedAt: now,
              },
            });

            // Append-only audit log
            await auditService.logEvent(
              {
                ticketId: ticket.id,
                actorId: null,
                actorName: 'System Automation',
                actorRole: 'SYSTEM',
                eventType: 'SYSTEM_AUTO_CLOSED',
                oldValue: Status.WAITING_FOR_CUSTOMER,
                newValue: Status.CLOSED,
                metadata: {
                  reason: 'Automatically closed after 5 working days without customer reply',
                  waitingSince,
                  closedAt: now,
                  workingMinutesWaiting,
                  thresholdWorkingMinutes: SLA_CONSTANTS.AUTO_CLOSE_WORKING_MINUTES,
                },
              },
              tx
            );
          });
        }

        closedTickets.push({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          waitingSince,
          workingMinutesWaiting,
        });
      }
    }

    return {
      processedCount: waitingTickets.length,
      closedCount: closedTickets.length,
      closedTickets,
    };
  }
}

export default new TicketLifecycleService();

