import { Priority, Ticket, SLAPause, Holiday } from '@prisma/client';
import { BusinessHoursService } from './businessHours.service';
import { SLA_CONSTANTS } from '../config/sla.constants';

export interface SLADeadlines {
  responseDueAt: Date;
  resolutionDueAt: Date;
}

export interface OverdueStatus {
  isOverdue: boolean;
  isResponseOverdue: boolean;
  isResolutionOverdue: boolean;
  status: 'ON_TRACK' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'SUPPRESSED_NON_WORKING_TIME';
  reason?: string;
}

export class SLAService {
  private businessHours: BusinessHoursService;

  constructor(holidays: Holiday[] = []) {
    this.businessHours = new BusinessHoursService(holidays);
  }

  public updateHolidays(holidays: Holiday[]) {
    this.businessHours.setHolidays(holidays);
  }

  /**
   * Calculate initial SLA deadlines for a newly created ticket based on priority.
   */
  public calculateInitialDeadlines(priority: Priority, createdAt: Date = new Date()): SLADeadlines {
    const config = SLA_CONSTANTS.TARGETS[priority] || SLA_CONSTANTS.TARGETS.MEDIUM;

    // Response deadline
    const responseDueAt = this.businessHours.addWorkingMinutes(createdAt, config.firstResponseMinutes);

    // Resolution deadline
    let resolutionDueAt: Date;
    if (config.resolutionSameDay) {
      // Urgent: same working day target (18:30 IST of the applicable working day)
      resolutionDueAt = this.businessHours.getEndOfApplicableWorkingDay(createdAt);
    } else {
      resolutionDueAt = this.businessHours.addWorkingMinutes(createdAt, config.resolutionMinutes);
    }

    return { responseDueAt, resolutionDueAt };
  }

  /**
   * Recalculate SLA targets when ticket priority changes during its lifecycle.
   * Considers elapsed active working time and time spent waiting.
   */
  public recalculateOnPriorityChange(
    ticket: Ticket & { slaPauses?: SLAPause[] },
    newPriority: Priority,
    changeTime: Date = new Date()
  ): SLADeadlines {
    const config = SLA_CONSTANTS.TARGETS[newPriority] || SLA_CONSTANTS.TARGETS.MEDIUM;

    // Calculate total net working minutes already elapsed since creation
    const totalWorkingMinutesSinceCreation = this.businessHours.calculateWorkingMinutesBetween(
      ticket.createdAt,
      changeTime
    );

    // Calculate total paused working minutes
    const pausedWorkingMinutes = (ticket.slaPauses || []).reduce((acc, p) => {
      const end = p.endedAt || changeTime;
      return acc + this.businessHours.calculateWorkingMinutesBetween(p.startedAt, end);
    }, 0);

    const netActiveWorkingMinutesElapsed = Math.max(0, totalWorkingMinutesSinceCreation - pausedWorkingMinutes);

    // Calculate remaining response minutes under the new policy
    let responseDueAt: Date;
    if (ticket.firstResponseAt) {
      // First response was already fulfilled; retain existing or completed timestamp
      responseDueAt = ticket.responseDueAt || ticket.firstResponseAt;
    } else {
      const remainingResponseMinutes = config.firstResponseMinutes - netActiveWorkingMinutesElapsed;
      if (remainingResponseMinutes <= 0) {
        // Breached under the new priority target: set to changeTime
        responseDueAt = changeTime;
      } else {
        responseDueAt = this.businessHours.addWorkingMinutes(changeTime, remainingResponseMinutes);
      }
    }

    // Calculate remaining resolution minutes under the new policy
    let resolutionDueAt: Date;
    if (config.resolutionSameDay) {
      // Urgent: Snap to end of current applicable working day
      resolutionDueAt = this.businessHours.getEndOfApplicableWorkingDay(changeTime);
    } else {
      const remainingResolutionMinutes = config.resolutionMinutes - netActiveWorkingMinutesElapsed;
      if (remainingResolutionMinutes <= 0) {
        resolutionDueAt = changeTime;
      } else {
        resolutionDueAt = this.businessHours.addWorkingMinutes(changeTime, remainingResolutionMinutes);
      }
    }

    return { responseDueAt, resolutionDueAt };
  }

