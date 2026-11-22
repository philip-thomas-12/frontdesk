import { Router } from 'express';
import {
  createTicket,
  listTickets,
  getTicketDetail,
  claimTicket,
  reassignTicket,
  updatePriority,
  updateStatus,
  reopenTicket,
  addPublicReply,
  addInternalNote,
} from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validator.middleware';
import {
  createTicketSchema,
  assignTicketSchema,
  reassignTicketSchema,
  updatePrioritySchema,
  updateStatusSchema,
  reopenTicketSchema,
  addReplySchema,
  addInternalNoteSchema,
  ticketQuerySchema,
} from '../schemas/ticket.schema';

const router = Router();

// All ticket agent routes require authentication
router.use(authenticate);

router.post('/', validateBody(createTicketSchema), createTicket);
router.get('/', validateQuery(ticketQuerySchema), listTickets);
router.get('/:id', getTicketDetail);
router.post('/:id/claim', validateBody(assignTicketSchema), claimTicket);
router.post('/:id/reassign', validateBody(reassignTicketSchema), reassignTicket);
router.patch('/:id/priority', validateBody(updatePrioritySchema), updatePriority);
router.patch('/:id/status', validateBody(updateStatusSchema), updateStatus);
router.post('/:id/reopen', validateBody(reopenTicketSchema), reopenTicket);
router.post('/:id/replies', validateBody(addReplySchema), addPublicReply);
router.post('/:id/notes', validateBody(addInternalNoteSchema), addInternalNote);

export default router;

