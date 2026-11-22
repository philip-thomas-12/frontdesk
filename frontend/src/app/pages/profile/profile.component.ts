import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { User, Ticket } from '../../models/ticket.model';
import { StatusBadgeComponent } from '../../components/badges/status-badge.component';
import { PriorityBadgeComponent } from '../../components/badges/priority-badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, PriorityBadgeComponent],
  template: `
    <div class="space-y-6 max-w-4xl mx-auto" *ngIf="auth.currentUser$ | async as user">
      <!-- Profile Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl overflow-hidden shadow-md">
            <img *ngIf="user.avatarUrl" [src]="user.avatarUrl" [alt]="user.name" class="w-full h-full object-cover" />
            <span *ngIf="!user.avatarUrl">{{ user.name.charAt(0) }}</span>
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900">{{ user.name }}</h1>
            <p class="text-xs text-slate-500">{{ user.email }}</p>
            <div class="mt-2 flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                {{ user.role === 'ADMIN' ? 'Support Lead (Admin)' : 'Support Agent' }}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active On Duty
              </span>
            </div>
          </div>
        </div>

        <button
          (click)="auth.logout()"
          class="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>

      <!-- Arvo Systems Support Operating Guidelines & SLA Policies Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>📋</span>
          <span>Arvo Systems Support Policy & SLAs</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">1. Working Hours & Timezone</h4>
            <p class="text-slate-600">
              Monday through Friday, <strong>09:30 AM to 06:30 PM (Asia/Kolkata)</strong>. Saturdays, Sundays, and 10 configured public/festival holidays consume 0 working minutes.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">2. Priority SLA Engine</h4>
            <p class="text-slate-600">
              • <strong>Urgent:</strong> 2h first response, same-day resolution (18:30).<br />
              • <strong>Medium:</strong> 4.5h first response, 3 working days resolution.<br />
              • <strong>Low:</strong> 9h first response, 1 working week resolution.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">3. Concurrency Safety (INC-0291)</h4>
            <p class="text-slate-600">
              Prevent collision via PostgreSQL <code>FOR UPDATE</code> atomic row locking. If a colleague claims a ticket simultaneously, an HTTP 409 Conflict warning is returned.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">4. Private Note Isolation (INC-0304)</h4>
            <p class="text-slate-600">
              Internal notes are stored in a physically separate table and stripped by the backend. They never appear in customer APIs, portals, or exports.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">5. 5-Day Auto-Closure</h4>
            <p class="text-slate-600">
              Tickets in <code>WAITING_FOR_CUSTOMER</code> for 5 working days (2,700 working minutes) without reply are automatically closed by the background scheduler.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <h4 class="font-bold text-slate-800">6. 5-Day Reopening Window</h4>
            <p class="text-slate-600">
              Resolved tickets can be reopened within 5 working days of resolution. Beyond 5 working days, customers must create a new ticket.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  constructor(public auth: AuthService) {}
}

