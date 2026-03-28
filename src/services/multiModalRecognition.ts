import { AppointmentAIService } from './appointmentAI';
import { prisma } from '../utils/prisma';

export interface RecognitionResult {
  success: boolean;
  data?: any;
  confidence: number;
  error?: string;
  type: 'screenshot' | 'sms' | 'email' | 'manual';
}

export class MultiModalRecognitionService {
  private appointmentAI: AppointmentAIService;

  constructor() {
    this.appointmentAI = new AppointmentAIService();
  }

  /**
   * 截图识别 - 从图片中提取预约信息
   */
  async recognizeFromScreenshot(imageBuffer: Buffer, userId: string): Promise<RecognitionResult> {
    try {
      // 这里可以集成OCR服务，如Tesseract.js或调用云OCR API
      // 为了演示，我们模拟OCR过程
      const ocrText = await this.performOCR(imageBuffer);
      
      if (!ocrText || ocrText.length < 10) {
        return {
          success: false,
          confidence: 0,
          error: '无法从图片中识别出有效文字',
          type: 'screenshot'
        };
      }

      // 使用AI服务提取预约信息
      const extractionResult = await this.appointmentAI.extractAppointmentInfo(ocrText, userId);
      
      return {
        success: extractionResult.success,
        data: extractionResult.appointment,
        confidence: extractionResult.confidence,
        error: extractionResult.error,
        type: 'screenshot'
      };
    } catch (error) {
      console.error('Screenshot recognition error:', error);
      return {
        success: false,
        confidence: 0,
        error: '截图识别失败',
        type: 'screenshot'
      };
    }
  }

  /**
   * 短信解析 - 从短信内容中提取预约信息
   */
  async recognizeFromSMS(smsContent: string, sender?: string, userId?: string): Promise<RecognitionResult> {
    try {
      // 预处理短信内容
      const processedContent = this.preprocessSMS(smsContent);
      
      // 使用AI服务提取预约信息
      const extractionResult = await this.appointmentAI.extractAppointmentInfo(processedContent, userId || 'system');
      
      return {
        success: extractionResult.success,
        data: extractionResult.appointment,
        confidence: extractionResult.confidence,
        error: extractionResult.error,
        type: 'sms'
      };
    } catch (error) {
      console.error('SMS recognition error:', error);
      return {
        success: false,
        confidence: 0,
        error: '短信解析失败',
        type: 'sms'
      };
    }
  }

  /**
   * 邮件解析 - 从邮件内容中提取预约信息
   */
  async recognizeFromEmail(
    emailData: {
      subject: string;
      body: string;
      from: string;
      date: Date;
    },
    userId: string
  ): Promise<RecognitionResult> {
    try {
      // 预处理邮件内容
      const processedContent = this.preprocessEmail(emailData);
      
      // 使用AI服务提取预约信息
      const extractionResult = await this.appointmentAI.extractAppointmentInfo(processedContent, userId);
      
      return {
        success: extractionResult.success,
        data: extractionResult.appointment,
        confidence: extractionResult.confidence,
        error: extractionResult.error,
        type: 'email'
      };
    } catch (error) {
      console.error('Email recognition error:', error);
      return {
        success: false,
        confidence: 0,
        error: '邮件解析失败',
        type: 'email'
      };
    }
  }

