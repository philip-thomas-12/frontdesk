import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../../models/ticket.model';
import { environment } from '../../../environments/environment';

export const DEMO_USERS = [
  { name: 'Meera Patel', email: 'meera@arvo.com', role: 'Support Lead (Admin)' },
  { name: 'Alice Chen', email: 'alice@arvo.com', role: 'Support Agent' },
  { name: 'Bob Miller', email: 'bob@arvo.com', role: 'Support Agent' },
  { name: 'Charlie Davis', email: 'charlie@arvo.com', role: 'Support Agent' },
  { name: 'David Kumar', email: 'david@arvo.com', role: 'Support Agent' },
  { name: 'Elena Rostova', email: 'elena@arvo.com', role: 'Support Agent' },
  { name: 'Farhan Ahmed', email: 'farhan@arvo.com', role: 'Support Agent' },
  { name: 'Grace Hopper', email: 'grace@arvo.com', role: 'Support Agent' },
  { name: 'Henry Clark', email: 'henry@arvo.com', role: 'Support Agent' },
];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  private loadStoredUser() {
    const token = localStorage.getItem('frontdesk_token');
    const userStr = localStorage.getItem('frontdesk_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch {
        this.logout();
      }
    }
  }

  public login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.success && res.token && res.user) {
          localStorage.setItem('frontdesk_token', res.token);
          localStorage.setItem('frontdesk_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  public logout() {
    localStorage.removeItem('frontdesk_token');
    localStorage.removeItem('frontdesk_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  public getToken(): string | null {
    return localStorage.getItem('frontdesk_token');
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public getAgents(): Observable<{ success: boolean; agents: User[] }> {
    return this.http.get<{ success: boolean; agents: User[] }>(`${this.apiUrl}/agents`);
  }
}

