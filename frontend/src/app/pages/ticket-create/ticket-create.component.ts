import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Breadcrumb & Header -->
      <div>
        <a routerLink="/tickets" class="text-xs text-brand-600 hover:underline flex items-center gap-1 mb-2 font-medium">
          ← Back to All Tickets
        </a>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Raise New Support Ticket</h1>
        <p class="text-sm text-slate-500 mt-1">
          Tickets are immediately queued, assigned SLA targets according to business hours (09:30–18:30 IST), and logged in the audit trail.
        </p>
      </div>

      <!-- Ticket Creation Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <!-- Customer Details Section -->
        <div>
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Customer Contact Information</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="customerName"
                placeholder="e.g. Sarah Connor"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              />
              <span *ngIf="form.get('customerName')?.invalid && form.get('customerName')?.touched" class="text-[11px] text-rose-500 mt-0.5 block">
                Customer name is required.
              </span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Customer Email <span class="text-rose-500">*</span>
              </label>
              <input
                type="email"
                formControlName="customerEmail"
                placeholder="e.g. dev@latencywatch.com"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              />
              <span *ngIf="form.get('customerEmail')?.invalid && form.get('customerEmail')?.touched" class="text-[11px] text-rose-500 mt-0.5 block">
                Valid email address is required.
              </span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
              <input
                type="text"
                formControlName="customerCompany"
                placeholder="e.g. Latency Watch Inc"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input
                type="text"
                formControlName="customerPhone"
                placeholder="e.g. +1 555-0199"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              />
            </div>
          </div>
        </div>

        <!-- Issue Details Section -->
        <div class="pt-4 border-t border-slate-100">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ticket Details</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Title <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="title"
                placeholder="Clear summary of the issue (e.g. API latency spike in EU region)"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              />
              <span *ngIf="form.get('title')?.invalid && form.get('title')?.touched" class="text-[11px] text-rose-500 mt-0.5 block">
                Subject must be at least 3 characters.
              </span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Description / Initial Customer Message <span class="text-rose-500">*</span>
              </label>
              <textarea
                formControlName="description"
                rows="4"
                placeholder="Detailed description of the customer request, error logs, or question..."
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
              ></textarea>
              <span *ngIf="form.get('description')?.invalid && form.get('description')?.touched" class="text-[11px] text-rose-500 mt-0.5 block">
                Description must be at least 5 characters.
              </span>
            </div>

            <!-- Priority Selection with SLA Explanations -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-2">
                Priority & SLA Target Level <span class="text-rose-500">*</span>
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <!-- URGENT -->
                <label
                  class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                  [ngClass]="form.get('priority')?.value === 'URGENT' ? 'border-rose-500 bg-rose-50/60' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div>
                    <input type="radio" formControlName="priority" value="URGENT" class="sr-only" />
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 mb-2">
                      URGENT / CRITICAL
                    </span>
                    <p class="text-xs font-bold text-slate-800">2 Working Hours SLA</p>
                    <p class="text-[11px] text-slate-500 mt-1">Resolution: Same working day (18:30 IST)</p>
                  </div>
                </label>

                <!-- MEDIUM -->
                <label
                  class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                  [ngClass]="form.get('priority')?.value === 'MEDIUM' ? 'border-amber-500 bg-amber-50/60' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div>
                    <input type="radio" formControlName="priority" value="MEDIUM" class="sr-only" />
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 mb-2">
                      MEDIUM
                    </span>
                    <p class="text-xs font-bold text-slate-800">4.5 Working Hours SLA</p>
                    <p class="text-[11px] text-slate-500 mt-1">Resolution: 3 working days (27h)</p>
                  </div>
                </label>

                <!-- LOW -->
                <label
                  class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                  [ngClass]="form.get('priority')?.value === 'LOW' ? 'border-slate-600 bg-slate-50' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div>
                    <input type="radio" formControlName="priority" value="LOW" class="sr-only" />
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800 mb-2">
                      LOW / SMALL
                    </span>
                    <p class="text-xs font-bold text-slate-800">9 Working Hours SLA</p>
                    <p class="text-[11px] text-slate-500 mt-1">Resolution: 1 working week (45h)</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <a
            routerLink="/tickets"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            [disabled]="form.invalid || submitting"
            class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {{ submitting ? 'Submitting Ticket...' : 'Create Ticket & Start SLA' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class TicketCreateComponent {
  form: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerCompany: [''],
      customerPhone: [''],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      priority: ['MEDIUM', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.api.createTicket(this.form.value).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.router.navigate(['/tickets', res.ticket.ticketNumber]);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to create ticket.');
        this.submitting = false;
      },
    });
  }
}
