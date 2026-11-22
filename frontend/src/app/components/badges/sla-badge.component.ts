import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SLAMetrics } from '../../models/ticket.model';

@Component({
  selector: 'app-sla-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-1.5">
      <!-- Overdue State -->
      <span
        *ngIf="sla?.isOverdue"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        SLA Breached
      </span>

      <!-- Paused State -->
      <span
        *ngIf="sla?.status === 'PAUSED'"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        SLA Paused
      </span>

      <!-- Off-Hours / Suppressed State -->
      <span
        *ngIf="sla?.status === 'SUPPRESSED_NON_WORKING_TIME'"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        title="SLA calculation is paused outside working hours (09:30-18:30 Mon-Fri)"
      >
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        Off-Hours
      </span>

      <!-- Active On-Track State -->
      <span
        *ngIf="sla && !sla.isOverdue && sla.status === 'ON_TRACK'"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
      >
        <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ formatRemainingTime() }}
      </span>

      <!-- Completed -->
      <span
        *ngIf="sla?.status === 'COMPLETED'"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200"
      >
        Fulfilled
      </span>
    </div>
  `,
})
export class SLABadgeComponent {
  @Input() sla?: SLAMetrics;

  formatRemainingTime(): string {
    if (!this.sla) return '';

    // Prioritize response remaining if first response is still pending
    const mins = this.sla.remainingResponseMinutes > 0 ? this.sla.remainingResponseMinutes : this.sla.remainingResolutionMinutes;

    if (mins <= 0) return 'Due Now';
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return `${hours}h ${remMins}m left`;
    }
    return `${remMins}m left`;
  }
}
