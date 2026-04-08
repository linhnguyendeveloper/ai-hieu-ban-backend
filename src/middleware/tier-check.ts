import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

const FREE_MESSAGE_LIMIT = 10;

export const tierCheckMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const user = req.appUser;

  if (!user) {
    res.status(401).json({ error: 'Vui lòng đăng nhập' });
    return;
  }

  if (user.tier === 'FREE' && user.messagesUsedToday >= FREE_MESSAGE_LIMIT) {
    res.status(429).json({
      error: 'Bạn đã hết tin nhắn miễn phí hôm nay',
      limit: FREE_MESSAGE_LIMIT,
      used: user.messagesUsedToday,
      upgradeUrl: '/goi-dich-vu',
    });
    return;
  }

  next();
};
