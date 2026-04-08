import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  tier: 'FREE' | 'PREMIUM';
  messagesUsedToday: number;
  lastMessageReset: Date;
}

export interface AuthRequest extends Request {
  appUser?: AppUser;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Vui lòng đăng nhập' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ error: 'Người dùng không tồn tại' });
      return;
    }

    // Reset daily message counter if new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(user.lastMessageReset) < today) {
      await prisma.user.update({
        where: { id: user.id },
        data: { messagesUsedToday: 0, lastMessageReset: new Date() },
      });
      user.messagesUsedToday = 0;
    }

    req.appUser = user as unknown as AppUser;
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

/**
 * Optional auth — sets req.appUser if token present, continues regardless.
 * Used for guest-accessible routes like chat.
 */
export const optionalAuthMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(user.lastMessageReset) < today) {
        await prisma.user.update({
          where: { id: user.id },
          data: { messagesUsedToday: 0, lastMessageReset: new Date() },
        });
        user.messagesUsedToday = 0;
      }
      req.appUser = user as unknown as AppUser;
    }
  } catch {
    // Invalid token — treat as guest
  }

  next();
};
