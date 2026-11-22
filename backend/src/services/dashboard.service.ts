import { Status, Priority } from '@prisma/client';
import prisma from '../config/db';
import slaService from './sla.service';

export class DashboardService {
  /**
   * Calculate dashboard metrics for support agents and leads
   */
  public async getDashboardStats(agentId?: string) {
    const now = new Date();
    const holidays = await prisma.holiday.findMany();
    slaService.updateHolidays(holidays);

    // Run parallel counts for fast dashboard loading
    const [
      totalCount,
      openCount,
      inProgressCount,
      waitingCount,
      resolvedCount,
      closedCount,
      urgentCount,
      mediumCount,
      lowCount,
      myAssignedCount,
      activeTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: Status.OPEN } }),
      prisma.ticket.count({ where: { status: Status.IN_PROGRESS } }),
      prisma.ticket.count({ where: { status: Status.WAITING_FOR_CUSTOMER } }),
      prisma.ticket.count({ where: { status: Status.RESOLVED } }),
      prisma.ticket.count({ where: { status: Status.CLOSED } }),
      prisma.ticket.count({ where: { priority: Priority.URGENT, status: { notIn: [Status.RESOLVED, Status.CLOSED] } } }),
      prisma.ticket.count({ where: { priority: Priority.MEDIUM, status: { notIn: [Status.RESOLVED, Status.CLOSED] } } }),
      prisma.ticket.count({ where: { priority: Priority.LOW, status: { notIn: [Status.RESOLVED, Status.CLOSED] } } }),
      agentId ? prisma.ticket.count({ where: { assignedAgentId: agentId, status: { notIn: [Status.RESOLVED, Status.CLOSED] } } }) : 0,
      prisma.ticket.findMany({
        where: {
          status: { in: [Status.OPEN, Status.IN_PROGRESS] },
        },
        select: {
          id: true,
          status: true,
          firstResponseAt: true,
          responseDueAt: true,
          resolvedAt: true,
          resolutionDueAt: true,
        },
      }),
    ]);

    // Accurate overdue computation using SLA engine (respects working hours suppression)
    let overdueCount = 0;
    for (const t of activeTickets) {
      const evaluation = slaService.evaluateOverdueStatus(t, now);
      if (evaluation.isOverdue) {
        overdueCount++;
      }
    }

    return {
      summary: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        waitingForCustomer: waitingCount,
        resolved: resolvedCount,
        closed: closedCount,
        overdue: overdueCount,
        myAssigned: myAssignedCount,
      },
      priorityBreakdown: {
        urgent: urgentCount,
        medium: mediumCount,
        low: lowCount,
      },
      serverTime: now.toISOString(),
      businessHoursActive: slaService['businessHours'].isWorkingTime(now),
    };
  }
}

export default new DashboardService();

