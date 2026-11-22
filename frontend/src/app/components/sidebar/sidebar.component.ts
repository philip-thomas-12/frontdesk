import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      <!-- App Brand -->
      <div class="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div class="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-base shadow-md">
          F
        </div>
        <div>
          <span class="font-bold text-white tracking-tight text-base">Frontdesk</span>
          <span class="block text-[10px] text-brand-400 font-medium uppercase tracking-wider">Arvo Systems</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <div class="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Support Operations
        </div>

        <a
          routerLink="/dashboard"
          routerLinkActive="bg-brand-600 text-white font-medium"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </a>

        <a
          routerLink="/tickets"
          [routerLinkActiveOptions]="{ exact: true }"
          routerLinkActive="bg-brand-600 text-white font-medium"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>All Tickets</span>
        </a>

        <a
          routerLink="/tickets/create"
          routerLinkActive="bg-brand-600 text-white font-medium"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Raise New Ticket</span>
        </a>

        <div class="pt-5 px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Quick Queues
        </div>

        <a
          routerLink="/tickets"
          [queryParams]="{ assignedAgentId: 'MY_TICKETS' }"
          class="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>My Assigned</span>
          </div>
        </a>

        <a
          routerLink="/tickets"
          [queryParams]="{ assignedAgentId: 'UNASSIGNED' }"
          class="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Unassigned Queue</span>
          </div>
        </a>

        <a
          routerLink="/tickets"
          [queryParams]="{ priority: 'URGENT' }"
          class="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Urgent (2h SLA)</span>
          </div>
        </a>

        <a
          routerLink="/tickets"
          [queryParams]="{ status: 'WAITING_FOR_CUSTOMER' }"
          class="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Waiting on Customer</span>
          </div>
        </a>

        <div class="pt-5 px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Account & Policy
        </div>

        <a
          routerLink="/profile"
          routerLinkActive="bg-brand-600 text-white font-medium"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Agent Profile & SLAs</span>
        </a>
      </div>

      <!-- Footer / System status -->
      <div class="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950">
        <p class="font-medium text-slate-300">Arvo Systems Desk</p>
        <p class="text-[11px] text-slate-500 mt-0.5">SLA Engine: Asia/Kolkata</p>
      </div>
    </aside>
  `,
})
export class SidebarComponent {}

