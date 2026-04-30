import Redis from 'ioredis';
import { config } from './index';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Error de conexión:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis conectado');
});
