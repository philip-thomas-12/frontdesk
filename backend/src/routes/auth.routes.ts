import { Router } from 'express';
import { login, getCurrentUser, listAgents } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validator.middleware';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getCurrentUser);
router.get('/agents', authenticate, listAgents);

export default router;

