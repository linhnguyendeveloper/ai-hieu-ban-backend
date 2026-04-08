import { Router } from 'express';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { getSepayClient } from '../services/sepay';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const paymentRouter = Router();

const PREMIUM_PRICE = 2000; // VND — placeholder, update later

// Create SePay checkout for Premium upgrade
paymentRouter.post('/checkout', authMiddleware, async (req: AuthRequest, res) => {
  const user = req.appUser!;

  if (user.tier === 'PREMIUM') {
    res.status(400).json({ error: 'Bạn đã là thành viên Premium' });
    return;
  }

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostUrl = config.frontendUrl;

  try {
    const sepayClient = getSepayClient();
    const checkoutFields = sepayClient.checkout.initOneTimePaymentFields({
      payment_method: 'BANK_TRANSFER',
      order_amount: PREMIUM_PRICE,
      currency: 'VND',
      order_description: `Nâng cấp Premium - AI Hiểu Bạn`,
      order_invoice_number: invoiceNumber,
      customer_id: user.id,
      success_url: `${hostUrl}/goi-dich-vu?payment=success`,
      error_url: `${hostUrl}/goi-dich-vu?payment=error`,
      cancel_url: `${hostUrl}/goi-dich-vu?payment=cancel`,
    });

    await prisma.order.create({
      data: {
        invoiceNumber,
        userId: user.id,
        tier: 'PREMIUM',
        amount: PREMIUM_PRICE,
        status: 'PENDING',
      },
    });

    res.json({
      url: sepayClient.checkout.initCheckoutUrl(),
      fields: checkoutFields,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Lỗi tạo thanh toán' });
  }
});

// Get user's payment history
paymentRouter.get('/orders', authMiddleware, async (req: AuthRequest, res) => {
  const user = req.appUser!;
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

// DEV ONLY — simulate payment to upgrade tier
paymentRouter.post('/simulate-payment', async (req, res) => {
  if (!config.isDev) {
    res.status(403).json({ error: 'Chỉ dùng trong môi trường phát triển' });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'Thiếu userId' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { tier: 'PREMIUM' },
  });

  res.json({ success: true, tier: user.tier });
});
