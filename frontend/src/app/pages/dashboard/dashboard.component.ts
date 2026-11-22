import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, Ticket } from '../../models/ticket.model';
import { StatusBadgeComponent } from '../../components/badges/status-badge.component';
import { PriorityBadgeComponent } from '../../components/badges/priority-badge.component';
import { SLABadgeComponent } from '../../components/badges/sla-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent, PriorityBadgeComponent, SLABadgeComponent],
  template: `
    <div class="space-y-6">
      <!-- Welcome Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Support Dashboard</h1>
          <p class="text-sm text-slate-500 mt-1">
            Real-time workload overview for Arvo Systems support operations.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a
            routerLink="/tickets/create"
            class="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Raise Ticket</span>
          </a>
          <button
            (click)="loadData()"
            class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh dashboard"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        <div *ngFor="let i of [1,2,3,4,5,6,7,8]" class="h-28 bg-white rounded-2xl border border-slate-200"></div>
      </div>

      <!-- Stat Cards Grid -->
      <div *ngIf="!loading && stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Total Tickets -->
        <a
          routerLink="/tickets"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tickets</span>
            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
              📋
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">{{ stats.summary.total }}</span>
            <span class="text-xs text-brand-600 font-medium group-hover:underline">View all →</span>
          </div>
        </a>

        <!-- Open Tickets -->
        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'OPEN' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-blue-700">Open Tickets</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              📬
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-blue-700">{{ stats.summary.open }}</span>
            <span class="text-xs text-blue-600 font-medium">Unassigned/New</span>
          </div>
        </a>

        <!-- In Progress -->
        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'IN_PROGRESS' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-indigo-700">In Progress</span>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              ⚙️
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-indigo-700">{{ stats.summary.inProgress }}</span>
            <span class="text-xs text-indigo-600 font-medium">Active work</span>
          </div>
        </a>

        <!-- Waiting on Customer -->
        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'WAITING_FOR_CUSTOMER' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-amber-700">Waiting on Customer</span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              ⏳
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-amber-700">{{ stats.summary.waitingForCustomer }}</span>
            <span class="text-xs text-amber-600 font-medium">SLA Paused</span>
          </div>
        </a>

        <!-- Overdue Tickets -->
        <a
          routerLink="/tickets"
          [queryParams]="{ isOverdue: 'true' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all group"
          [ngClass]="stats.summary.overdue > 0 ? 'bg-rose-50/50 border-rose-200' : ''"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-rose-700">Overdue (SLA Breached)</span>
            <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center" [ngClass]="stats.summary.overdue > 0 ? 'animate-bounce' : ''">
              🚨
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-rose-700">{{ stats.summary.overdue }}</span>
            <span class="text-xs text-rose-600 font-medium">Immediate action</span>
          </div>
        </a>

        <!-- My Assigned -->
        <a
          routerLink="/tickets"
          [queryParams]="{ assignedAgentId: 'MY_TICKETS' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-brand-700">Assigned to Me</span>
            <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              👤
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-brand-700">{{ stats.summary.myAssigned }}</span>
            <span class="text-xs text-brand-600 font-medium">My queue</span>
          </div>
        </a>

        <!-- Resolved -->
        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'RESOLVED' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Resolved</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              ✅
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-emerald-700">{{ stats.summary.resolved }}</span>
            <span class="text-xs text-emerald-600 font-medium">5-day reopen</span>
          </div>
        </a>

        <!-- Closed -->
        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'CLOSED' }"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-600">Closed</span>
            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              🔒
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-700">{{ stats.summary.closed }}</span>
            <span class="text-xs text-slate-500 font-medium">Terminal state</span>
          </div>
        </a>
      </div>

      <!-- Priority SLA Health & Urgent Attention Banner -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- SLA Policies Overview Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-1">
          <h3 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>⏱️</span>
            <span>SLA Engine Targets (Asia/Kolkata)</span>
          </h3>
          <div class="space-y-4 text-xs">
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <div class="flex items-center justify-between font-bold text-rose-900 mb-1">
                <span>URGENT / CRITICAL</span>
                <span>{{ stats?.priorityBreakdown?.urgent || 0 }} Active</span>
              </div>
              <p class="text-rose-700">First Response: <strong>2 working hours</strong></p>
              <p class="text-rose-700">Resolution: <strong>Same working day (18:30 IST)</strong></p>
            </div>

            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div class="flex items-center justify-between font-bold text-amber-900 mb-1">
                <span>MEDIUM</span>
                <span>{{ stats?.priorityBreakdown?.medium || 0 }} Active</span>
              </div>
              <p class="text-amber-700">First Response: <strong>4.5 working hours</strong></p>
              <p class="text-amber-700">Resolution: <strong>3 working days (27h)</strong></p>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="flex items-center justify-between font-bold text-slate-900 mb-1">
                <span>LOW / SMALL</span>
                <span>{{ stats?.priorityBreakdown?.low || 0 }} Active</span>
              </div>
              <p class="text-slate-600">First Response: <strong>1 working day (9h)</strong></p>
              <p class="text-slate-600">Resolution: <strong>1 working week (45h)</strong></p>
            </div>
          </div>
        </div>

        <!-- Recent Critical & Open Tickets Table -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🚨</span>
                <span>High Priority & Immediate Attention Queue</span>
              </h3>
              <a routerLink="/tickets" class="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View Full Queue →
              </a>
            </div>

            <div *ngIf="urgentTickets.length === 0" class="text-center py-12 text-slate-400 text-sm">
              No tickets currently requiring immediate escalation. Great job!
            </div>

            <div *ngIf="urgentTickets.length > 0" class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th class="py-2.5">ID & Title</th>
                    <th class="py-2.5">Priority</th>
                    <th class="py-2.5">Status</th>
                    <th class="py-2.5">Assignee</th>
                    <th class="py-2.5">SLA Deadline</th>
                    <th class="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let t of urgentTickets" class="hover:bg-slate-50 transition-colors">
                    <td class="py-3">
                      <a [routerLink]="['/tickets', t.ticketNumber]" class="font-bold text-brand-600 hover:underline">
                        {{ t.formattedId }}
                      </a>
                      <p class="text-slate-700 font-medium truncate max-w-xs">{{ t.title }}</p>
                    </td>
                    <td class="py-3"><app-priority-badge [priority]="t.priority"></app-priority-badge></td>
                    <td class="py-3"><app-status-badge [status]="t.status"></app-status-badge></td>
                    <td class="py-3">
                      <span *ngIf="t.assignedAgent" class="font-medium text-slate-800">{{ t.assignedAgent.name }}</span>
                      <span *ngIf="!t.assignedAgent" class="text-indigo-600 font-semibold">Unassigned</span>
                    </td>
                    <td class="py-3"><app-sla-badge [sla]="t.sla"></app-sla-badge></td>
                    <td class="py-3 text-right">
                      <a
                        [routerLink]="['/tickets', t.ticketNumber]"
                        class="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                      >
                        Inspect
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  urgentTickets: Ticket[] = [];
  loading = true;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getDashboardStats().subscribe({
      next: (res) => {
        this.stats = res.data;
        this.loadUrgentTickets();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadUrgentTickets() {
    this.api.getTickets({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (res) => {
        this.urgentTickets = res.tickets;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}

