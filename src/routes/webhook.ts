import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const webhookRouter = Router();

// SePay IPN handler — always return 200 to prevent retries
webhookRouter.post('/sepay', async (req, res) => {
  const data = req.body;
  console.log('[SePay IPN]', JSON.stringify(data));

  try {
    const notificationType = data.notification_type;

    if (notificationType === 'ORDER_PAID' || notificationType === 'PAYMENT_SUCCESS') {
      const invoiceNumber = data.order?.order_invoice_number;

      if (!invoiceNumber) {
        console.error('[SePay IPN] Missing invoice number');
        res.status(200).json({ success: true });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { invoiceNumber },
      });

      if (order && order.status !== 'PAID') {
        // Update order status + store raw IPN data
        await prisma.order.update({
          where: { invoiceNumber },
          data: { status: 'PAID', sepayData: data },
        });

        // Upgrade user tier
        await prisma.user.update({
          where: { id: order.userId },
          data: { tier: 'PREMIUM' },
        });

        console.log(`[SePay IPN] User ${order.userId} upgraded to PREMIUM`);
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[SePay IPN] Processing error:', err);
    res.status(200).json({ success: true }); // Always 200
  }
});
