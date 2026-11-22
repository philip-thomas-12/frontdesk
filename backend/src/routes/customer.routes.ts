import { Router } from 'express';
import { getCustomerTicket, addCustomerReply, reopenCustomerTicket } from '../controllers/customer.controller';

const router = Router();

// Public customer portal routes (no agent JWT required, internal notes physically stripped)
router.get('/tickets/:id', getCustomerTicket);
router.post('/tickets/:id/reply', addCustomerReply);
router.post('/tickets/:id/reopen', reopenCustomerTicket);

export default router;

