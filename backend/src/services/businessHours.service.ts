import { SLA_CONSTANTS } from '../config/sla.constants';
import { toISTDate, fromISTComponents, toDateKey } from '../utils/date.util';

export interface HolidayInput {
  date: Date | string;
  name?: string;
}

export class BusinessHoursService {
  private holidaySet: Set<string>;

  constructor(holidays: HolidayInput[] = []) {
    this.holidaySet = this.buildHolidaySet(holidays);
  }

  public setHolidays(holidays: HolidayInput[]) {
    this.holidaySet = this.buildHolidaySet(holidays);
  }

  private buildHolidaySet(holidays: HolidayInput[] = []): Set<string> {
    const set = new Set<string>();
    for (const h of holidays) {
      if (!h) continue;
      const d = typeof h === 'string' ? h : h.date;
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        set.add(d);
      } else {
        const istD = toISTDate(d);
        set.add(toDateKey(istD));
      }
    }
    return set;
  }

  /**
   * Check if a given IST date is a working day (Mon-Fri and not a festival/company holiday)
   */
  public isWorkingDay(istDate: Date): boolean {
    const dayOfWeek = istDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    const key = toDateKey(istDate);
    return !this.holidaySet.has(key);
  }

  /**
   * Check if a timestamp falls strictly within working hours (09:30 AM to 06:30 PM IST on working days)
   */
  public isWorkingTime(timestamp: Date | string | number): boolean {
    const istDate = toISTDate(timestamp);
    if (!this.isWorkingDay(istDate)) {
      return false;
    }

    const minuteOfDay = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
    const startMinutes = SLA_CONSTANTS.WORK_START_HOUR * 60 + SLA_CONSTANTS.WORK_START_MINUTE; // 570 (09:30)
    const endMinutes = SLA_CONSTANTS.WORK_END_HOUR * 60 + SLA_CONSTANTS.WORK_END_MINUTE;       // 1110 (18:30)

    return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
  }

  /**
   * Advance a timestamp to the next active working time instant.
   * If already inside working hours, returns the same timestamp.
   * If outside, advances to 09:30 AM of the next available working day.
   */
  public getNextWorkingTime(timestamp: Date | string | number): Date {
    const istDate = toISTDate(timestamp);
    const year = istDate.getUTCFullYear();
    const month = istDate.getUTCMonth();
    const day = istDate.getUTCDate();
    const minuteOfDay = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

    const startMinutes = SLA_CONSTANTS.WORK_START_HOUR * 60 + SLA_CONSTANTS.WORK_START_MINUTE;
    const endMinutes = SLA_CONSTANTS.WORK_END_HOUR * 60 + SLA_CONSTANTS.WORK_END_MINUTE;

    if (this.isWorkingDay(istDate)) {
      if (minuteOfDay < startMinutes) {
        return fromISTComponents(year, month, day, SLA_CONSTANTS.WORK_START_HOUR, SLA_CONSTANTS.WORK_START_MINUTE, 0, 0);
      }
      if (minuteOfDay < endMinutes) {
        return new Date(timestamp);
      }
    }

    // Move to 09:30 AM of next working day
    let checkMs = Date.UTC(year, month, day, SLA_CONSTANTS.WORK_START_HOUR, SLA_CONSTANTS.WORK_START_MINUTE, 0, 0);
    while (true) {
      checkMs += 24 * 60 * 60 * 1000;
      const nextIst = new Date(checkMs);
      if (this.isWorkingDay(nextIst)) {
        return new Date(checkMs - SLA_CONSTANTS.IST_OFFSET_MINUTES * 60 * 1000);
      }
    }
  }

  /**
   * Get the closing time (18:30 IST) of the applicable working day for a given timestamp.
   * If created after hours or on a weekend/holiday, applies to the next working day's 18:30.
   */
  public getEndOfApplicableWorkingDay(timestamp: Date | string | number): Date {
    const nextWorking = this.getNextWorkingTime(timestamp);
    const istDate = toISTDate(nextWorking);
    return fromISTComponents(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      SLA_CONSTANTS.WORK_END_HOUR,
      SLA_CONSTANTS.WORK_END_MINUTE,
      0,
      0
    );
  }

  /**
   * Add working minutes to a timestamp, skipping non-working hours, weekends, and holidays.
   */
  public addWorkingMinutes(startTimestamp: Date | string | number, minutesToAdd: number): Date {
    if (minutesToAdd <= 0) {
      return this.getNextWorkingTime(startTimestamp);
    }

    let current = this.getNextWorkingTime(startTimestamp);
    let remainingMinutes = minutesToAdd;
    const endMinutesLimit = SLA_CONSTANTS.WORK_END_HOUR * 60 + SLA_CONSTANTS.WORK_END_MINUTE;

    while (remainingMinutes > 0) {
      const istDate = toISTDate(current);
      const minuteOfDay = istDate.getUTCHours() * 60 + istDate.getUTCMinutes() + istDate.getUTCSeconds() / 60;
      const workingMinutesLeftToday = endMinutesLimit - minuteOfDay;

      if (remainingMinutes <= workingMinutesLeftToday) {
        return new Date(current.getTime() + remainingMinutes * 60 * 1000);
      }

      remainingMinutes -= workingMinutesLeftToday;

      // Advance to 09:30 AM of next working day
      let checkMs = Date.UTC(
        istDate.getUTCFullYear(),
        istDate.getUTCMonth(),
        istDate.getUTCDate(),
        SLA_CONSTANTS.WORK_START_HOUR,
        SLA_CONSTANTS.WORK_START_MINUTE,
        0,
        0
      );

      while (true) {
        checkMs += 24 * 60 * 60 * 1000;
        const nextIst = new Date(checkMs);
        if (this.isWorkingDay(nextIst)) {
          current = new Date(checkMs - SLA_CONSTANTS.IST_OFFSET_MINUTES * 60 * 1000);
          break;
        }
      }
    }

    return current;
  }

  /**
   * Calculate exact working minutes elapsed between two timestamps.
   */
  public calculateWorkingMinutesBetween(startTime: Date | string | number, endTime: Date | string | number): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) return 0;

    let current = this.getNextWorkingTime(start);
    if (current >= end) return 0;

    let totalWorkingMinutes = 0;
    const endMinutesLimit = SLA_CONSTANTS.WORK_END_HOUR * 60 + SLA_CONSTANTS.WORK_END_MINUTE;

    while (current < end) {
      const istDate = toISTDate(current);
      const minuteOfDay = istDate.getUTCHours() * 60 + istDate.getUTCMinutes() + istDate.getUTCSeconds() / 60;
      const workingMinutesLeftToday = endMinutesLimit - minuteOfDay;

      const endOfShiftToday = fromISTComponents(
        istDate.getUTCFullYear(),
        istDate.getUTCMonth(),
        istDate.getUTCDate(),
        SLA_CONSTANTS.WORK_END_HOUR,
        SLA_CONSTANTS.WORK_END_MINUTE,
        0,
        0
      );

      if (end <= endOfShiftToday) {
        const endIst = toISTDate(end);
        const endMinuteOfDay = endIst.getUTCHours() * 60 + endIst.getUTCMinutes() + endIst.getUTCSeconds() / 60;
        const effectiveEndMinute = Math.max(
          SLA_CONSTANTS.WORK_START_HOUR * 60 + SLA_CONSTANTS.WORK_START_MINUTE,
          Math.min(endMinutesLimit, endMinuteOfDay)
        );
        totalWorkingMinutes += Math.max(0, effectiveEndMinute - minuteOfDay);
        break;
      } else {
        totalWorkingMinutes += workingMinutesLeftToday;

        let checkMs = Date.UTC(
          istDate.getUTCFullYear(),
          istDate.getUTCMonth(),
          istDate.getUTCDate(),
          SLA_CONSTANTS.WORK_START_HOUR,
          SLA_CONSTANTS.WORK_START_MINUTE,
          0,
          0
        );

        while (true) {
          checkMs += 24 * 60 * 60 * 1000;
          const nextIst = new Date(checkMs);
          if (this.isWorkingDay(nextIst)) {
            current = new Date(checkMs - SLA_CONSTANTS.IST_OFFSET_MINUTES * 60 * 1000);
            break;
          }
        }
      }
    }

    return Math.round(totalWorkingMinutes);
  }
}

