export type Role = 'ADMIN' | 'AGENT';
export type Priority = 'URGENT' | 'MEDIUM' | 'LOW';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type SenderType = 'AGENT' | 'CUSTOMER' | 'SYSTEM';
export type MessageType = 'PUBLIC_REPLY' | 'INTERNAL_NOTE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  sender?: User;
  senderType: SenderType;
  senderName: string;
  senderEmail?: string;
  content: string;
  type: MessageType;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  ticketId: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface TicketAssignment {
  id: string;
  ticketId: string;
  agentId: string;
  agent: User;
  assignedAt: string;
  releasedAt?: string;
}

export interface TicketAuditLog {
  id: string;
  ticketId: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  eventType: string;
  oldValue?: string;
  newValue?: string;
  metadata?: any;
  createdAt: string;
}

export interface SLAMetrics {
  isOverdue: boolean;
  isResponseOverdue: boolean;
  isResolutionOverdue: boolean;
  status: 'ON_TRACK' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'SUPPRESSED_NON_WORKING_TIME';
  reason?: string;
  remainingResponseMinutes: number;
  remainingResolutionMinutes: number;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  formattedId: string;
  title: string;
  description: string;
  customerId: string;
  customer: Customer;
  assignedAgentId?: string;
  assignedAgent?: User;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  responseDueAt?: string;
  resolutionDueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  waitingSince?: string;
  reopenedAt?: string;
  reopenCount: number;
  version: number;
  sla: SLAMetrics;
  messages?: TicketMessage[];
  internalNotes?: InternalNote[];
  assignments?: TicketAssignment[];
  auditLogs?: TicketAuditLog[];
  _count?: {
    messages: number;
    internalNotes: number;
  };
}

export interface DashboardStats {
  summary: {
    total: number;
    open: number;
    inProgress: number;
    waitingForCustomer: number;
    resolved: number;
    closed: number;
    overdue: number;
    myAssigned: number;
  };
  priorityBreakdown: {
    urgent: number;
    medium: number;
    low: number;
  };
  serverTime: string;
  businessHoursActive: boolean;
}

export interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  isOverdue?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
