import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Priority } from '../../models/ticket.model';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      [ngClass]="getBadgeClass()"
    >
      <svg *ngIf="priority === 'URGENT'" class="w-3.5 h-3.5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ getLabel() }}
    </span>
  `,
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: Priority | string;

  getLabel(): string {
    switch (this.priority) {
      case 'URGENT':
        return 'Urgent (2h SLA)';
      case 'MEDIUM':
        return 'Medium (4.5h SLA)';
      case 'LOW':
        return 'Low (9h SLA)';
      default:
        return this.priority;
    }
  }

  getBadgeClass(): string {
    switch (this.priority) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }
}
