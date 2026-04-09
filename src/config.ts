import dotenv from 'dotenv';
import path from 'path';

// Load env files in priority order:
// 1. .env.{NODE_ENV} (if APP_ENV or NODE_ENV set)
// 2. .env (always loaded as fallback)
const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const envFile = `.env.${appEnv}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  sepay: {
    env: (process.env.SEPAY_ENV || 'sandbox') as 'sandbox' | 'production',
    merchantId: process.env.SEPAY_MERCHANT_ID || '',
    secretKey: process.env.SEPAY_SECRET_KEY || '',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/aihieuban',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3001/api/v1/auth/google/callback',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '7d' as const,
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  mockAi: process.env.MOCK_AI !== 'false',

  chatService: {
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:5001',
    secret: process.env.CHAT_SERVICE_SECRET || 'dev-service-secret-change-me',
  },

  imageService: {
    url: process.env.IMAGE_SERVICE_URL || 'http://localhost:5002',
    secret: process.env.IMAGE_SERVICE_SECRET || 'dev-service-secret-change-me',
  },
};
