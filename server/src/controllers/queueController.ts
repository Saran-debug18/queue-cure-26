import { Request, Response } from 'express';
import { queueService } from '../services/QueueService';

export const getQueueState = (_req: Request, res: Response) => {
  res.json({ success: true, data: queueService.getFullState() });
};

export const getAnalytics = (_req: Request, res: Response) => {
  res.json({ success: true, data: queueService.getAnalytics() });
};

export const getActivityLog = (_req: Request, res: Response) => {
  res.json({ success: true, data: queueService.getActivityLog() });
};
