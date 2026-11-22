import { PrismaClient } from '@prisma/client';
import prisma from '../config/db';

export interface AuditLogPayload {
  ticketId: string;
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  eventType: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: any;
}

export class AuditService {
  /**
   * Record an immutable audit log entry.
   * Can be executed inside an existing Prisma transaction or standalone.
   */
  public async logEvent(payload: AuditLogPayload, tx: any = prisma): Promise<void> {
    await tx.ticketAuditLog.create({
      data: {
        ticketId: payload.ticketId,
        actorId: payload.actorId || null,
        actorName: payload.actorName,
        actorRole: payload.actorRole,
        eventType: payload.eventType,
        oldValue: payload.oldValue || null,
        newValue: payload.newValue || null,
        metadata: payload.metadata || undefined,
        createdAt: new Date(),
      },
    });
  }
}

export default new AuditService();

