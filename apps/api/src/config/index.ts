import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(__dirname, '..', '..', '.env') });

export const config = {
  port:    parseInt(process.env.PORT ?? '3001'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES  ?? '15m',
    refreshExpires:process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },

  google: {
    clientId:    process.env.GOOGLE_CLIENT_ID    ?? '',
    clientSecret:process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL  ?? '',
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY ?? '',
    groqKey:   process.env.GROQ_API_KEY   ?? '',
  },
};
