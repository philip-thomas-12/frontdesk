import { Router } from 'express';
import { login, getCurrentUser, listAgents, reseedDatabase } from '../controllers/auth.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validator.middleware';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getCurrentUser);
router.get('/agents', authenticate, listAgents);
router.post('/reseed', authenticate, authorizeRole('ADMIN'), reseedDatabase);

export default router;

