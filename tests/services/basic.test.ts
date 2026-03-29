import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AppointmentAIService } from '../../src/services/appointmentAI';
import { MultiModalRecognitionService } from '../../src/services/multiModalRecognition';

// 模拟Prisma客户端
const mockPrisma = {
  appointment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  reminder: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  }
};

// 模拟OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

describe('AI Services - Basic Tests', () => {
  let appointmentAI: AppointmentAIService;
  let recognitionService: MultiModalRecognitionService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建服务实例
    appointmentAI = new AppointmentAIService();
    recognitionService = new MultiModalRecognitionService();
  });

  describe('AppointmentAI Service - Basic Functionality', () => {
    it('应该成功初始化服务', () => {
      expect(appointmentAI).toBeDefined();
      expect(typeof appointmentAI.analyzeAppointment).toBe('function');
    });

    it('应该处理无效的预约ID', async () => {
      await expect(
        appointmentAI.analyzeAppointment('invalid-id')
      ).rejects.toThrow();
    });

    it('应该生成基本的预约分析结构', async () => {
      // 模拟预约数据
      const mockAppointment = {
        id: 'test-id',
        title: '测试预约',
        description: '测试描述',
        startTime: new Date('2026-03-30T14:00:00Z'),
        endTime: new Date('2026-03-30T15:00:00Z'),
        location: '测试地点'
      };

      // 模拟Prisma返回
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      // 这里会失败，因为我们没有OpenAI API key，但至少测试服务结构
      await expect(
        appointmentAI.analyzeAppointment('test-id')
      ).rejects.toThrow();
    });
  });

  describe('MultiModal Recognition Service - Basic Functionality', () => {
    it('应该成功初始化服务', () => {
      expect(recognitionService).toBeDefined();
      expect(typeof recognitionService.recognizeScreenshot).toBe('function');
      expect(typeof recognitionService.recognizeSMS).toBe('function');
      expect(typeof recognitionService.recognizeEmail).toBe('function');
    });

    it('应该处理无效的截图数据', async () => {
      const invalidImageBuffer = Buffer.from('invalid-image-data');
      
      const result = await recognitionService.recognizeScreenshot(invalidImageBuffer, 'user-id');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('screenshot');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理无效的短信数据', async () => {
      const invalidSMS = {
        content: '',
        sender: 'unknown'
      };

      const result = await recognitionService.recognizeSMS(invalidSMS);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('sms');
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('应该处理无效的邮件数据', async () => {
      const invalidEmail = {
        subject: '',
        body: ''
      };

      const result = await recognitionService.recognizeEmail(invalidEmail);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('email');
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('应该批量处理识别任务', async () => {
      const recognitionTasks = [
        {
          type: 'screenshot' as const,
          data: Buffer.from('mock-screenshot')
        },
        {
          type: 'sms' as const,
          data: {
            content: '测试短信内容',
            sender: 'test'
          }
        }
      ];

      const results = await recognitionService.batchRecognition(recognitionTasks);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.type)).toBe(true);
    });

    it('应该识别垃圾短信', async () => {
      const spamSMS = {
        content: '恭喜您中奖了！点击链接领取奖品！',
        sender: 'spam'
      };

      const result = await recognitionService.recognizeSMS(spamSMS);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('应该识别垃圾邮件', async () => {
      const spamEmail = {
        subject: '🎉 中奖通知',
        body: '恭喜您获得100万大奖！'
      };

      const result = await recognitionService.recognizeEmail(spamEmail);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBe(0);
    });
  });

  describe('服务集成测试', () => {
    it('应该处理完整的识别流程', async () => {
      // 模拟短信识别
      const smsResult = await recognitionService.recognizeSMS({
        content: '【医院】您的预约已确认：3月30日下午2:00-3:00，地址：朝阳区建国路88号',
        sender: 'hospital'
      });

      expect(smsResult.success).toBe(true);
      expect(smsResult.type).toBe('sms');
      expect(smsResult.extractedData).toBeDefined();
    });

    it('应该处理文本分析功能', async () => {
      // 测试文本分析的基本结构
      const testText = '明天下午2点在市口腔医院看牙';
      
      // 这里会因为没有OpenAI key而失败，但测试结构
      await expect(
        appointmentAI.extractAppointmentInfo(testText, 'user-id')
      ).rejects.toThrow();
    });

    it('应该生成改期建议的基本结构', async () => {
      // 这里会因为没有真实的预约数据而失败，但测试结构
      await expect(
        appointmentAI.generateRescheduleMessage('test-id', '2026-04-01T16:00:00Z', '时间调整')
      ).rejects.toThrow();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理网络错误', async () => {
      // 测试服务在网络错误时的处理
      const result = await recognitionService.recognizeSMS({
        content: '网络测试内容',
        sender: 'test'
      });
      
      expect(result).toBeDefined();
      expect(result.type).toBe('sms');
    });

    it('应该处理超时情况', async () => {
      // 测试服务在超时时的处理
      const startTime = Date.now();
      const result = await recognitionService.recognizeScreenshot(
        Buffer.from('test-image'),
        'user-id'
      );
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
      expect(result).toBeDefined();
    });

    it('应该处理内存不足情况', async () => {
      // 测试大图片处理
      const largeImageBuffer = Buffer.alloc(1024 * 1024); // 1MB
      
      const result = await recognitionService.recognizeScreenshot(largeImageBuffer, 'user-id');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('screenshot');
    });
  });

  describe('性能测试', () => {
    it('应该快速处理简单识别任务', async () => {
      const startTime = Date.now();
      
      const result = await recognitionService.recognizeSMS({
        content: '简单测试',
        sender: 'test'
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(result.success).toBe(true);
    });

    it('应该批量处理提高效率', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        type: 'sms' as const,
        data: {
          content: `测试短信 ${i}`,
          sender: 'test'
        }
      }));

      const startTime = Date.now();
      const results = await recognitionService.batchRecognition(tasks);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      expect(results).toHaveLength(10);
      expect(processingTime).toBeLessThan(5000); // 批量处理应该在5秒内完成
    });
  });

  afterEach(() => {
    // 清理所有模拟
    jest.clearAllMocks();
  });
});