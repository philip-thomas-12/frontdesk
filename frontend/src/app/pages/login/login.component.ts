import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService, DEMO_USERS } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div class="inline-flex w-12 h-12 rounded-xl bg-brand-500 text-white items-center justify-center font-bold text-2xl shadow-lg mb-3">
          F
        </div>
        <h2 class="text-3xl font-extrabold text-white tracking-tight">Frontdesk</h2>
        <p class="text-sm text-slate-400 mt-1">Arvo Systems Support Agent Portal</p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div class="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <!-- Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Support Agent Email
              </label>
              <div class="mt-1">
                <input
                  type="email"
                  formControlName="email"
                  placeholder="e.g. meera@arvo.com"
                  autocomplete="username"
                  class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
                />
                <p
                  *ngIf="loginForm.controls['email'].touched && loginForm.controls['email'].invalid"
                  class="mt-1 text-[11px] font-medium text-red-600"
                >
                  Enter a valid support agent email address.
                </p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div class="mt-1">
                <input
                  type="password"
                  formControlName="password"
                  placeholder="••••••••••••"
                  autocomplete="current-password"
                  class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-900"
                />
                <p
                  *ngIf="loginForm.controls['password'].touched && loginForm.controls['password'].invalid"
                  class="mt-1 text-[11px] font-medium text-red-600"
                >
                  Password is required.
                </p>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="loginForm.invalid || loading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span *ngIf="!loading">Sign In to Frontdesk</span>
              <span *ngIf="loading" class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
              </span>
            </button>
          </form>

          <!-- Demo Agent Quick Login Section -->
          <div class="mt-8 pt-6 border-t border-slate-200">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                9 Demo Agents (Click to Auto-Login)
              </span>
              <span class="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Password: Password123!
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              <button
                *ngFor="let agent of demoUsers"
                (click)="quickLogin(agent.email)"
                class="text-left p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all group flex items-center justify-between"
              >
                <div>
                  <p class="text-xs font-semibold text-slate-800 group-hover:text-brand-700">{{ agent.name }}</p>
                  <p class="text-[11px] text-slate-400">{{ agent.email }}</p>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {{ agent.role.includes('Admin') ? 'Lead' : 'Agent' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer note -->
        <p class="text-center text-xs text-slate-500 mt-6">
          Frontdesk enforces working-hours SLAs (09:30–18:30 IST) & concurrency-safe claiming.
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  demoUsers = DEMO_USERS;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['meera@arvo.com', [Validators.required, Validators.email]],
      password: ['Password123!', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loading) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toast.success('Signed in successfully.');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard');
        },
        error: (err: HttpErrorResponse) => {
          this.toast.error(this.describeLoginError(err));
        },
      });
  }

  /** Distinguishes bad credentials (401) from API/database outages (0, 5xx). */
  private describeLoginError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the Frontdesk API. Please check your connection and try again.';
    }
    if (err.status === 401) {
      return err.error?.message || 'Invalid email or password.';
    }
    if (err.status >= 500) {
      return 'The Frontdesk server is temporarily unavailable (server or database error). Please try again shortly.';
    }
    if (err.status === 400) {
      return err.error?.errors?.[0]?.message || 'Please check the email and password format.';
    }
    return err.error?.message || 'Login failed. Please try again.';
  }

  quickLogin(email: string) {
    this.loginForm.patchValue({
      email,
      password: 'Password123!',
    });
    this.onSubmit();
  }
}

