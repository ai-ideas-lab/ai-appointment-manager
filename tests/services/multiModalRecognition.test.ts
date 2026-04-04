import { MultiModalRecognitionService } from '../../src/services/multiModalRecognition';

const multiModalRecognition = new MultiModalRecognitionService();
import { createTestAppointment } from '../setup';

describe('MultiModal Recognition Service', () => {
  describe('recognizeScreenshot', () => {
    it('应该处理截图识别请求', async () => {
      // 模拟截图数据 (base64编码的测试图片)
      const mockScreenshotData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const result = await multiModalRecognition.recognizeScreenshot(mockScreenshotData);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('screenshot');
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.extractedData).toBeDefined();
    });

    it('应该从截图中提取预约信息', async () => {
      const mockScreenshotData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const result = await multiModalRecognition.recognizeScreenshot(mockScreenshotData);
      
      // 验证提取的字段
      expect(result.extractedData).toBeDefined();
      expect(result.extractedData.date).toBeDefined();
      expect(result.extractedData.time).toBeDefined();
      expect(result.extractedData.location).toBeDefined();
      expect(result.extractedData.title).toBeDefined();
      
      // 验证置信度评估
      expect(result.confidenceScore).toBeDefined();
      expect(result.confidenceScore >= 0 && result.confidenceScore <= 1).toBe(true);
    });

    it('应该处理低置信度的截图', async () => {
      // 模糊的截图数据
      const blurryScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const result = await multiModalRecognition.recognizeScreenshot(blurryScreenshot);
      
      // 低置信度结果
      if (result.confidenceScore < 0.6) {
        expect(result.requiresConfirmation).toBe(true);
        expect(result.suggestions).toBeDefined();
        expect(Array.isArray(result.suggestions)).toBe(true);
      }
    });

    it('应该拒绝无效的图片数据', async () => {
      const invalidData = 'invalid-image-data';
      
      await expect(
        multiModalRecognition.recognizeScreenshot(invalidData)
      ).rejects.toThrow('Invalid image data');
    });
  });

  describe('recognizeSMS', () => {
    it('应该解析医院预约短信', async () => {
      const mockSMS = {
        content: '【市口腔医院】您的预约已确认：3月30日下午2:00-3:00，地址：朝阳区建国路88号，请提前15分钟到达。',
        sender: 'hospital',
        timestamp: new Date().toISOString()
      };

      const result = await multiModalRecognition.recognizeSMS(mockSMS);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('sms');
      expect(result.extractedData.title).toBe('市口腔医院');
      expect(result.extractedData.date).toBe('3月30日');
      expect(result.extractedData.time).toBe('下午2:00-3:00');
      expect(result.extractedData.location).toBe('朝阳区建国路88号');
    });

    it('应该解析餐厅预订短信', async () => {
      const mockSMS = {
        content: '【海底捞】您的预订已确认：今晚7:00-8:30，4人桌，预订号1234，地址：朝阳区三里屯太古里。',
        sender: 'restaurant',
        timestamp: new Date().toISOString()
      };

      const result = await multiModalRecognition.recognizeSMS(mockSMS);
      
      expect(result.extractedData.title).toBe('海底捞');
      expect(result.extractedData.time).toBe('晚上7:00-8:30');
      expect(result.extractedData.partySize).toBe('4人');
    });

    it('应该处理模糊的短信内容', async () => {
      const ambiguousSMS = {
        content: '【某机构】您的预约已确认，具体时间地点短信已发送，请查收。',
        sender: 'unknown',
        timestamp: new Date().toISOString()
      };

      const result = await multiModalRecognition.recognizeSMS(ambiguousSMS);
      
      expect(result.confidenceScore).toBeLessThan(0.6);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.extractedData).toEqual({});
    });

    it('应该拒绝垃圾短信', async () => {
      const spamSMS = {
        content: '恭喜您中奖了！点击链接领取奖品！',
        sender: 'spam',
        timestamp: new Date().toISOString()
      };

      const result = await multiModalRecognition.recognizeSMS(spamSMS);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidenceScore).toBe(0);
    });
  });

  describe('recognizeEmail', () => {
    it('应该解析预约确认邮件', async () => {
      const mockEmail = {
        from: 'booking@hospital.com',
        subject: '预约确认 - 市口腔医院',
        body: `
          尊敬的患者，您的预约已确认：
          预约时间：2026年3月30日 14:00-15:00
          医生：张医生
          科室：口腔科
          地址：朝阳区建国路88号
          请携带身份证和医保卡
        `,
        attachments: []
      };

      const result = await multiModalRecognition.recognizeEmail(mockEmail);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('email');
      expect(result.extractedData.title).toBe('市口腔医院');
      expect(result.extractedData.date).toBe('2026年3月30日');
      expect(result.extractedData.time).toBe('14:00-15:00');
      expect(result.extractedData.doctor).toBe('张医生');
    });

    it('应该处理带有附件的邮件', async () => {
      const mockEmailWithAttachment = {
        from: 'event@company.com',
        subject: '会议邀请 - 产品规划',
        body: '请参加明天下午2点的产品规划会议',
        attachments: [
          {
            filename: 'meeting.ics',
            content: 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:20260330T140000Z\nDTEND:20260330T150000Z\nSUMMARY:产品规划会议\nLOCATION:会议室A\nEND:VEVENT\nEND:VCALENDAR'
          }
        ]
      };

      const result = await multiModalRecognition.recognizeEmail(mockEmailWithAttachment);
      
      expect(result.extractedData.title).toBe('产品规划会议');
      expect(result.extractedData.location).toBe('会议室A');
      expect(result.extractedData.date).toBe('2026-03-30');
      expect(result.extractedData.time).toBe('14:00-15:00');
    });

    it('应该拒绝垃圾邮件', async () => {
      const spamEmail = {
        from: 'spam@example.com',
        subject: '🎉 中奖通知',
        body: '恭喜您获得100万大奖！',
        attachments: []
      };

      const result = await multiModalRecognition.recognizeEmail(spamEmail);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidenceScore).toBe(0);
    });
  });

  describe('batchRecognition', () => {
    it('应该批量处理多种类型的识别请求', async () => {
      const recognitionTasks = [
        {
          type: 'screenshot',
          data: 'mock-screenshot-data'
        },
        {
          type: 'sms',
          data: {
            content: '【医院】预约确认：3月30日下午2点',
            sender: 'hospital'
          }
        },
        {
          type: 'email',
          data: {
            from: 'clinic@example.com',
            subject: '预约确认',
            body: '预约时间：2026-03-30 14:00'
          }
        }
      ];

      const results = await multiModalRecognition.batchRecognition(recognitionTasks);
      
      expect(results).toHaveLength(3);
      expect(results.every((r: RecognitionResult) => r.type)).toBe(true);
      
      // 验证不同类型的识别结果
      const screenshotResults = results.filter((r: RecognitionResult) => r.type === 'screenshot');
      const smsResults = results.filter((r: RecognitionResult) => r.type === 'sms');
      const emailResults = results.filter((r: RecognitionResult) => r.type === 'email');
      
      expect(screenshotResults.length).toBe(1);
      expect(smsResults.length).toBe(1);
      expect(emailResults.length).toBe(1);
    });

    it('应该处理批量中的失败任务', async () => {
      const mixedTasks = [
        {
          type: 'screenshot',
          data: 'valid-screenshot'
        },
        {
          type: 'sms',
          data: 'invalid-sms-data'
        },
        {
          type: 'email',
          data: 'invalid-email-data'
        }
      ];

      const results = await multiModalRecognition.batchRecognition(mixedTasks);
      
      // 应该至少有一个成功的识别
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.type || r.error)).toBe(true);
    });

    it('应该提供批量处理的统计信息', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) => ({
        type: i % 2 === 0 ? 'screenshot' : 'sms',
        data: i % 2 === 0 ? `screenshot-${i}` : { content: `sms-${i}`, sender: 'test' }
      }));

      const results = await multiModalRecognition.batchRecognition(tasks);
      
      expect(results).toHaveLength(5);
      
      // 验证结果统计
      const successful = results.filter(r => r.confidenceScore > 0);
      const failed = results.filter(r => r.error);
      
      expect(successful.length + failed.length).toBe(5);
    });
  });

  describe('confidenceScoring', () => {
    it('应该为不同类型的识别计算合理的置信度分数', async () => {
      // 高质量截图
      const highQualityScreenshot = 'mock-high-quality-data';
      const screenshotResult = await multiModalRecognition.recognizeScreenshot(highQualityScreenshot);
      
      expect(screenshotResult.confidenceScore > 0.7).toBe(true);

      // 清晰的短信
      const clearSMS = {
        content: '【医院】预约确认：2026-03-30 14:00-15:00，医生：张医生',
        sender: 'hospital'
      };
      const smsResult = await multiModalRecognition.recognizeSMS(clearSMS);
      
      expect(smsResult.confidenceScore > 0.8).toBe(true);

      // 模糊的短信
      const ambiguousSMS = {
        content: '明天的会议，时间地点待定',
        sender: 'unknown'
      };
      const ambiguousResult = await multiModalRecognition.recognizeSMS(ambiguousSMS);
      
      expect(ambiguousResult.confidenceScore < 0.5).toBe(true);
    });

    it('应该根据数据质量调整置信度', async () => {
      // 模拟高质量数据
      const highConfidenceData = {
        content: '【明确信息】3月30日下午2:00-3:00，朝阳区建国路88号，市口腔医院',
        sender: 'hospital'
      };
      
      const result = await multiModalRecognition.recognizeSMS(highConfidenceData);
      
      expect(result.confidenceScore > 0.9).toBe(true);
      expect(result.dataQuality).toBe('high');
    });
  });
});