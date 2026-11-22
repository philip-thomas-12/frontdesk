import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Status } from '../../models/ticket.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
      [ngClass]="getBadgeClass()"
    >
      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getDotClass()"></span>
      {{ getLabel() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: Status | string;

  getLabel(): string {
    switch (this.status) {
      case 'OPEN':
        return 'Open';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'WAITING_FOR_CUSTOMER':
        return 'Waiting on Customer';
      case 'RESOLVED':
        return 'Resolved';
      case 'CLOSED':
        return 'Closed';
      default:
        return this.status;
    }
  }

  getBadgeClass(): string {
    switch (this.status) {
      case 'OPEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getDotClass(): string {
    switch (this.status) {
      case 'OPEN':
        return 'bg-blue-500 animate-pulse';
      case 'IN_PROGRESS':
        return 'bg-indigo-500';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-amber-500';
      case 'RESOLVED':
        return 'bg-emerald-500';
      case 'CLOSED':
        return 'bg-slate-400';
      default:
        return 'bg-gray-400';
    }
  }
}

