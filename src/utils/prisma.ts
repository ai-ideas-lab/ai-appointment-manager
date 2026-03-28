import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 测试数据库连接
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
});

export { prisma, testConnection };