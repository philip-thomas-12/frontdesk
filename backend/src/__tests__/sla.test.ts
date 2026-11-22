import { BusinessHoursService } from '../services/businessHours.service';
import { SLAService } from '../services/sla.service';
import { fromISTComponents, formatToIST } from '../utils/date.util';
import { Priority, Status, Ticket, SLAPause } from '@prisma/client';

describe('SLA Engine & Business Hours Verification', () => {
  const testHolidays = [
    { date: new Date('2026-11-27'), name: 'Festival Holiday (Friday)' },
    { date: new Date('2026-01-26'), name: 'Republic Day' },
  ];

  const businessHours = new BusinessHoursService(testHolidays);
  const slaService = new SLAService(testHolidays as any);

  describe('1. Business Hours & Boundary Checks (Asia/Kolkata)', () => {
    it('correctly identifies working vs non-working minutes', () => {
      // Monday Nov 23, 2026
      const mon929 = fromISTComponents(2026, 10, 23, 9, 29, 59);
      const mon930 = fromISTComponents(2026, 10, 23, 9, 30, 0);
      const mon1400 = fromISTComponents(2026, 10, 23, 14, 0, 0);
      const mon1829 = fromISTComponents(2026, 10, 23, 18, 29, 59);
      const mon1830 = fromISTComponents(2026, 10, 23, 18, 30, 0);
      const sat1100 = fromISTComponents(2026, 10, 28, 11, 0, 0);
      const hol1100 = fromISTComponents(2026, 10, 27, 11, 0, 0); // Friday Nov 27 is configured holiday

      expect(businessHours.isWorkingTime(mon929)).toBe(false);
      expect(businessHours.isWorkingTime(mon930)).toBe(true);
      expect(businessHours.isWorkingTime(mon1400)).toBe(true);
      expect(businessHours.isWorkingTime(mon1829)).toBe(true);
      expect(businessHours.isWorkingTime(mon1830)).toBe(false);
      expect(businessHours.isWorkingTime(sat1100)).toBe(false); // Saturday excluded
      expect(businessHours.isWorkingTime(hol1100)).toBe(false); // Holiday excluded
    });
  });

  describe('2. Ticket Created Monday at 10:00 AM', () => {
    const mon10am = fromISTComponents(2026, 10, 23, 10, 0, 0);

    it('calculates Urgent: 2h response, same-day 18:30 resolution', () => {
      const deadlines = slaService.calculateInitialDeadlines(Priority.URGENT, mon10am);
      expect(formatToIST(deadlines.responseDueAt)).toBe('23 Nov 2026, 12:00:00 pm IST');
      expect(formatToIST(deadlines.resolutionDueAt)).toBe('23 Nov 2026, 06:30:00 pm IST');
    });

    it('calculates Medium: 4.5h response, 3 working days (27h) resolution', () => {
      const deadlines = slaService.calculateInitialDeadlines(Priority.MEDIUM, mon10am);
      expect(formatToIST(deadlines.responseDueAt)).toBe('23 Nov 2026, 02:30:00 pm IST');
      // 3 working days = Thursday 10:00 AM
      expect(formatToIST(deadlines.resolutionDueAt)).toBe('26 Nov 2026, 10:00:00 am IST');
    });

    it('calculates Low: 9h (1 day) response, 5 working days (1 week) resolution skipping holiday & weekend', () => {
      const deadlines = slaService.calculateInitialDeadlines(Priority.LOW, mon10am);
      // 9 working hours: Mon 10:00 to 18:30 is 8.5h. Remaining 0.5h rolls to Tue 10:00 AM
      expect(formatToIST(deadlines.responseDueAt)).toBe('24 Nov 2026, 10:00:00 am IST');
      // 5 working days: Mon -> Tue -> Wed -> Thu -> [Fri holiday skipped] -> [Sat/Sun skipped] -> Mon Nov 30 (Day 4) -> Tue Dec 01 10:00 AM (Day 5)
      expect(formatToIST(deadlines.resolutionDueAt)).toBe('01 Dec 2026, 10:00:00 am IST');
    });
  });

  describe('3. Ticket Created Friday at 6:00 PM (Crossing Weekend)', () => {
    // Friday Nov 20, 2026 at 18:00 (30 min before shift ends)
    const fri6pm = fromISTComponents(2026, 10, 20, 18, 0, 0);

    it('rolls 90 minutes of 2h Urgent response across weekend to Monday 11:00 AM', () => {
      const deadlines = slaService.calculateInitialDeadlines(Priority.URGENT, fri6pm);
      expect(formatToIST(deadlines.responseDueAt)).toBe('23 Nov 2026, 11:00:00 am IST');
      // Urgent resolution is same working day (Friday 18:30)
      expect(formatToIST(deadlines.resolutionDueAt)).toBe('20 Nov 2026, 06:30:00 pm IST');
    });
  });

  describe('4. SLA Pause & Resume Extensions', () => {
    it('extends deadlines by exact paused working minutes when resumed', () => {
      const ticket: any = {
        firstResponseAt: null,
        responseDueAt: fromISTComponents(2026, 10, 23, 14, 0, 0),
        resolvedAt: null,
        resolutionDueAt: fromISTComponents(2026, 10, 25, 18, 30, 0),
      };

      // Paused for 60 working minutes
      const extended = slaService.extendDeadlinesForPause(ticket, 60);
      expect(formatToIST(extended.responseDueAt)).toBe('23 Nov 2026, 03:00:00 pm IST');
    });
  });

  describe('5. Overdue Status Suppression', () => {
    it('suppresses overdue status outside business hours and on weekends', () => {
      const ticket: any = {
        status: Status.IN_PROGRESS,
        firstResponseAt: null,
        responseDueAt: fromISTComponents(2026, 10, 20, 12, 0, 0),
        resolvedAt: null,
        resolutionDueAt: fromISTComponents(2026, 10, 20, 18, 30, 0),
      };

      // Saturday check
      const satNoon = fromISTComponents(2026, 10, 21, 12, 0, 0);
      const evalSat = slaService.evaluateOverdueStatus(ticket, satNoon);
      expect(evalSat.status).toBe('SUPPRESSED_NON_WORKING_TIME');
      expect(evalSat.isOverdue).toBe(false);

      // Active working shift check (Monday 14:00)
      const monAfternoon = fromISTComponents(2026, 10, 23, 14, 0, 0);
      const evalMon = slaService.evaluateOverdueStatus(ticket, monAfternoon);
      expect(evalMon.status).toBe('OVERDUE');
      expect(evalMon.isOverdue).toBe(true);
    });
  });
});

