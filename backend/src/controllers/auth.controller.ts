import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Email or password does not match.',
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Email or password does not match.',
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Never expose password hash in response
    const { passwordHash, ...safeUser } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAgents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'AGENT'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    next(error);
  }
}

export async function reseedDatabase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { resetAndSeedDemoTickets } = await import('../utils/startupSeed');
    const result = await resetAndSeedDemoTickets();
    res.status(200).json({
      success: true,
      message: 'Database tickets successfully reset to pristine demo state.',
      ticketCount: result.ticketCount,
    });
  } catch (error) {
    next(error);
  }
}

