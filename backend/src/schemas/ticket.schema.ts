import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Valid customer email is required'),
  customerPhone: z.string().optional().nullable(),
  customerCompany: z.string().optional().nullable(),
  priority: z.enum(['URGENT', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).optional(),
});

export const assignTicketSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID').optional(), // If omitted, defaults to authenticated user (claim)
});

export const reassignTicketSchema = z.object({
  targetAgentId: z.string().uuid('Target agent ID is required'),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(['URGENT', 'MEDIUM', 'LOW']),
  reason: z.string().min(3, 'Reason for priority change is required').optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']),
  resolutionSummary: z.string().min(5, 'Resolution summary is required when resolving').optional(),
  reason: z.string().optional(),
});

export const addReplySchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

export const addInternalNoteSchema = z.object({
  content: z.string().min(1, 'Internal note content is required'),
});

export const reopenTicketSchema = z.object({
  reason: z.string().min(5, 'Reason for reopening must be at least 5 characters'),
});

export const ticketQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedAgentId: z.string().optional(),
  isOverdue: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['createdAt', 'priority', 'status', 'responseDueAt', 'resolutionDueAt', 'ticketNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

