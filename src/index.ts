import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config';
import { authRouter } from './routes/auth';
import { paymentRouter } from './routes/payment';
import { webhookRouter } from './routes/webhook';
import { characterRouter } from './routes/characters';
import { chatRouter } from './routes/chat';
import './lib/passport'; // passport strategy registration (side-effect)

const app = express();

// Security + parsing
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: config.env,
    mockAi: config.mockAi,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', paymentRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/characters', characterRouter);
app.use('/api/v1/chat', chatRouter);

// Start server
app.listen(config.port, () => {
  console.log(
    `🚀 AI Hiểu Bạn API đang chạy tại http://localhost:${config.port} [${config.env}]`,
  );
  if (config.mockAi) {
    console.log('🤖 Mock AI đang bật — chat sẽ trả về tin nhắn mẫu');
  }
});

export default app;
