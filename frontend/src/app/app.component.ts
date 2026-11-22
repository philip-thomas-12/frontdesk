import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastComponent } from './components/toast/toast.component';
import { CustomerPreviewModalComponent } from './components/customer-preview-modal/customer-preview-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent,
    ToastComponent,
    CustomerPreviewModalComponent,
  ],
  template: `
    <!-- Top-Level Layout -->
    <div class="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      <!-- Sidebar (Visible when authenticated) -->
      <app-sidebar *ngIf="authService.isAuthenticated()"></app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top Navbar (Visible when authenticated) -->
        <app-navbar
          *ngIf="authService.isAuthenticated()"
          (openCustomerPreview)="openSampleCustomerPreview()"
        ></app-navbar>

        <!-- Dynamic Page Outlet -->
        <main class="flex-1 p-6 md:p-8 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Global Toast Alert Container -->
    <app-toast></app-toast>

    <!-- Global Customer Preview Modal -->
    <app-customer-preview-modal
      *ngIf="globalPreviewTicketId"
      [ticketId]="globalPreviewTicketId"
      (close)="globalPreviewTicketId = null"
    ></app-customer-preview-modal>
  `,
})
export class AppComponent {
  globalPreviewTicketId: string | null = null;

  constructor(public authService: AuthService) {}

  openSampleCustomerPreview() {
    this.globalPreviewTicketId = '1'; // ticket #1
  }
}
