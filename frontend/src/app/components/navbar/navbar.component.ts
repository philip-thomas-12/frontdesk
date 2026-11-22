import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, DEMO_USERS } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <!-- Search & Context -->
      <div class="flex items-center gap-4 flex-1 max-w-lg">
        <div class="relative w-full">
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tickets by ID, title, or customer email..."
            class="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            (keyup.enter)="onSearch($event)"
          />
        </div>
      </div>

      <!-- Quick Actions & Agent Switcher -->
      <div class="flex items-center gap-4">
        <!-- Working Hours Badge -->
        <div class="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Shift Active: 09:30–18:30 IST</span>
        </div>

        <!-- Customer Portal Preview Button (INC-0304 Zero-Leakage Verifier) -->
        <button
          (click)="openCustomerPreview.emit()"
          class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          title="Verify customer perspective and confirm zero internal note leakage"
        >
          <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Customer Preview</span>
        </button>

        <!-- Demo Agent Quick Switcher Dropdown -->
        <div class="relative group">
          <button
            class="flex items-center gap-2 p-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg bg-slate-50 transition-colors"
          >
            <span>Switch Agent</span>
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown menu -->
          <div class="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 hidden group-hover:block z-50">
            <div class="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Login as Agent (9 Demo Agents)
            </div>
            <div class="max-h-60 overflow-y-auto">
              <button
                *ngFor="let agent of demoUsers"
                (click)="switchAgent(agent.email)"
                class="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 flex items-center justify-between group/item"
              >
                <div>
                  <p class="font-medium text-slate-800">{{ agent.name }}</p>
                  <p class="text-slate-400 text-[11px]">{{ agent.email }}</p>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover/item:bg-brand-100 group-hover/item:text-brand-800">
                  {{ agent.role }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Current Agent Profile & Logout -->
        <div class="flex items-center gap-3 pl-3 border-l border-slate-200" *ngIf="authService.currentUser$ | async as user">
          <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-xs overflow-hidden shadow-xs">
            <img *ngIf="user.avatarUrl" [src]="user.avatarUrl" [alt]="user.name" class="w-full h-full object-cover" />
            <span *ngIf="!user.avatarUrl">{{ user.name.charAt(0) }}</span>
          </div>
          <div class="hidden sm:block text-left">
            <p class="text-xs font-semibold text-slate-800 leading-none">{{ user.name }}</p>
            <p class="text-[11px] text-slate-400 capitalize mt-0.5">{{ user.role === 'ADMIN' ? 'Support Lead' : 'Support Agent' }}</p>
          </div>
          <button
            (click)="authService.logout()"
            class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors ml-1"
            title="Logout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  @Output() openCustomerPreview = new EventEmitter<void>();
  demoUsers = DEMO_USERS;

  constructor(public authService: AuthService, private toast: ToastService) {}

  onSearch(event: any) {
    const val = event.target.value;
    // handled via query parameters or direct emit
  }

  switchAgent(email: string) {
    this.authService.login({ email, password: 'Password123!' }).subscribe({
      next: () => {
        this.toast.success(`Switched agent account to ${email}`);
        window.location.reload();
      },
      error: () => {
        this.toast.error('Failed to switch agent.');
      },
    });
  }
}
