import { Request, Response, NextFunction } from 'express';
import ticketService from '../services/ticket.service';

/**
 * Dedicated Customer Portal Controller (Incident INC-0304)
 * Guarantees zero leakage of internal notes or internal audit logs.
 */
export async function getCustomerTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const ticket = await ticketService.getTicketById(id, false); // includeInternalNotes: false!

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket '${id}' not found.`,
      });
    }

    // Physical filter: remove any remaining private internal fields
    const customerSafeTicket = ticketService.serializePublicTicket(ticket);

    res.status(200).json({
      success: true,
      ticket: customerSafeTicket,
    });
  } catch (error) {
    next(error);
  }
}

export async function addCustomerReply(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { content, customerName, customerEmail } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const message = await ticketService.addPublicReply(id, content, {
      id: null,
      name: customerName || 'Customer',
      email: customerEmail || null,
      role: 'CUSTOMER',
    });

    res.status(201).json({
      success: true,
      message: 'Reply submitted successfully.',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

export async function reopenCustomerTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, customerName } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'A reason of at least 5 characters is required.' });
    }

    const ticket = await ticketService.reopenTicket(id, reason, {
      id: 'customer',
      name: customerName || 'Customer',
      role: 'CUSTOMER',
    });

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully.',
      ticket: ticketService.serializePublicTicket(ticket),
    });
  } catch (error) {
    next(error);
  }
}

