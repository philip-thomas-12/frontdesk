import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-customer-preview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <!-- Header -->
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
              👁️
            </div>
            <div>
              <h3 class="font-semibold text-base">Customer Portal View (Live Simulation)</h3>
              <p class="text-xs text-slate-400">Verifying Zero-Trust Private Note Isolation (Incident INC-0304)</p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-slate-400 hover:text-white p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Verification Banner -->
        <div class="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center gap-3">
          <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p class="text-xs text-emerald-900 leading-normal">
            <strong>Security Guarantee:</strong> This view calls <code>GET /api/customer/tickets/:id</code>. Internal support notes, internal assignees, and staff-only audit events are physically stripped by the backend.
          </p>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div *ngIf="loading" class="text-center py-12 text-slate-400">
            <div class="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading customer perspective...
          </div>

          <div *ngIf="!loading && customerTicket" class="space-y-6">
            <!-- Ticket Info Card -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold text-brand-600">Ticket #{{ customerTicket.ticketNumber }}</span>
                <h4 class="text-base font-bold text-slate-900 mt-1">{{ customerTicket.title }}</h4>
                <p class="text-xs text-slate-500 mt-1">Submitted on {{ customerTicket.createdAt | date:'medium' }}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Status: {{ customerTicket.status }}
              </span>
            </div>

            <!-- Customer Messages Timeline (Zero Internal Notes) -->
            <div>
              <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Public Conversation History</h5>
              <div class="space-y-4">
                <div
                  *ngFor="let msg of customerTicket.messages"
                  class="p-4 rounded-xl border text-sm"
                  [ngClass]="msg.senderType === 'CUSTOMER' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'"
                >
                  <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span class="font-semibold text-slate-800">{{ msg.senderName }} ({{ msg.senderType === 'CUSTOMER' ? 'You' : 'Arvo Support' }})</span>
                    <span>{{ msg.createdAt | date:'short' }}</span>
                  </div>
                  <p class="text-slate-700 whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
                </div>
              </div>
            </div>

            <!-- Customer Reply Box -->
            <div class="border-t border-slate-200 pt-4">
              <h5 class="text-xs font-bold text-slate-700 mb-2">Reply to Support Agent</h5>
              <textarea
                [(ngModel)]="replyContent"
                rows="3"
                placeholder="Type your message as a customer... (This will automatically resume any paused SLA timers!)"
                class="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              ></textarea>
              <div class="mt-2 flex justify-end">
                <button
                  (click)="sendCustomerReply()"
                  [disabled]="!replyContent.trim() || submitting"
                  class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {{ submitting ? 'Sending...' : 'Send Customer Reply' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CustomerPreviewModalComponent {
  @Input({ required: true }) ticketId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() replySent = new EventEmitter<void>();

  customerTicket: any = null;
  loading = true;
  replyContent = '';
  submitting = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadTicket();
  }

  loadTicket() {
    this.loading = true;
    this.api.getCustomerTicket(this.ticketId).subscribe({
      next: (res) => {
        this.customerTicket = res.ticket;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load customer view.');
        this.loading = false;
      },
    });
  }

  sendCustomerReply() {
    if (!this.replyContent.trim()) return;

    this.submitting = true;
    this.api
      .addCustomerReply(this.ticketId, {
        content: this.replyContent.trim(),
        customerName: this.customerTicket.customer.name,
        customerEmail: this.customerTicket.customer.email,
      })
      .subscribe({
        next: () => {
          this.toast.success('Customer reply sent. SLA timers resumed!');
          this.replyContent = '';
          this.submitting = false;
          this.loadTicket();
          this.replySent.emit();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to send reply.');
          this.submitting = false;
        },
      });
  }
}
