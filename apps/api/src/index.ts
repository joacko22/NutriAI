import 'dotenv/config';
import { createApp } from './app';
import { config }    from './config';
import { prisma }    from './config/prisma';
import { redis }     from './config/redis';

async function main() {
  // Verificar conexión a PostgreSQL
  await prisma.$connect();
  console.log('✅ PostgreSQL conectado');

  // Verificar conexión a Redis (lazy)
  await redis.connect();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`\n🚀 NutriAI API corriendo en http://localhost:${config.port}`);
    console.log(`❤️  Health:    http://localhost:${config.port}/health`);
    console.log(`🔐 Auth:      http://localhost:${config.port}/api/v1/auth`);
    console.log(`👤 Profile:   http://localhost:${config.port}/api/v1/profile`);
    console.log(`💬 Chat:      http://localhost:${config.port}/api/v1/chat`);
    console.log(`📊 Records:   http://localhost:${config.port}/api/v1/records`);
    console.log(`📋 Plans:     http://localhost:${config.port}/api/v1/plans`);
    console.log(`🌍 Entorno:   ${config.nodeEnv}`);
    console.log(`🌐 CORS:      ${config.clientUrl}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('⏳ Cerrando servidor...');
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('❌ Error al iniciar la API:', err);
  process.exit(1);
});