  /**
   * Extend deadlines when resuming from WAITING_FOR_CUSTOMER.
   */
  public extendDeadlinesForPause(
    ticket: Ticket,
    pausedWorkingMinutes: number
  ): SLADeadlines {
    if (pausedWorkingMinutes <= 0) {
      return {
        responseDueAt: ticket.responseDueAt || new Date(),
        resolutionDueAt: ticket.resolutionDueAt || new Date(),
      };
    }

    let newResponseDueAt = ticket.responseDueAt;
    if (ticket.responseDueAt && !ticket.firstResponseAt) {
      newResponseDueAt = this.businessHours.addWorkingMinutes(ticket.responseDueAt, pausedWorkingMinutes);
    }

    let newResolutionDueAt = ticket.resolutionDueAt;
    if (ticket.resolutionDueAt && !ticket.resolvedAt) {
      newResolutionDueAt = this.businessHours.addWorkingMinutes(ticket.resolutionDueAt, pausedWorkingMinutes);
    }

    return {
      responseDueAt: newResponseDueAt || new Date(),
      resolutionDueAt: newResolutionDueAt || new Date(),
    };
  }

  /**
   * Evaluate whether a ticket is currently overdue.
   * IMPORTANT: Suppressed outside business hours, weekends, and holidays!
   */
  public evaluateOverdueStatus(
    ticket: {
      status: string;
      firstResponseAt: Date | null;
      responseDueAt: Date | null;
      resolvedAt: Date | null;
      resolutionDueAt: Date | null;
    },
    currentTime: Date = new Date()
  ): OverdueStatus {
    // 1. If resolved or closed, ticket SLA is completed
    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return {
        isOverdue: false,
        isResponseOverdue: false,
        isResolutionOverdue: false,
        status: 'COMPLETED',
      };
    }

    // 2. If waiting for customer, SLA timers are paused
    if (ticket.status === 'WAITING_FOR_CUSTOMER') {
      return {
        isOverdue: false,
        isResponseOverdue: false,
        isResolutionOverdue: false,
        status: 'PAUSED',
        reason: 'SLA is paused while waiting for customer response.',
      };
    }

    // 3. If currently outside business hours, on a weekend or holiday, suppress overdue status!
    const isWorkingShift = this.businessHours.isWorkingTime(currentTime);
    if (!isWorkingShift) {
      return {
        isOverdue: false,
        isResponseOverdue: false,
        isResolutionOverdue: false,
        status: 'SUPPRESSED_NON_WORKING_TIME',
        reason: 'Overdue status is suppressed during non-working hours, weekends, and holidays.',
      };
    }

    // 4. Evaluate response and resolution deadlines
    const isResponseOverdue = Boolean(
      !ticket.firstResponseAt &&
      ticket.responseDueAt &&
      currentTime > new Date(ticket.responseDueAt)
    );

    const isResolutionOverdue = Boolean(
      !ticket.resolvedAt &&
      ticket.resolutionDueAt &&
      currentTime > new Date(ticket.resolutionDueAt)
    );

    const isOverdue = isResponseOverdue || isResolutionOverdue;

    return {
      isOverdue,
      isResponseOverdue,
      isResolutionOverdue,
      status: isOverdue ? 'OVERDUE' : 'ON_TRACK',
    };
  }

  /**
   * Calculate remaining working minutes until deadline.
   * Returns positive integer if time remains, 0 if breached or due.
   */
  public calculateRemainingWorkingMinutes(dueAt: Date | null | undefined, currentTime: Date = new Date()): number {
    if (!dueAt) return 0;
    const due = new Date(dueAt);
    if (currentTime >= due) return 0;
    return this.businessHours.calculateWorkingMinutesBetween(currentTime, due);
  }
}

export default new SLAService();

