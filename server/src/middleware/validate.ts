import { Request, Response, NextFunction } from 'express';

export function validateAddPatient(req: Request, res: Response, next: NextFunction) {
  const { name, age, consultationType, priority } = req.body;
  const errors: string[] = [];

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    errors.push('Name is required');
  }
  if (!age || typeof age !== 'number' || age < 0 || age > 150) {
    errors.push('Valid age (0-150) is required');
  }
  const validTypes = ['general', 'specialist', 'followup', 'emergency'];
  if (!consultationType || !validTypes.includes(consultationType)) {
    errors.push(`consultationType must be one of: ${validTypes.join(', ')}`);
  }
  const validPriorities = ['emergency', 'senior', 'normal'];
  if (!priority || !validPriorities.includes(priority)) {
    errors.push(`priority must be one of: ${validPriorities.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
}
