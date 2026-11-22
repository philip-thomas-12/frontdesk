import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Ticket, User, Status, Priority } from '../../models/ticket.model';
import { StatusBadgeComponent } from '../../components/badges/status-badge.component';
import { PriorityBadgeComponent } from '../../components/badges/priority-badge.component';
import { SLABadgeComponent } from '../../components/badges/sla-badge.component';
import { CustomerPreviewModalComponent } from '../../components/customer-preview-modal/customer-preview-modal.component';

@Component({
  selector: 'app-ticket-detail',
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
    <div class="space-y-6 max-w-7xl mx-auto" *ngIf="ticket">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <a routerLink="/tickets" class="text-xs text-brand-600 hover:underline flex items-center gap-1 mb-1 font-medium">
            ← Back to All Tickets
          </a>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">{{ ticket.formattedId }}</h1>
            <app-status-badge [status]="ticket.status"></app-status-badge>
            <app-priority-badge [priority]="ticket.priority"></app-priority-badge>
            <span *ngIf="ticket.reopenCount > 0" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
              Reopened (x{{ ticket.reopenCount }})
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Customer Portal View Verifier (INC-0304) -->
          <button
            (click)="showCustomerPreview = true"
            class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            title="Inspect what the customer sees and verify zero internal note leakage"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Customer View Preview</span>
          </button>
        </div>
      </div>

      <!-- Main Layout: 2 Columns (Conversation & Audit on Left, Metadata & Actions on Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Issue description, Conversation timeline (Public vs Internal), & Composer -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Ticket Title & Description Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 class="text-lg font-bold text-slate-900">{{ ticket.title }}</h2>
            <div class="p-4 bg-slate-50 rounded-xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-100">
              {{ ticket.description }}
            </div>
            <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>Reported by <strong>{{ ticket.customer.name }}</strong> ({{ ticket.customer.email }})</span>
              <span>{{ ticket.createdAt | date:'medium' }}</span>
            </div>
          </div>

          <!-- Message History Timeline with Strict Separation (INC-0304) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>💬</span>
                <span>Messages & Private Notes</span>
              </h3>
              <div class="flex items-center gap-3 text-xs">
                <span class="flex items-center gap-1 text-blue-700 font-medium">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span> Public Reply (Customer Visible)
                </span>
                <span class="flex items-center gap-1 text-amber-800 font-medium">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span> Internal Note (Support Only)
                </span>
              </div>
            </div>

            <!-- Unified Chronological Timeline -->
            <div class="space-y-4 pt-2">
              <div *ngIf="combinedTimeline.length === 0" class="text-center py-6 text-slate-400 text-xs">
                No conversation history yet.
              </div>

              <div *ngFor="let item of combinedTimeline" class="transition-all">
                <!-- Case A: INTERNAL NOTE (Strictly styled Amber with Padlock) -->
                <div
                  *ngIf="item.isInternal"
                  class="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4 space-y-2 shadow-xs"
                >
                  <div class="flex items-center justify-between text-xs text-amber-900">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-200 text-amber-950 flex items-center gap-1">
                        🔒 Internal Note — Support Only
                      </span>
                      <span class="font-bold">{{ item.author?.name || 'Support Agent' }}</span>
                    </div>
                    <span class="text-amber-700 text-[11px]">{{ item.createdAt | date:'short' }}</span>
                  </div>
                  <p class="text-amber-950 text-sm whitespace-pre-wrap leading-relaxed">{{ item.content }}</p>
                  <p class="text-[10px] text-amber-700 italic border-t border-amber-200 pt-1">
                    Protected: This note is never visible or sent to the customer.
                  </p>
                </div>

                <!-- Case B: PUBLIC REPLY (Styled Clean Slate/Blue) -->
                <div
                  *ngIf="!item.isInternal"
                  class="rounded-xl p-4 border text-sm space-y-2"
                  [ngClass]="item.senderType === 'CUSTOMER' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/60 border-blue-200'"
                >
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        [ngClass]="item.senderType === 'CUSTOMER' ? 'bg-slate-200 text-slate-800' : 'bg-blue-200 text-blue-900'"
                      >
                        {{ item.senderType === 'CUSTOMER' ? 'Customer Reply' : 'Public Reply to Customer' }}
                      </span>
                      <span class="font-semibold text-slate-800">{{ item.senderName }}</span>
                    </div>
                    <span class="text-slate-400 text-[11px]">{{ item.createdAt | date:'short' }}</span>
                  </div>
                  <p class="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{{ item.content }}</p>
                </div>
              </div>
            </div>

            <!-- Message Composer with 2 Distinct Modes (INC-0304 Prevention) -->
            <div class="mt-6 border-t border-slate-200 pt-5 space-y-3">
              <!-- Mode Tabs -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="composerMode = 'PUBLIC'"
                  class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  [ngClass]="composerMode === 'PUBLIC' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                >
                  <span>💬 Public Reply</span>
                  <span class="text-[10px] opacity-80">(Sent to Customer)</span>
                </button>

                <button
                  type="button"
                  (click)="composerMode = 'INTERNAL'"
                  class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  [ngClass]="composerMode === 'INTERNAL' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                >
                  <span>🔒 Internal Note</span>
                  <span class="text-[10px] opacity-80">(Staff Only)</span>
                </button>
              </div>

              <!-- Public Notice vs Private Warning -->
              <div
                *ngIf="composerMode === 'INTERNAL'"
                class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2"
              >
                <span>⚠️</span>
                <span><strong>Private Support Note:</strong> Strictly visible to support agents. Zero customer visibility.</span>
              </div>

              <div
                *ngIf="composerMode === 'PUBLIC'"
                class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2"
              >
                <span>ℹ️</span>
                <span><strong>Public Message:</strong> Customer will view this reply in their email and portal.</span>
              </div>

              <!-- Textarea -->
              <textarea
                [(ngModel)]="newMessageContent"
                rows="3"
                [placeholder]="composerMode === 'INTERNAL' ? 'Write an internal team note (e.g. backend pod restarted, pending DevOps)...' : 'Write a public response to the customer...'"
                class="w-full p-3.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all text-slate-900 bg-slate-50 focus:bg-white"
                [ngClass]="composerMode === 'INTERNAL' ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-300 focus:ring-brand-500'"
              ></textarea>

              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">
                  {{ composerMode === 'PUBLIC' ? 'First response satisfies Response SLA.' : 'Internal notes do not satisfy Response SLA.' }}
                </span>
                <button
                  (click)="sendMessage()"
                  [disabled]="!newMessageContent.trim() || submittingMessage"
                  class="px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  [ngClass]="composerMode === 'INTERNAL' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'"
                >
                  {{ submittingMessage ? 'Posting...' : (composerMode === 'INTERNAL' ? 'Save Internal Note' : 'Send Public Reply') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Immutable Audit Log (INC-0318) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📜</span>
              <span>Tamper-Proof Audit History (Incident INC-0318)</span>
            </h3>
            <p class="text-xs text-slate-400">
              Immutable append-only record of all ticket mutations, assignment claims, priority recalculations, and status transitions.
            </p>

            <div class="space-y-3 pt-2">
              <div
                *ngFor="let log of ticket.auditLogs"
                class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700"
              >
                <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  #
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900">{{ log.eventType }}</span>
                    <span class="text-slate-400 text-[11px]">{{ log.createdAt | date:'medium' }}</span>
                  </div>
                  <p class="text-slate-600 mt-0.5">
                    Actor: <strong class="text-slate-800">{{ log.actorName }}</strong> ({{ log.actorRole }})
                  </p>
                  <p *ngIf="log.newValue" class="text-slate-800 font-medium mt-1">{{ log.newValue }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Actions, SLA Gauge, Customer Profile, Assignment Controls -->
        <div class="space-y-6">
          <!-- SLA Clock & Countdown Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>SLA Target Status</span>
              <app-sla-badge [sla]="ticket.sla"></app-sla-badge>
            </h3>

            <div class="space-y-3 text-xs">
              <!-- Response SLA -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-slate-500 font-medium block">Response SLA Deadline:</span>
                <span class="font-bold text-slate-800 text-sm">
                  {{ ticket.responseDueAt ? (ticket.responseDueAt | date:'medium') : 'N/A' }}
                </span>
                <div class="mt-1 flex items-center gap-1.5 text-[11px]">
                  <span *ngIf="ticket.firstResponseAt" class="text-emerald-700 font-semibold">
                    ✓ Fulfilled at {{ ticket.firstResponseAt | date:'short' }}
                  </span>
                  <span *ngIf="!ticket.firstResponseAt && ticket.sla?.isResponseOverdue" class="text-rose-600 font-bold">
                    ⚠️ First response breached!
                  </span>
                  <span *ngIf="!ticket.firstResponseAt && !ticket.sla.isResponseOverdue" class="text-slate-500">
                    Remaining: {{ formatMinutes(ticket.sla.remainingResponseMinutes) }}
                  </span>
                </div>
              </div>

              <!-- Resolution SLA -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-slate-500 font-medium block">Resolution SLA Deadline:</span>
                <span class="font-bold text-slate-800 text-sm">
                  {{ ticket.resolutionDueAt ? (ticket.resolutionDueAt | date:'medium') : 'N/A' }}
                </span>
                <div class="mt-1 flex items-center gap-1.5 text-[11px]">
                  <span *ngIf="ticket.resolvedAt" class="text-emerald-700 font-semibold">
                    ✓ Resolved at {{ ticket.resolvedAt | date:'short' }}
                  </span>
                  <span *ngIf="!ticket.resolvedAt && ticket.sla.isResolutionOverdue" class="text-rose-600 font-bold">
                    ⚠️ Resolution SLA breached!
                  </span>
                  <span *ngIf="!ticket.resolvedAt && !ticket.sla.isResolutionOverdue" class="text-slate-500">
                    Remaining: {{ formatMinutes(ticket.sla.remainingResolutionMinutes) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Priority Change Control -->
            <div class="pt-3 border-t border-slate-100">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Adjust Priority (Recalculates SLA)</label>
              <select
                [ngModel]="ticket.priority"
                (ngModelChange)="onPriorityChange($event)"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 font-semibold text-slate-800"
              >
                <option value="URGENT">Urgent / Critical (2h Response, Same-day)</option>
                <option value="MEDIUM">Medium (4.5h Response, 3 days)</option>
                <option value="LOW">Low / Small (9h Response, 1 week)</option>
              </select>
            </div>
          </div>

          <!-- Assignment & Concurrency Safe Control (INC-0291) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignee Management</h3>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                  {{ ticket.assignedAgent ? ticket.assignedAgent.name.charAt(0) : '?' }}
                </div>
                <div>
                  <p class="font-bold text-sm text-slate-900">{{ ticket.assignedAgent?.name || 'Unassigned' }}</p>
                  <p class="text-xs text-slate-400">{{ ticket.assignedAgent?.email || 'Awaiting agent claim' }}</p>
                </div>
              </div>
            </div>

            <!-- Claim / Reassign Buttons -->
            <div class="space-y-2 pt-2">
              <button
                *ngIf="!ticket.assignedAgent"
                (click)="claimTicket()"
                class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                ⚡ Claim This Ticket (Atomic Lock)
              </button>

              <button
                *ngIf="ticket.assignedAgent"
                (click)="showReassignModal = true"
                class="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Reassign to Colleague
              </button>
            </div>
          </div>

          <!-- Status Lifecycle Actions -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Workflow Actions</h3>

            <div class="space-y-2">
              <!-- Start Progress -->
              <button
                *ngIf="ticket.status === 'OPEN'"
                (click)="updateStatus('IN_PROGRESS')"
                class="w-full py-2 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl border border-brand-200 text-left flex items-center justify-between"
              >
                <span>Start Working (In Progress)</span>
                <span>→</span>
              </button>

              <!-- Waiting on Customer (Pauses SLA) -->
              <button
                *ngIf="ticket.status === 'IN_PROGRESS'"
                (click)="updateStatus('WAITING_FOR_CUSTOMER')"
                class="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl border border-amber-200 text-left flex items-center justify-between"
              >
                <span>⏸️ Mark Waiting on Customer (Pause SLA)</span>
                <span>→</span>
              </button>

              <!-- Resume to In Progress -->
              <button
                *ngIf="ticket.status === 'WAITING_FOR_CUSTOMER'"
                (click)="updateStatus('IN_PROGRESS')"
                class="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 text-left flex items-center justify-between"
              >
                <span>▶️ Resume Working (Unpause SLA)</span>
                <span>→</span>
              </button>

              <!-- Resolve Ticket (Requires summary modal) -->
              <button
                *ngIf="['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'].includes(ticket.status)"
                (click)="showResolveModal = true"
                class="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 text-left flex items-center justify-between"
              >
                <span>✅ Mark Resolved</span>
                <span>→</span>
              </button>

              <!-- Reopen Ticket (5-day window check) -->
              <button
                *ngIf="ticket.status === 'RESOLVED'"
                (click)="showReopenModal = true"
                class="w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-xs rounded-xl border border-purple-200 text-left flex items-center justify-between"
              >
                <span>🔄 Reopen Ticket (5-Day Window)</span>
                <span>→</span>
              </button>

              <!-- Close Ticket Permanently -->
              <button
                *ngIf="ticket.status !== 'CLOSED'"
                (click)="updateStatus('CLOSED')"
                class="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl text-left flex items-center justify-between"
              >
                <span>🔒 Close Ticket Permanently</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <!-- Customer Profile Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Profile</h3>
            <div class="space-y-2 text-xs">
              <div>
                <span class="text-slate-400 block">Name</span>
                <span class="font-bold text-slate-800">{{ ticket.customer.name }}</span>
              </div>
              <div>
                <span class="text-slate-400 block">Email Address</span>
                <span class="font-medium text-slate-800">{{ ticket.customer.email }}</span>
              </div>
              <div *ngIf="ticket.customer.company">
                <span class="text-slate-400 block">Organization</span>
                <span class="font-medium text-slate-800">{{ ticket.customer.company }}</span>
              </div>
              <div *ngIf="ticket.customer.phone">
                <span class="text-slate-400 block">Phone</span>
                <span class="font-medium text-slate-800">{{ ticket.customer.phone }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resolve Ticket Modal -->
      <div *ngIf="showResolveModal" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <h3 class="text-base font-bold text-slate-900">Resolve Ticket #{{ ticket.ticketNumber }}</h3>
          <p class="text-xs text-slate-500">
            Please document the resolution summary. This will fulfill the resolution SLA and allow the customer 5 working days to reopen if needed.
          </p>

          <textarea
            [(ngModel)]="resolutionSummary"
            rows="3"
            placeholder="Detailed explanation of how the issue was resolved..."
            class="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
          ></textarea>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button (click)="showResolveModal = false" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
              Cancel
            </button>
            <button
              (click)="submitResolution()"
              [disabled]="!resolutionSummary.trim() || resolutionSummary.trim().length < 5"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Confirm Resolution
            </button>
          </div>
        </div>
      </div>

      <!-- Reopen Ticket Modal -->
      <div *ngIf="showReopenModal" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <h3 class="text-base font-bold text-slate-900">Reopen Resolved Ticket</h3>
          <p class="text-xs text-slate-500">
            Allowed within 5 working days of resolution. If expired, customer issue must be created as a new ticket.
          </p>

          <textarea
            [(ngModel)]="reopenReason"
            rows="3"
            placeholder="Reason for reopening ticket (e.g. customer reports latency returned)..."
            class="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-slate-900"
          ></textarea>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button (click)="showReopenModal = false" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
              Cancel
            </button>
            <button
              (click)="submitReopen()"
              [disabled]="!reopenReason.trim() || reopenReason.trim().length < 5"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Confirm Reopen
            </button>
          </div>
        </div>
      </div>

      <!-- Reassign Colleague Modal -->
      <div *ngIf="showReassignModal" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <h3 class="text-base font-bold text-slate-900">Reassign Ticket to Colleague</h3>
          <p class="text-xs text-slate-500">Select another active agent from the 9 Arvo Systems team members.</p>

          <select [(ngModel)]="targetAgentId" class="w-full p-2.5 text-xs border border-slate-300 rounded-xl">
            <option value="" disabled selected>Select colleague...</option>
            <option *ngFor="let agent of agents" [value]="agent.id">{{ agent.name }} ({{ agent.email }})</option>
          </select>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button (click)="showReassignModal = false" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
              Cancel
            </button>
            <button
              (click)="submitReassign()"
              [disabled]="!targetAgentId"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Reassign
            </button>
          </div>
        </div>
      </div>

      <!-- Customer View Preview Modal -->
      <app-customer-preview-modal
        *ngIf="showCustomerPreview"
        [ticketId]="ticket.id"
        (close)="showCustomerPreview = false"
        (replySent)="loadTicket(ticket.ticketNumber.toString())"
      ></app-customer-preview-modal>
    </div>
  `,
})
export class TicketDetailComponent implements OnInit {
  ticket: Ticket | null = null;
  agents: User[] = [];
  combinedTimeline: any[] = [];

  composerMode: 'PUBLIC' | 'INTERNAL' = 'PUBLIC';
  newMessageContent = '';
  submittingMessage = false;

  showResolveModal = false;
  resolutionSummary = '';

  showReopenModal = false;
  reopenReason = '';

  showReassignModal = false;
  targetAgentId = '';

  showCustomerPreview = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadTicket(id);
      }
    });

    this.auth.getAgents().subscribe({
      next: (res) => (this.agents = res.agents),
    });
  }

  loadTicket(id: string) {
    this.api.getTicketById(id).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.buildTimeline();
      },
      error: () => {
        this.toast.error('Ticket not found.');
        this.router.navigate(['/tickets']);
      },
    });
  }

  buildTimeline() {
    if (!this.ticket) return;
    const messages = (this.ticket.messages || []).map((m) => ({ ...m, isInternal: false }));
    const internalNotes = (this.ticket.internalNotes || []).map((n) => ({ ...n, isInternal: true }));

    this.combinedTimeline = [...messages, ...internalNotes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  formatMinutes(mins: number | undefined): string {
    if (mins === undefined || mins === null) return '0m';
    if (mins <= 0) return '0m (Breached)';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  sendMessage() {
    if (!this.ticket || !this.newMessageContent.trim()) return;

    this.submittingMessage = true;
    const content = this.newMessageContent.trim();

    if (this.composerMode === 'INTERNAL') {
      this.api.addInternalNote(this.ticket.id, content).subscribe({
        next: () => {
          this.toast.success('Internal note saved securely.');
          this.newMessageContent = '';
          this.submittingMessage = false;
          this.loadTicket(this.ticket!.id);
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to save internal note.');
          this.submittingMessage = false;
        },
      });
    } else {
      this.api.addPublicReply(this.ticket.id, content).subscribe({
        next: () => {
          this.toast.success('Public reply sent to customer.');
          this.newMessageContent = '';
          this.submittingMessage = false;
          this.loadTicket(this.ticket!.id);
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to send reply.');
          this.submittingMessage = false;
        },
      });
    }
  }

  claimTicket() {
    if (!this.ticket) return;
    this.api.claimTicket(this.ticket.id).subscribe({
      next: () => {
        this.toast.success('Ticket claimed successfully!');
        this.loadTicket(this.ticket!.id);
      },
      error: (err) => {
        // Concurrency error 409 (INC-0291)
        this.toast.warning(err.error?.message || 'Conflict: This ticket has already been claimed by another agent.');
        this.loadTicket(this.ticket!.id);
      },
    });
  }

  submitReassign() {
    if (!this.ticket || !this.targetAgentId) return;
    this.api.reassignTicket(this.ticket.id, this.targetAgentId).subscribe({
      next: () => {
        this.toast.success('Ticket successfully reassigned.');
        this.showReassignModal = false;
        this.loadTicket(this.ticket!.id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to reassign.');
      },
    });
  }

  onPriorityChange(newPriority: string) {
    if (!this.ticket) return;
    this.api.updatePriority(this.ticket.id, newPriority, 'Priority changed via agent detail console').subscribe({
      next: () => {
        this.toast.success(`Priority updated to ${newPriority}. SLA deadlines recalculated.`);
        this.loadTicket(this.ticket!.id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update priority.');
      },
    });
  }

  updateStatus(newStatus: string) {
    if (!this.ticket) return;
    this.api.updateStatus(this.ticket.id, newStatus).subscribe({
      next: () => {
        this.toast.success(`Status updated to ${newStatus}.`);
        this.loadTicket(this.ticket!.id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update status.');
      },
    });
  }

  submitResolution() {
    if (!this.ticket || !this.resolutionSummary.trim()) return;
    this.api
      .updateStatus(this.ticket.id, 'RESOLVED', { resolutionSummary: this.resolutionSummary.trim() })
      .subscribe({
        next: () => {
          this.toast.success('Ticket marked as RESOLVED.');
          this.showResolveModal = false;
          this.resolutionSummary = '';
          this.loadTicket(this.ticket!.id);
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to resolve ticket.');
        },
      });
  }

  submitReopen() {
    if (!this.ticket || !this.reopenReason.trim()) return;
    this.api.reopenTicket(this.ticket.id, this.reopenReason.trim()).subscribe({
      next: () => {
        this.toast.success('Ticket reopened within 5-working-day window.');
        this.showReopenModal = false;
        this.reopenReason = '';
        this.loadTicket(this.ticket!.id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Reopening window expired. Please create a new ticket.');
      },
    });
  }
}
