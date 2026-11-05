import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'invox_enterprise_bea_secure_jwt_secret_key_2026';

export interface AuthTokenPayload {
  userId: string;
  businessId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function generateToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    businessId: user.businessId,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}
