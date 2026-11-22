import { SLA_CONSTANTS } from '../config/sla.constants';

const IST_OFFSET_MS = SLA_CONSTANTS.IST_OFFSET_MINUTES * 60 * 1000;

/**
 * Convert UTC timestamp to IST Date components
 */
export function toISTDate(utcDate: Date | string | number): Date {
  const d = new Date(utcDate);
  return new Date(d.getTime() + IST_OFFSET_MS);
}

/**
 * Convert IST Date components back to a standard UTC Date
 */
export function fromISTComponents(
  year: number,
  month: number, // 0-indexed (0 = Jan, 10 = Nov)
  day: number,
  hours: number,
  minutes: number,
  seconds: number = 0,
  ms: number = 0
): Date {
  const istUtcEpoch = Date.UTC(year, month, day, hours, minutes, seconds, ms);
  return new Date(istUtcEpoch - IST_OFFSET_MS);
}

/**
 * Format IST Date to 'YYYY-MM-DD' key
 */
export function toDateKey(date: Date): string {
  const istDate = toISTDate(date);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Human-readable IST string formatter
 */
export function formatToIST(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: SLA_CONSTANTS.TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

