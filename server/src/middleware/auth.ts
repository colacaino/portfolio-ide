import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type AuthPayload = {
  userId: number;
  username: string;
  isAdmin: boolean;
};

export type AuthedRequest = Request & { user?: AuthPayload };

export const verifyToken = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET no configurado' });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }
  return next();
};
