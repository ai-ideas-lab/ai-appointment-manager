import { appointmentAI } from '../../src/services/appointmentAI';
import { prisma, createTestAppointment } from '../setup';

describe('AppointmentAI Service', () => {
  let testAppointment: any;

  beforeEach(async () => {
    // 创建测试预约数据
    testAppointment = await createTestAppointment({
      title: '牙科检查',
      description: '定期牙齿检查和洗牙',
      startTime: new Date('2026-03-30T14:00:00Z'),
      endTime: new Date('2026-03-30T15:00:00Z'),
      location: '市口腔医院',
      priority: 'HIGH'
    });
  });

  describe('analyzeAppointment', () => {
    it('应该成功分析预约信息', async () => {
      // 模拟AI分析
      const analysis = await appointmentAI.analyzeAppointment(testAppointment.id);
      
      expect(analysis).toBeDefined();
      expect(analysis.category).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
      expect(analysis.recommendedReminders).toBeDefined();
      expect(analysis.riskFactors).toBeDefined();
      expect(analysis.suggestions).toBeDefined();
    });

    it('应该正确识别医疗预约类别', async () => {
      const medicalAppointment = await createTestAppointment({
        title: '医院体检',
        description: '年度健康体检',
        location: '市人民医院'
      });

      const analysis = await appointmentAI.analyzeAppointment(medicalAppointment.id);
      
      expect(analysis.category).toBe('MEDICAL');
      expect(analysis.riskFactors).toContain('提前到达时间要求');
    });

    it('应该正确识别社交预约类别', async () => {
      const socialAppointment = await createTestAppointment({
        title: '朋友聚餐',
        description: '与大学同学聚餐',
        location: '海底捞火锅店'
      });

      const analysis = await appointmentAI.analyzeAppointment(socialAppointment.id);
      
      expect(analysis.category).toBe('SOCIAL');
      expect(analysis.suggestions).toContain('提前确认时间地点');
    });

    it('应该为高优先级预约生成更密集的提醒', async () => {
      const highPriorityAppointment = await createTestAppointment({
        title: '重要面试',
        description: '技术面试',
        priority: 'HIGH'
      });

      const analysis = await appointmentAI.analyzeAppointment(highPriorityAppointment.id);
      
      expect(analysis.recommendedReminders).toContain('3天前');
      expect(analysis.recommendedReminders).toContain('1天前');
      expect(analysis.recommendedReminders).toContain('2小时前');
    });

    it('应该处理冲突检测', async () => {
      // 创建重叠的预约
      const conflictingAppointment = await createTestAppointment({
        title: '冲突会议',
        description: '与牙科检查时间冲突',
        startTime: new Date('2026-03-30T13:30:00Z'),
        endTime: new Date('2026-03-30T14:30:00Z'),
        priority: 'HIGH'
      });

      const analysis = await appointmentAI.analyzeAppointment(testAppointment.id);
      
      expect(analysis.conflictRisk).toBe(true);
      expect(analysis.conflictDetails).toBeDefined();
      expect(analysis.conflictDetails?.overlappingAppointment).toBe(conflictingAppointment.id);
    });

    it('应该生成合理的改期建议', async () => {
      const rescheduleMessage = await appointmentAI.generateRescheduleMessage(
        testAppointment.id,
        '2026-03-31T16:00:00Z',
        '时间调整'
      );

      expect(rescheduleMessage).toBeDefined();
      expect(rescheduleMessage.originalTime).toContain('2026-03-30T14:00:00Z');
      expect(rescheduleMessage.newTime).toContain('2026-03-31T16:00:00Z');
      expect(rescheduleMessage.message).toContain('抱歉');
      expect(rescheduleMessage.message).toContain('改期');
    });

    it('应该处理无效预约ID', async () => {
      await expect(
        appointmentAI.analyzeAppointment('invalid-id')
      ).rejects.toThrow();
    });

    it('应该为预约生成个性化建议', async () => {
      const analysis = await appointmentAI.analyzeAppointment(testAppointment.id);
      
      expect(analysis.personalizedSuggestions).toBeDefined();
      expect(Array.isArray(analysis.personalizedSuggestions)).toBe(true);
      
      // 验证建议内容
      const hasValidSuggestions = analysis.personalizedSuggestions.some(
        (suggestion: string) => suggestion.length > 10
      );
      expect(hasValidSuggestions).toBe(true);
    });

    it('应该计算交通时间建议', async () => {
      const farAppointment = await createTestAppointment({
        title: '远郊会议',
        description: '在郊区的客户会议',
        location: '远郊商务中心'
      });

      const analysis = await appointmentAI.analyzeAppointment(farAppointment.id);
      
      expect(analysis.travelTimeEstimate).toBeDefined();
      expect(analysis.departureSuggestion).toBeDefined();
      expect(typeof analysis.travelTimeEstimate).toBe('number');
      expect(analysis.departureSuggestion).toContain('建议');
    });
  });

  describe('batchAnalyzeAppointments', () => {
    it('应该批量分析多个预约', async () => {
      const appointments = [
        await createTestAppointment({ title: '会议A' }),
        await createTestAppointment({ title: '会议B' }),
        await createTestAppointment({ title: '会议C' })
      ];

      const analyses = await appointmentAI.batchAnalyzeAppointments(
        appointments.map(a => a.id)
      );

      expect(analyses).toHaveLength(3);
      expect(analyses.every(a => a.category)).toBe(true);
    });

    it('应该处理批量分析中的无效ID', async () => {
      const validAppointment = await createTestAppointment({ title: '有效会议' });
      
      const mixedIds = [
        validAppointment.id,
        'invalid-id-1',
        'invalid-id-2'
      ];

      const analyses = await appointmentAI.batchAnalyzeAppointments(mixedIds);
      
      // 有效预约应该有分析结果
      const validAnalysis = analyses.find(a => a.appointmentId === validAppointment.id);
      expect(validAnalysis).toBeDefined();
      
      // 应该过滤掉无效的预约
      expect(analyses).toHaveLength(1);
    });
  });

  describe('getAppointmentInsights', () => {
    it('应该生成预约洞察报告', async () => {
      const insights = await appointmentAI.getAppointmentInsights(testAppointment.id);
      
      expect(insights).toBeDefined();
      expect(insights.appointmentTrends).toBeDefined();
      expect(insights.categoryDistribution).toBeDefined();
      expect(insights.timePatterns).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it('应该包含历史趋势分析', async () => {
      const insights = await appointmentAI.getAppointmentInsights(testAppointment.id);
      
      expect(insights.appointmentTrends).toBeDefined();
      expect(insights.appointmentTrends.weekly).toBeDefined();
      expect(insights.appointmentTrends.monthly).toBeDefined();
    });
  });
});