/**
 * CORS設定ミドルウェア
 */

import cors from 'cors';
import { env } from '../config/environment';

/**
 * CORS設定オプション
 */
export const corsOptions: cors.CorsOptions = {
  origin: env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // 本番環境では特定のドメインのみ
    : '*', // 開発環境では全許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24時間
};

export default cors(corsOptions);
