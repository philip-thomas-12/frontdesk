import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Ticket, User, TicketFilters } from '../../models/ticket.model';
import { StatusBadgeComponent } from '../../components/badges/status-badge.component';
import { PriorityBadgeComponent } from '../../components/badges/priority-badge.component';
import { SLABadgeComponent } from '../../components/badges/sla-badge.component';
import { CustomerPreviewModalComponent } from '../../components/customer-preview-modal/customer-preview-modal.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    SLABadgeComponent,
    CustomerPreviewModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
          <p class="text-sm text-slate-500 mt-1">Manage, triage, and claim support requests with working-hours SLA tracking.</p>
        </div>
        <div class="flex items-center gap-3">
          <a
            routerLink="/tickets/create"
            class="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Ticket</span>
          </a>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <!-- Meera's Quick Triage Pills (Section 3 Requirement) -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Quick View:</span>
          
          <button
            type="button"
            (click)="setQuickFilter('ALL')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            [ngClass]="activeQuickFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            All Tickets
          </button>

          <button
            type="button"
            (click)="setQuickFilter('OVERDUE')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [ngClass]="activeQuickFilter === 'OVERDUE' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'"
          >
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse" *ngIf="activeQuickFilter !== 'OVERDUE'"></span>
            <span>🚨 Already Late</span>
          </button>

          <button
            type="button"
            (click)="setQuickFilter('WAITING')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [ngClass]="activeQuickFilter === 'WAITING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'"
          >
            <span>⏳ Waiting on Customer</span>
          </button>

          <button
            type="button"
            (click)="setQuickFilter('MY_ASSIGNED')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [ngClass]="activeQuickFilter === 'MY_ASSIGNED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'"
          >
            <span>👤 My Assigned</span>
          </button>

          <button
            type="button"
            (click)="setQuickFilter('UNASSIGNED')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [ngClass]="activeQuickFilter === 'UNASSIGNED' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'"
          >
            <span>⚡ Unassigned (Ready to Claim)</span>
          </button>

          <button
            type="button"
            (click)="setQuickFilter('URGENT')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [ngClass]="activeQuickFilter === 'URGENT' ? 'bg-red-700 text-white shadow-xs' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'"
          >
            <span>🔥 Urgent (2h SLA)</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <!-- Search -->
          <div class="md:col-span-2 relative">
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              [(ngModel)]="filters.search"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by ID, title, or customer email..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-800"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <select
              [(ngModel)]="filters.status"
              (ngModelChange)="onFilterChange()"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <!-- Priority Filter -->
          <div>
            <select
              [(ngModel)]="filters.priority"
              (ngModelChange)="onFilterChange()"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (2h SLA)</option>
              <option value="MEDIUM">Medium (4.5h SLA)</option>
              <option value="LOW">Low (9h SLA)</option>
            </select>
          </div>

          <!-- Assignee Filter -->
          <div>
            <select
              [(ngModel)]="filters.assignedAgentId"
              (ngModelChange)="onFilterChange()"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Assignees</option>
              <option value="MY_TICKETS">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              <option *ngFor="let agent of agents" [value]="agent.id">{{ agent.name }}</option>
            </select>
          </div>
        </div>

        <!-- Secondary Toolbar: Overdue Toggle, Sorting & Counter -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div class="flex items-center gap-4">
            <!-- Overdue Checkbox Toggle -->
            <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-rose-600 transition-colors">
              <input
                type="checkbox"
                [checked]="filters.isOverdue === 'true'"
                (change)="toggleOverdue($event)"
                class="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                Show Overdue (SLA Breached) Only
              </span>
            </label>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-slate-400">Sort by:</span>
            <select
              [(ngModel)]="filters.sortBy"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="createdAt">Date Created</option>
              <option value="priority">Priority</option>
              <option value="ticketNumber">Ticket Number</option>
              <option value="responseDueAt">Response Due Date</option>
              <option value="resolutionDueAt">Resolution Due Date</option>
            </select>

            <button
              (click)="toggleSortOrder()"
              class="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              {{ filters.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Ticket Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div *ngIf="loading" class="p-12 text-center text-slate-400 text-sm">
          <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading tickets...
        </div>

        <div *ngIf="!loading && tickets.length === 0" class="p-16 text-center">
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
            🔍
          </div>
          <h3 class="text-base font-bold text-slate-800">No tickets match your filters</h3>
          <p class="text-xs text-slate-500 mt-1">Try broadening your search criteria or clear active filters.</p>
          <button
            (click)="resetFilters()"
            class="mt-4 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div *ngIf="!loading && tickets.length > 0" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th class="py-3 px-4">Ticket</th>
                <th class="py-3 px-4">Customer</th>
                <th class="py-3 px-4">Priority</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Assignee</th>
                <th class="py-3 px-4">SLA Countdown</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let t of tickets" class="hover:bg-slate-50/80 transition-colors group">
                <!-- Ticket ID & Subject -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <a
                      [routerLink]="['/tickets', t.ticketNumber]"
                      class="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {{ t.formattedId }}
                    </a>
                    <span *ngIf="t.reopenCount > 0" class="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[10px] font-medium" title="Ticket was reopened">
                      Reopened
                    </span>
                  </div>
                  <a
                    [routerLink]="['/tickets', t.ticketNumber]"
                    class="font-semibold text-slate-900 group-hover:text-brand-600 block truncate max-w-sm mt-0.5"
                  >
                    {{ t.title }}
                  </a>
                  <span class="text-[11px] text-slate-400">Created {{ t.createdAt | date:'short' }}</span>
                </td>

                <!-- Customer -->
                <td class="py-3 px-4">
                  <div class="font-medium text-slate-800">{{ t.customer.name }}</div>
                  <div class="text-[11px] text-slate-400 truncate max-w-[150px]">{{ t.customer.email }}</div>
                  <div *ngIf="t.customer.company" class="text-[10px] text-slate-500 font-medium">{{ t.customer.company }}</div>
                </td>

                <!-- Priority -->
                <td class="py-3 px-4">
                  <app-priority-badge [priority]="t.priority"></app-priority-badge>
                </td>

                <!-- Status -->
                <td class="py-3 px-4">
                  <app-status-badge [status]="t.status"></app-status-badge>
                </td>

                <!-- Assignee -->
                <td class="py-3 px-4">
                  <div *ngIf="t.assignedAgent" class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-[10px]">
                      {{ t.assignedAgent.name.charAt(0) }}
                    </div>
                    <span class="font-medium text-slate-800">{{ t.assignedAgent.name }}</span>
                  </div>
                  <div *ngIf="!t.assignedAgent">
                    <button
                      (click)="claimTicket(t)"
                      class="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold text-[11px] transition-colors"
                      title="Atomic Claim (INC-0291 Concurrency Protected)"
                    >
                      ⚡ Claim Ticket
                    </button>
                  </div>
                </td>

                <!-- SLA Countdown -->
                <td class="py-3 px-4">
                  <app-sla-badge [sla]="t.sla"></app-sla-badge>
                </td>

                <!-- Actions -->
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Customer View Simulation -->
                    <button
                      (click)="openCustomerPreviewModal(t.id)"
                      class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Preview Customer Perspective (INC-0304 Zero-Leakage)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    <a
                      [routerLink]="['/tickets', t.ticketNumber]"
                      class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Open
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="pagination && pagination.totalPages > 1" class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <strong>{{ pagination.page }}</strong> of <strong>{{ pagination.totalPages }}</strong> ({{ pagination.totalCount }} total tickets)
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="changePage(pagination.page - 1)"
              [disabled]="pagination.page <= 1"
              class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              (click)="changePage(pagination.page + 1)"
              [disabled]="pagination.page >= pagination.totalPages"
              class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Portal View Simulation Modal -->
    <app-customer-preview-modal
      *ngIf="selectedTicketForCustomerPreview"
      [ticketId]="selectedTicketForCustomerPreview"
      (close)="selectedTicketForCustomerPreview = null"
      (replySent)="loadTickets()"
    ></app-customer-preview-modal>
  `,
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  agents: User[] = [];
  pagination: any = null;
  loading = true;
  selectedTicketForCustomerPreview: string | null = null;
  activeQuickFilter: 'ALL' | 'OVERDUE' | 'WAITING' | 'MY_ASSIGNED' | 'UNASSIGNED' | 'URGENT' = 'ALL';

  filters: TicketFilters = {
    search: '',
    status: 'ALL',
    priority: 'ALL',
    assignedAgentId: 'ALL',
    isOverdue: 'false',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  };

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  setQuickFilter(type: 'ALL' | 'OVERDUE' | 'WAITING' | 'MY_ASSIGNED' | 'UNASSIGNED' | 'URGENT') {
    this.activeQuickFilter = type;
    this.filters.status = 'ALL';
    this.filters.priority = 'ALL';
    this.filters.assignedAgentId = 'ALL';
    this.filters.isOverdue = 'false';

    if (type === 'OVERDUE') {
      this.filters.isOverdue = 'true';
    } else if (type === 'WAITING') {
      this.filters.status = 'WAITING_FOR_CUSTOMER';
    } else if (type === 'MY_ASSIGNED') {
      this.filters.assignedAgentId = this.auth.currentUserValue?.id || 'ALL';
    } else if (type === 'UNASSIGNED') {
      this.filters.assignedAgentId = 'UNASSIGNED';
    } else if (type === 'URGENT') {
      this.filters.priority = 'URGENT';
    }

    this.onFilterChange();
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['assignedAgentId']) {
        if (params['assignedAgentId'] === 'MY_TICKETS') {
          this.filters.assignedAgentId = this.auth.currentUserValue?.id || 'ALL';
        } else {
          this.filters.assignedAgentId = params['assignedAgentId'];
        }
      }
      if (params['status']) this.filters.status = params['status'];
      if (params['priority']) this.filters.priority = params['priority'];
      if (params['isOverdue']) this.filters.isOverdue = params['isOverdue'];
      this.loadTickets();
    });

    this.auth.getAgents().subscribe({
      next: (res) => (this.agents = res.agents),
    });
  }

  loadTickets() {
    this.loading = true;
    this.api.getTickets(this.filters).subscribe({
      next: (res) => {
        this.tickets = res.tickets;
        this.pagination = res.pagination;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load tickets.');
        this.loading = false;
      },
    });
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadTickets();
  }

  toggleOverdue(e: any) {
    this.filters.isOverdue = e.target.checked ? 'true' : 'false';
    this.onFilterChange();
  }

  toggleSortOrder() {
    this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    this.onFilterChange();
  }

  resetFilters() {
    this.filters = {
      search: '',
      status: 'ALL',
      priority: 'ALL',
      assignedAgentId: 'ALL',
      isOverdue: 'false',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    };
    this.loadTickets();
  }

  changePage(page: number) {
    this.filters.page = page;
    this.loadTickets();
  }

  claimTicket(ticket: Ticket) {
    this.api.claimTicket(ticket.id).subscribe({
      next: (res) => {
        this.toast.success(`Ticket #${ticket.ticketNumber} claimed!`);
        this.loadTickets();
      },
      error: (err) => {
        // Concurrency error 409
        this.toast.warning(err.error?.message || 'Ticket has already been claimed by another agent.');
        this.loadTickets();
      },
    });
  }

  openCustomerPreviewModal(ticketId: string) {
    this.selectedTicketForCustomerPreview = ticketId;
  }
}

