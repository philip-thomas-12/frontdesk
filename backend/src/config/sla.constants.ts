export const SLA_CONSTANTS = {
  TIMEZONE: 'Asia/Kolkata',
  IST_OFFSET_MINUTES: 330, // UTC +05:30
  
  // Business working hours: 09:30 AM to 06:30 PM
  WORK_START_HOUR: 9,
  WORK_START_MINUTE: 30, // 09:30 AM = 570 minutes from midnight
  WORK_END_HOUR: 18,
  WORK_END_MINUTE: 30,   // 06:30 PM = 1110 minutes from midnight
  
  // Working minutes per day: 9 hours * 60 = 540 minutes
  WORK_DAY_MINUTES: 540,
  
  // Priority SLA targets in working minutes:
  // URGENT: First response 2 working hours (120m), Resolution same working day (by 18:30)
  // MEDIUM: First response half a working day (4.5 hours = 270m), Resolution 3 working days (1620m)
  // LOW: First response 1 working day (9 hours = 540m), Resolution 1 working week (5 working days = 2700m)
  TARGETS: {
    URGENT: {
      firstResponseMinutes: 2 * 60,       // 120 minutes (2 business hours)
      resolutionMinutes: 9 * 60,          // 540 minutes (same working day)
      resolutionSameDay: true,
    },
    MEDIUM: {
      firstResponseMinutes: 4.5 * 60,     // 270 minutes (4.5 business hours)
      resolutionMinutes: 3 * 9 * 60,      // 1620 minutes (3 business days)
      resolutionSameDay: false,
    },
    LOW: {
      firstResponseMinutes: 9 * 60,       // 540 minutes (1 business day)
      resolutionMinutes: 5 * 9 * 60,      // 2700 minutes (5 business days)
      resolutionSameDay: false,
    },
  },
  
  // Auto closure threshold: 5 working days (2,700 working minutes)
  AUTO_CLOSE_WORKING_DAYS: 5,
  AUTO_CLOSE_WORKING_MINUTES: 5 * 540, // 2700 minutes
  
  // Reopening window: 5 working days (2,700 working minutes)
  REOPENING_WINDOW_WORKING_DAYS: 5,
  REOPENING_WINDOW_WORKING_MINUTES: 5 * 540,
};

