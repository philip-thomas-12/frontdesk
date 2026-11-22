import ticketLifecycleService from '../services/ticketLifecycle.service';
import { config } from '../config/env';

let intervalHandle: NodeJS.Timeout | null = null;

export function startAutoCloseJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  const intervalMs = config.autoCloseIntervalMs;
  console.log(`⏱️ Auto-close background job scheduled (every ${intervalMs / 1000 / 60} minutes)`);

  intervalHandle = setInterval(async () => {
    try {
      const result = await ticketLifecycleService.processAutoClosure();
      if (result.closedCount > 0) {
        console.log(`🤖 Auto-close sweep finished: Closed ${result.closedCount} dormant tickets.`);
      }
    } catch (err) {
      console.error('❌ Error executing auto-close sweep:', err);
    }
  }, intervalMs);

  if (intervalHandle.unref) {
    intervalHandle.unref();
  }
}

export function stopAutoCloseJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('⏱️ Auto-close background job stopped.');
  }
}

