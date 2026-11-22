import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats, Ticket, TicketFilters, TicketMessage, InternalNote } from '../../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:5001/api';

  constructor(private http: HttpClient) {}

  // Dashboard Statistics
  public getDashboardStats(): Observable<{ success: boolean; data: DashboardStats }> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${this.baseUrl}/dashboard/stats`);
  }

  // Tickets
  public getTickets(filters: TicketFilters = {}): Observable<{
    success: boolean;
    tickets: Ticket[];
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
  }> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const val = (filters as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val.toString());
      }
    });

    return this.http.get<any>(`${this.baseUrl}/tickets`, { params });
  }

  public getTicketById(id: string): Observable<{ success: boolean; ticket: Ticket }> {
    return this.http.get<{ success: boolean; ticket: Ticket }>(`${this.baseUrl}/tickets/${id}`);
  }

  public createTicket(payload: {
    title: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerCompany?: string;
    priority: string;
  }): Observable<{ success: boolean; ticket: Ticket; message: string }> {
    return this.http.post<any>(`${this.baseUrl}/tickets`, payload);
  }

  // Assignment & Concurrency
  public claimTicket(id: string, agentId?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${id}/claim`, { agentId });
  }

  public reassignTicket(id: string, targetAgentId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${id}/reassign`, { targetAgentId });
  }

  // Priority & Status
  public updatePriority(id: string, priority: string, reason?: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/tickets/${id}/priority`, { priority, reason });
  }

  public updateStatus(
    id: string,
    status: string,
    options: { resolutionSummary?: string; reason?: string } = {}
  ): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/tickets/${id}/status`, { status, ...options });
  }

  public reopenTicket(id: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${id}/reopen`, { reason });
  }

  // Public Reply vs Internal Note (INC-0304)
  public addPublicReply(id: string, content: string): Observable<{ success: boolean; data: TicketMessage }> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${id}/replies`, { content });
  }

  public addInternalNote(id: string, content: string): Observable<{ success: boolean; data: InternalNote }> {
    return this.http.post<any>(`${this.baseUrl}/tickets/${id}/notes`, { content });
  }

  // Dedicated Customer Portal (Verification of zero leakage)
  public getCustomerTicket(id: string): Observable<{ success: boolean; ticket: Ticket }> {
    return this.http.get<{ success: boolean; ticket: Ticket }>(`${this.baseUrl}/customer/tickets/${id}`);
  }

  public addCustomerReply(id: string, payload: { content: string; customerName: string; customerEmail: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customer/tickets/${id}/reply`, payload);
  }
}
