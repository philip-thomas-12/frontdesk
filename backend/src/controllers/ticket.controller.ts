import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import ticketService from '../services/ticket.service';

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const actor = req.user ? { id: req.user.userId, name: req.user.name, role: req.user.role } : undefined;
    const ticket = await ticketService.createTicket({
      ...req.body,
      creatorId: actor?.id,
      creatorName: actor?.name,
      creatorRole: actor?.role,
    });

    res.status(201).json({
      success: true,
      message: `Ticket #${ticket.ticketNumber} created successfully.`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function listTickets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketService.listTickets(req.query as any);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const ticket = await ticketService.getTicketById(id, true);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket '${id}' was not found.`,
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function claimTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actor = { id: req.user!.userId, name: req.user!.name, role: req.user!.role };
    const targetAgentId = req.body.agentId || req.user!.userId;

    const ticket = await ticketService.claimOrAssignTicket(id, targetAgentId, actor);

    res.status(200).json({
      success: true,
      message: `Ticket successfully claimed by ${actor.name}.`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function reassignTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actor = { id: req.user!.userId, name: req.user!.name, role: req.user!.role };
    const { targetAgentId } = req.body;

    const ticket = await ticketService.reassignTicket(id, targetAgentId, actor);

    res.status(200).json({
      success: true,
      message: 'Ticket successfully reassigned.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePriority(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actor = { id: req.user!.userId, name: req.user!.name, role: req.user!.role };
    const { priority, reason } = req.body;

    const ticket = await ticketService.updatePriority(id, priority, reason, actor);

    res.status(200).json({
      success: true,
      message: `Ticket priority changed to ${priority}. SLA deadlines recalculated.`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actor = { id: req.user!.userId, name: req.user!.name, role: req.user!.role };
    const { status, resolutionSummary, reason } = req.body;

    const ticket = await ticketService.updateStatus(id, status, {
      resolutionSummary,
      reason,
      actor,
    });

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function reopenTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actor = { id: req.user!.userId, name: req.user!.name, role: req.user!.role };
    const { reason } = req.body;

    const ticket = await ticketService.reopenTicket(id, reason, actor);

    res.status(200).json({
      success: true,
      message: 'Ticket successfully reopened.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function addPublicReply(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const message = await ticketService.addPublicReply(id, content, {
      id: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
    });

    res.status(201).json({
      success: true,
      message: 'Public reply added successfully.',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

export async function addInternalNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const note = await ticketService.addInternalNote(id, content, {
      id: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
    });

    res.status(201).json({
      success: true,
      message: 'Internal note saved securely.',
      data: note,
    });
  } catch (error) {
    next(error);
  }
}

