import { Router, Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { config } from '../config';

export const webhookRouter = Router();

// SePay webhook IP whitelist (SePay's known IPs)
const SEPAY_ALLOWED_IPS = [
  '103.163.216.0/22', // SePay production range
  '127.0.0.1',        // localhost (dev)
  '::1',              // localhost IPv6 (dev)
];

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || '';
}

function isAllowedIp(ip: string): boolean {
  if (config.isDev) return true; // skip IP check in dev
  return SEPAY_ALLOWED_IPS.some((allowed) => ip === allowed || ip.startsWith(allowed.split('/')[0].slice(0, -1)));
}

// Verify SePay signature using HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (config.isDev && !signature) return true; // skip in dev if no signature
  if (!config.sepay.secretKey || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.sepay.secretKey)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// SePay IPN handler — always return 200 to prevent retries
webhookRouter.post('/sepay', async (req, res) => {
  const clientIp = getClientIp(req);
  const data = req.body;
  console.log('[SePay IPN] Received from IP:', clientIp);

  // IP validation
  if (!isAllowedIp(clientIp)) {
    console.error(`[SePay IPN] Blocked request from unauthorized IP: ${clientIp}`);
    res.status(200).json({ success: true }); // Still 200 to not reveal info
    return;
  }

  // Signature validation (if SePay sends one)
  const signature = req.headers['x-sepay-signature'] as string || '';
  if (!config.isDev && signature) {
    const rawBody = JSON.stringify(data);
    if (!verifySignature(rawBody, signature)) {
      console.error('[SePay IPN] Invalid signature');
      res.status(200).json({ success: true });
      return;
    }
  }

  try {
    const notificationType = data.notification_type;

    if (notificationType === 'ORDER_PAID' || notificationType === 'PAYMENT_SUCCESS') {
      const invoiceNumber = data.order?.order_invoice_number;

      if (!invoiceNumber) {
        console.error('[SePay IPN] Missing invoice number');
        res.status(200).json({ success: true });
        return;
      }

      // Idempotency check: only process if order exists and not already PAID
      const order = await prisma.order.findUnique({
        where: { invoiceNumber },
      });

      if (!order) {
        console.error(`[SePay IPN] Order not found: ${invoiceNumber}`);
        res.status(200).json({ success: true });
        return;
      }

      if (order.status === 'PAID') {
        console.log(`[SePay IPN] Order ${invoiceNumber} already paid, skipping`);
        res.status(200).json({ success: true });
        return;
      }

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

      console.log(`[SePay IPN] Order ${invoiceNumber} paid. User ${order.userId} → PREMIUM`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[SePay IPN] Processing error:', err);
    res.status(200).json({ success: true }); // Always 200
  }
});