  /**
   * 手动输入处理 - 处理用户手动输入的预约信息
   */
  async recognizeFromManualInput(
    input: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
    },
    userId: string
  ): Promise<RecognitionResult> {
    try {
      // 构建文本输入
      const textInput = this.buildManualInputText(input);
      
      // 使用AI服务标准化和完善预约信息
      const extractionResult = await this.appointmentAI.extractAppointmentInfo(textInput, userId);
      
      return {
        success: extractionResult.success,
        data: extractionResult.appointment,
        confidence: extractionResult.confidence,
        error: extractionResult.error,
        type: 'manual'
      };
    } catch (error) {
      console.error('Manual input recognition error:', error);
      return {
        success: false,
        confidence: 0,
        error: '手动输入处理失败',
        type: 'manual'
      };
    }
  }

  /**
   * 批量识别 - 处理多条识别结果并自动创建预约
   */
  async batchRecognize(
    recognitions: RecognitionResult[],
    userId: string
  ): Promise<{
    success: number;
    failed: number;
    appointments: any[];
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      appointments: [],
      errors: []
    };

    for (const recognition of recognitions) {
      if (recognition.success && recognition.data) {
        try {
          // 检查冲突
          const conflictResult = await this.appointmentAI.detectConflicts(recognition.data, userId);
          
          // 保存预约
          const appointment = await prisma.appointment.create({
            data: {
              userId,
              title: recognition.data.title,
              description: recognition.data.description,
              startTime: recognition.data.startTime,
              endTime: recognition.data.endTime,
              location: recognition.data.location,
              priority: recognition.data.priority,
              aiSummary: recognition.data.aiSummary,
              aiKeywords: recognition.data.aiKeywords,
              aiConfidence: recognition.confidence,
              status: 'SCHEDULED' as any
            }
          });

          // 如果有冲突，创建提醒
          if (conflictResult.hasConflicts) {
            await this.createConflictReminders(appointment, conflictResult, userId);
          }

          results.success++;
          results.appointments.push(appointment);
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to create appointment: ${error}`);
        }
      } else {
        results.failed++;
        results.errors.push(recognition.error || 'Unknown error');
      }
    }

    return results;
  }

  /**
   * 智能识别路由 - 根据输入类型自动选择识别方法
   */
  async smartRecognize(
    input: {
      type: 'screenshot' | 'sms' | 'email' | 'manual';
      data: any;
    },
    userId: string
  ): Promise<RecognitionResult> {
    switch (input.type) {
      case 'screenshot':
        if (input.data instanceof Buffer) {
          return this.recognizeFromScreenshot(input.data, userId);
        }
        return {
          success: false,
          confidence: 0,
          error: 'Invalid screenshot data',
          type: 'screenshot'
        };

      case 'sms':
        return this.recognizeFromSMS(input.data.content || input.data, input.data.sender, userId);

      case 'email':
        return this.recognizeFromEmail(input.data, userId);

      case 'manual':
        return this.recognizeFromManualInput(input.data, userId);

      default:
        return {
          success: false,
          confidence: 0,
          error: 'Unsupported recognition type',
          type: input.type
        };
    }
  }

  // Helper methods

  private async performOCR(imageBuffer: Buffer): Promise<string> {
    // 这里应该集成真实的OCR服务
    // 演示用：模拟OCR过程
    return new Promise((resolve) => {
      // 模拟OCR识别的文字内容
      setTimeout(() => {
        resolve(`
          预约确认：牙科检查
          时间：2024年1月15日 下午2:00-3:00
          地点：市口腔医院三楼诊室
          医生：张医生
          请提前15分钟到达
        `);
      }, 1000);
    });
  }

  private preprocessSMS(smsContent: string): string {
    // 清理短信内容
    return smsContent
      .replace(/\s+/g, ' ') // 多个空格合并
      .replace(/[^\u4e00-\u9fa5\w\s\-:.,]/g, '') // 保留中英文、数字和基本标点
      .trim();
  }

  private preprocessEmail(emailData: { subject: string; body: string }): string {
    // 提取邮件中的关键信息
    const keyInfo = [
      `主题: ${emailData.subject}`,
      `发件人: ${emailData.from}`,
      `时间: ${emailData.date.toLocaleString('zh-CN')}`,
      '',
      '内容:',
      emailData.body.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
    ].join('\n');

    return keyInfo;
  }

  private buildManualInputText(input: any): string {
    const parts = [];
    if (input.title) parts.push(`标题: ${input.title}`);
    if (input.description) parts.push(`描述: ${input.description}`);
    if (input.startTime) parts.push(`开始时间: ${input.startTime}`);
    if (input.endTime) parts.push(`结束时间: ${input.endTime}`);
    if (input.location) parts.push(`地点: ${input.location}`);

    return parts.join('\n') || '手动输入的预约信息';
  }

  private async createConflictReminders(
    appointment: any,
    conflictResult: any,
    userId: string
  ) {
    try {
      for (const conflict of conflictResult.conflicts) {
        // 创建冲突提醒
        await prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            type: 'CUSTOM',
            time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后
            message: `检测到预约冲突: ${conflict.title}`,
            channel: 'PUSH',
            aiMessage: `您有预约冲突，请查看详情`
          }
        });
      }
    } catch (error) {
      console.error('Error creating conflict reminders:', error);
    }
  }
}