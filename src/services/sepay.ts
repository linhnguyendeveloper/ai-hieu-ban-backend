import { SePayPgClient } from 'sepay-pg-node';
import { config } from '../config';

let _client: SePayPgClient | null = null;

export function getSepayClient(): SePayPgClient {
  if (!_client) {
    if (!config.sepay.merchantId || !config.sepay.secretKey) {
      throw new Error(
        'SePay chưa cấu hình: thiếu SEPAY_MERCHANT_ID hoặc SEPAY_SECRET_KEY',
      );
    }
    _client = new SePayPgClient({
      env: config.sepay.env,
      merchant_id: config.sepay.merchantId,
      secret_key: config.sepay.secretKey,
    });
  }
  return _client;
}
