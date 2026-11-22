import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import dashboardService from '../services/dashboard.service';

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const agentId = req.user?.userId;
    const stats = await dashboardService.getDashboardStats(agentId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

