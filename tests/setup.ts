import { PrismaClient } from '@prisma/client';

// 创建测试专用的Prisma客户端
const prisma = new PrismaClient();

// 测试数据库连接
beforeAll(async () => {
  // 等待数据库连接就绪
  await prisma.$connect();
});

// 测试完成后清理数据库
afterAll(async () => {
  // 清理所有测试数据
  await cleanupTestData();
  
  // 断开数据库连接
  await prisma.$disconnect();
});

// 清理测试数据的辅助函数
async function cleanupTestData() {
  try {
    // 清理测试用户
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test@example.com'
        }
      }
    });
    
    // 清理测试预约
    await prisma.appointment.deleteMany({
      where: {
        title: {
          contains: 'Test Appointment'
        }
      }
    });
    
    // 清理提醒
    await prisma.reminder.deleteMany({
      where: {
        message: {
          contains: 'Test Reminder'
        }
      }
    });
    
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

// 导出prisma客户端供测试使用
export { prisma };

// 创建测试数据工厂函数
export const createTestUser = async (userData = {}) => {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword123',
      ...userData
    }
  });
};

export const createTestAppointment = async (appointmentData = {}) => {
  return prisma.appointment.create({
    data: {
      title: 'Test Appointment',
      description: 'This is a test appointment',
      startTime: new Date('2026-03-30T10:00:00Z'),
      endTime: new Date('2026-03-30T11:00:00Z'),
      location: 'Test Location',
      priority: 'MEDIUM',
      ...appointmentData
    }
  });
};

export const createTestReminder = async (reminderData = {}) => {
  return prisma.reminder.create({
    data: {
      title: 'Test Reminder',
      message: 'This is a test reminder',
      reminderTime: new Date('2026-03-29T09:00:00Z'),
      type: 'EMAIL',
      isActive: true,
      ...reminderData
    }
  });
};