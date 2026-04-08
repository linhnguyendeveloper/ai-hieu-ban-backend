import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// Redirect to Google OAuth consent screen
authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

// Google OAuth callback — create JWT, set cookie, redirect to frontend
authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.frontendUrl}/dang-nhap?error=true`,
  }),
  (req, res) => {
    const user = req.user as { id: string; email: string };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: config.isDev ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${config.frontendUrl}/?login=success`);
  },
);

// Get current authenticated user
authRouter.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const user = req.appUser!;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    tier: user.tier,
    messagesUsedToday: user.messagesUsedToday,
  });
});

// Logout — clear token cookie
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: config.isDev ? 'lax' : 'none',
  });
  res.json({ success: true });
});
