import OpenAI from 'openai';
import { Appointment } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class AppointmentAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 从文本中提取预约信息
   */
  async extractAppointmentInfo(text: string, userId: string) {
    try {
      const prompt = `
        You are an expert appointment information extractor. Extract structured appointment information from the following text.
        
        Text: "${text}"
        
        Return JSON with the following structure:
        {
          "title": "Appointment title",
          "description": "Brief description of the appointment",
          "startTime": "ISO date string for start time",
          "endTime": "ISO date string for end time (if not specified, calculate based on duration)",
          "location": "Location of the appointment",
          "priority": "LOW, MEDIUM, HIGH, or URGENT",
          "aiSummary": "Brief AI-generated summary",
          "aiKeywords": ["relevant", "keywords"],
          "aiConfidence": 0.0-1.0,
          "notes": "Additional notes or uncertainties"
        }
        
        If any field cannot be determined, set it to null or empty string.
        For time, use the current timezone: ${new Date().toLocaleTimeString('zh-CN', { timeZoneName: 'short' })}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const extractedData = JSON.parse(response.choices[0].message.content);

      // 创建预约记录
      const appointment = await prisma.appointment.create({
        data: {
          userId,
          title: extractedData.title || 'Unknown Appointment',
          description: extractedData.description || '',
          startTime: new Date(extractedData.startTime),
          endTime: extractedData.endTime ? new Date(extractedData.endTime) : new Date(extractedData.startTime.getTime() + 60 * 60 * 1000), // Default 1 hour duration
          location: extractedData.location || '',
          priority: extractedData.priority || Priority.MEDIUM,
          aiSummary: extractedData.aiSummary,
          aiKeywords: extractedData.aiKeywords || [],
          aiConfidence: extractedData.aiConfidence || 0.8,
        },
      });

      return {
        success: true,
        appointment,
        confidence: extractedData.aiConfidence,
        notes: extractedData.notes,
      };
    } catch (error) {
      console.error('Error extracting appointment info:', error);
      return {
        success: false,
        error: 'Failed to extract appointment information',
        confidence: 0,
      };
    }
  }

  /**
   * 识别预约冲突
   */
  async detectConflicts(appointment: Appointment, userId: string) {
    try {
      // 查找同一时间段的其他预约
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          userId,
          OR: [
            {
              AND: [
                { startTime: { lte: appointment.endTime } },
                { endTime: { gte: appointment.startTime } },
              ]
            }
          ],
          NOT: {
            id: appointment.id // 排除当前正在检查的预约
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
          }
        }
      });

      // 分析冲突类型
      const conflictAnalysis = await this.analyzeConflicts(appointment, conflictingAppointments);
      
      return {
        hasConflicts: conflictingAppointments.length > 0,
        conflicts: conflictingAppointments,
        analysis: conflictAnalysis,
        suggestions: await this.generateConflictSuggestions(appointment, conflictingAppointments)
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return {
        hasConflicts: false,
        conflicts: [],
        analysis: 'Error analyzing conflicts',
        suggestions: []
      };
    }
  }

  /**
   * 分析冲突详情
   */
  private async analyzeConflicts(appointment: Appointment, conflicts: Appointment[]) {
    const analysis = {
      timeConflicts: 0,
      locationConflicts: 0,
      priorityConflicts: 0,
      suggestions: [] as string[]
    };

    conflicts.forEach(conflict => {
      // 时间冲突检测
      if (this.isTimeConflict(appointment, conflict)) {
        analysis.timeConflicts++;
      }
      
      // 地点冲突检测（如果两个预约都有地点信息）
      if (appointment.location && conflict.location && appointment.location === conflict.location) {
        analysis.locationConflicts++;
      }
      
      // 优先级冲突检测
      if (appointment.priority === Priority.URGENT && conflict.priority !== Priority.URGENT) {
        analysis.priorityConflicts++;
      }
    });

    return analysis;
  }

  /**
   * 生成冲突解决建议
   */
  private async generateConflictSuggestions(appointment: Appointment, conflicts: Appointment[]) {
    const suggestions = [];
    
    if (conflicts.length > 0) {
      // 生成重新建议的时间
      const alternativeTimes = this.suggestAlternativeTimes(appointment, conflicts);
      
      if (alternativeTimes.length > 0) {
        suggestions.push({
          type: 'reschedule',
          message: `建议在以下时间重新安排: ${alternativeTimes.join(', ')}`,
          alternatives: alternativeTimes
        });
      }
      
      // 生成取消建议
      const lowPriorityConflicts = conflicts.filter(c => c.priority === Priority.LOW);
      if (lowPriorityConflicts.length > 0) {
        suggestions.push({
          type: 'cancel',
          message: `可以取消低优先级预约: ${lowPriorityConflicts.map(c => c.title).join(', ')}`,
          targets: lowPriorityConflicts.map(c => c.id)
        });
      }
      
      // 提醒服务
      if (appointment.priority === Priority.HIGH || appointment.priority === Priority.URGENT) {
        suggestions.push({
          type: 'reminder',
          message: '建议设置提前提醒，避免错过重要预约',
          reminderTime: this.calculateReminderTime(appointment)
        });
      }
    }

    return suggestions;
  }

  /**
   * 生成智能提醒内容
   */
  async generateReminder(appointment: Appointment, tone: 'formal' | 'casual' | 'friendly' | 'urgent' = 'friendly') {
    try {
      const prompt = `
        Generate a ${tone} reminder message for this appointment:
        
        Title: ${appointment.title}
        Time: ${appointment.startTime.toLocaleString('zh-CN')}
        Location: ${appointment.location || 'To be determined'}
        
        The reminder should be:
        - ${tone} in tone
        - 2-3 sentences
        - Include essential details
        - Encouraging and helpful
        
        Return only the reminder message as a string.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating reminder:', error);
      return `您有一个预约: ${appointment.title} 在 ${appointment.startTime.toLocaleString('zh-CN')}`;
    }
  }

  /**
   * 生成改约话术
   */
  async generateRescheduleMessage(
    originalAppointment: Appointment,
    newTime: Date,
    reason?: string
  ) {
    try {
      const prompt = `
        Generate a polite and professional message to reschedule an appointment.
        
        Original Appointment:
        - Title: ${originalAppointment.title}
        - Original Time: ${originalAppointment.startTime.toLocaleString('zh-CN')}
        
        New Time: ${newTime.toLocaleString('zh-CN')}
        
        Reason: ${reason || '需要调整时间'}
        
        The message should be:
        - Polite and professional
        - Brief and to the point
        - Include necessary details
        - Appropriate for business/personal use
        
        Return only the message as a string.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating reschedule message:', error);
      return `您好，我想将我的预约 "${originalAppointment.title}" 时间从 ${originalAppointment.startTime.toLocaleString('zh-CN')} 调整到 ${newTime.toLocaleString('zh-CN')}，谢谢！`;
    }
  }

  // Helper methods
  private isTimeConflict(appointment1: Appointment, appointment2: Appointment): boolean {
    return (
      appointment1.startTime < appointment2.endTime &&
      appointment1.endTime > appointment2.startTime
    );
  }

  private suggestAlternativeTimes(appointment: Appointment, conflicts: Appointment[]): string[] {
    // 简单的替代时间建议逻辑
    const alternatives = [];
    const baseDate = appointment.startTime;
    
    // 建议前1天
    alternatives.push(new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toLocaleString('zh-CN'));
    
    // 建议后1天
    alternatives.push(new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toLocaleString('zh-CN'));
    
    // 建议当天前2小时
    alternatives.push(new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toLocaleString('zh-CN'));
    
    // 建议当天后2小时
    alternatives.push(new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toLocaleString('zh-CN'));
    
    return alternatives.slice(0, 3); // 返回前3个建议
  }

  private calculateReminderTime(appointment: Date): Date {
    // 根据预约重要性和类型计算提醒时间
    const now = new Date();
    const timeUntilAppointment = appointment.getTime() - now.getTime();
    const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);
    
    if (hoursUntilAppointment > 24) {
      return new Date(appointment.getTime() - 12 * 60 * 60 * 1000); // 提前12小时
    } else if (hoursUntilAppointment > 6) {
      return new Date(appointment.getTime() - 3 * 60 * 60 * 1000); // 提前3小时
    } else {
      return new Date(appointment.getTime() - 1 * 60 * 60 * 1000); // 提前1小时
    }
  }
}