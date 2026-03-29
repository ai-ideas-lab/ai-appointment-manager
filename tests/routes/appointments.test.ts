import request from 'supertest';
import { app } from '../../src/index';
import { prisma, createTestUser, createTestAppointment } from '../setup';

describe('Appointments API', () => {
  let testUser: any;
  let testToken: string;
  let testAppointment: any;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User'
    });

    // 创建测试预约
    testAppointment = await createTestAppointment({
      title: '测试预约',
      description: '这是一个测试预约',
      userId: testUser.id
    });

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'Password123!'
      });

    testToken = loginResponse.body.token;
  });

  describe('GET /api/appointments', () => {
    it('应该获取用户的预约列表', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);
      expect(response.body.appointments.length).toBeGreaterThan(0);
      
      const firstAppointment = response.body.appointments[0];
      expect(firstAppointment).toHaveProperty('id');
      expect(firstAppointment).toHaveProperty('title');
      expect(firstAppointment).toHaveProperty('startTime');
      expect(firstAppointment).toHaveProperty('endTime');
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/appointments?page=1&limit=5')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('应该支持按分类过滤', async () => {
      const response = await request(app)
        .get('/api/appointments?category=medical')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.appointments).toBeDefined();
    });

    it('应该支持按日期范围过滤', async () => {
      const response = await request(app)
        .get('/api/appointments?startDate=2026-03-01&endDate=2026-03-31')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.appointments).toBeDefined();
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app)
        .get('/api/appointments')
        .expect(401);
    });

    it('应该返回正确的字段', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const appointment = response.body.appointments[0];
      expect(appointment).toHaveProperty('id');
      expect(appointment).toHaveProperty('title');
      expect(appointment).toHaveProperty('description');
      expect(appointment).toHaveProperty('startTime');
      expect(appointment).toHaveProperty('endTime');
      expect(appointment).toHaveProperty('location');
      expect(appointment).toHaveProperty('priority');
      expect(appointment).toHaveProperty('category');
      expect(appointment).toHaveProperty('status');
      expect(appointment).toHaveProperty('createdAt');
      expect(appointment).toHaveProperty('updatedAt');
    });
  });

  describe('POST /api/appointments', () => {
    it('应该创建新的预约', async () => {
      const appointmentData = {
        title: '新预约',
        description: '这是一个新创建的预约',
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        location: '测试地点',
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('新预约');
      expect(response.body.description).toBe('这是一个新创建的预约');
      expect(response.body.startTime).toBe('2026-04-01T10:00:00Z');
      expect(response.body.endTime).toBe('2026-04-01T11:00:00Z');
      expect(response.body.location).toBe('测试地点');
      expect(response.body.priority).toBe('HIGH');
    });

    it('应该验证必需字段', async () => {
      const invalidData = {
        title: '',
        description: '缺少必需字段的预约',
        startTime: '2026-04-01T10:00:00Z'
        // 缺少endTime
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该验证时间格式', async () => {
      const invalidData = {
        title: '时间格式错误',
        description: '时间格式无效的预约',
        startTime: 'invalid-date',
        endTime: '2026-04-01T11:00:00Z'
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该验证时间逻辑', async () => {
      const invalidData = {
        title: '时间逻辑错误',
        description: '结束时间早于开始时间',
        startTime: '2026-04-01T11:00:00Z',
        endTime: '2026-04-01T10:00:00Z'
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该拒绝未认证的请求', async () => {
      const appointmentData = {
        title: '未认证的预约',
        description: '这个请求没有认证',
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z'
      };

      await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(401);
    });

    it('应该处理过期的预约时间', async () => {
      const pastDate = new Date('2026-03-01T10:00:00Z').toISOString();
      const pastEndTime = new Date('2026-03-01T11:00:00Z').toISOString();

      const appointmentData = {
        title: '过去的预约',
        description: '这是一个过去时间的预约',
        startTime: pastDate,
        endTime: pastEndTime
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.status).toBe('COMPLETED');
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('应该获取特定预约的详情', async () => {
      const response = await request(app)
        .get(`/api/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testAppointment.id);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
    });

    it('应该处理不存在的预约ID', async () => {
      const invalidId = 'non-existent-id';
      
      await request(app)
        .get(`/api/appointments/${invalidId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });

    it('应该拒绝访问其他用户的预约', async () => {
      // 创建另一个用户
      const otherUser = await createTestUser({
        email: 'other@example.com',
        name: 'Other User'
      });

      // 创建另一个用户的预约
      const otherAppointment = await createTestAppointment({
        userId: otherUser.id
      });

      // 尝试访问其他用户的预约
      await request(app)
        .get(`/api/appointments/${otherAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);
    });

    it('应该包含预约的分析信息', async () => {
      const response = await request(app)
        .get(`/api/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('category');
      expect(response.body.analysis).toHaveProperty('confidence');
      expect(response.body.analysis).toHaveProperty('suggestions');
    });
  });

  describe('PUT /api/appointments/:id', () => {
    it('应该更新预约信息', async () => {
      const updateData = {
        title: '更新后的预约标题',
        description: '更新后的预约描述',
        location: '更新后的地点'
      };

      const response = await request(app)
        .put(`/api/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe('更新后的预约标题');
      expect(response.body.description).toBe('更新后的预约描述');
      expect(response.body.location).toBe('更新后的地点');
    });

    it('应该验证更新数据', async () => {
      const invalidData = {
        title: '',
        startTime: 'invalid-date'
      };

      await request(app)
        .put(`/api/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该拒绝更新其他用户的预约', async () => {
      // 创建另一个用户
      const otherUser = await createTestUser({
        email: 'other@example.com',
        name: 'Other User'
      });

      // 创建另一个用户的预约
      const otherAppointment = await createTestAppointment({
        userId: otherUser.id
      });

      // 尝试更新其他用户的预约
      const updateData = {
        title: '恶意更新'
      };

      await request(app)
        .put(`/api/appointments/${otherAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(403);
    });

    it('应该处理不存在的预约ID', async () => {
      const invalidId = 'non-existent-id';
      
      await request(app)
        .put(`/api/appointments/${invalidId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ title: '更新' })
        .expect(404);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('应该删除预约', async () => {
      const response = await request(app)
        .delete(`/api/appointments/${testAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('预约删除成功');

      // 验证预约已被删除
      const deletedAppointment = await prisma.appointment.findUnique({
        where: { id: testAppointment.id }
      });
      expect(deletedAppointment).toBeNull();
    });

    it('应该拒绝删除其他用户的预约', async () => {
      // 创建另一个用户
      const otherUser = await createTestUser({
        email: 'other@example.com',
        name: 'Other User'
      });

      // 创建另一个用户的预约
      const otherAppointment = await createTestAppointment({
        userId: otherUser.id
      });

      // 尝试删除其他用户的预约
      await request(app)
        .delete(`/api/appointments/${otherAppointment.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);
    });

    it('应该处理不存在的预约ID', async () => {
      const invalidId = 'non-existent-id';
      
      await request(app)
        .delete(`/api/appointments/${invalidId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('POST /api/appointments/:id/analyze', () => {
    it('应该分析预约', async () => {
      const response = await request(app)
        .post(`/api/appointments/${testAppointment.id}/analyze`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('category');
      expect(response.body.analysis).toHaveProperty('confidence');
      expect(response.body.analysis).toHaveProperty('suggestions');
      expect(response.body.analysis).toHaveProperty('riskFactors');
    });

    it('应该处理无效的预约ID', async () => {
      const invalidId = 'non-existent-id';
      
      await request(app)
        .post(`/api/appointments/${invalidId}/analyze`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('POST /api/appointments/recognize', () => {
    it('应该处理多模态识别', async () => {
      const recognitionData = {
        type: 'screenshot',
        data: 'mock-screenshot-data'
      };

      const response = await request(app)
        .post('/api/appointments/recognize')
        .set('Authorization', `Bearer ${testToken}`)
        .send(recognitionData)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('type');
      expect(response.body.result).toHaveProperty('extractedData');
      expect(response.body.result).toHaveProperty('confidenceScore');
    });

    it('应该验证识别数据', async () => {
      const invalidData = {
        type: 'invalid-type',
        data: 'invalid-data'
      };

      await request(app)
        .post('/api/appointments/recognize')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/appointments/batch-recognize', () => {
    it('应该批量处理识别请求', async () => {
      const batchData = [
        {
          type: 'screenshot',
          data: 'mock-screenshot-1'
        },
        {
          type: 'sms',
          data: {
            content: '【医院】预约确认：3月30日下午2点',
            sender: 'hospital'
          }
        }
      ];

      const response = await request(app)
        .post('/api/appointments/batch-recognize')
        .set('Authorization', `Bearer ${testToken}`)
        .send(batchData)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(2);
    });

    it('应该处理批量中的错误', async () => {
      const batchData = [
        {
          type: 'screenshot',
          data: 'mock-screenshot-1'
        },
        {
          type: 'invalid-type',
          data: 'invalid-data'
        }
      ];

      const response = await request(app)
        .post('/api/appointments/batch-recognize')
        .set('Authorization', `Bearer ${testToken}`)
        .send(batchData)
        .expect(200);

      expect(response.body.results).toHaveLength(2);
      // 至少有一个成功的结果
      expect(response.body.results.some((r: any) => r.extractedData)).toBe(true);
    });
  });

  describe('POST /api/appointments/:id/reschedule-message', () => {
    it('应该生成改期话术', async () => {
      const rescheduleData = {
        newTime: '2026-04-01T16:00:00Z',
        reason: '时间调整'
      };

      const response = await request(app)
        .post(`/api/appointments/${testAppointment.id}/reschedule-message`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(rescheduleData)
        .expect(200);

      expect(response.body).toHaveProperty('originalTime');
      expect(response.body).toHaveProperty('newTime');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('抱歉');
      expect(response.body.message).toContain('改期');
    });

    it('应该验证改期数据', async () => {
      const invalidData = {
        newTime: 'invalid-date',
        reason: ''
      };

      await request(app)
        .post(`/api/appointments/${testAppointment.id}/reschedule-message`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该处理不存在的预约ID', async () => {
      const invalidId = 'non-existent-id';
      
      await request(app)
        .post(`/api/appointments/${invalidId}/reschedule-message`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          newTime: '2026-04-01T16:00:00Z',
          reason: '时间调整'
        })
        .expect(404);
    });
  });

  describe('冲突检测', () => {
    it('应该检测时间冲突', async () => {
      // 创建一个冲突的预约
      const conflictData = {
        title: '冲突预约',
        description: '与现有预约时间冲突',
        startTime: '2026-03-30T14:00:00Z',
        endTime: '2026-03-30T15:00:00Z'
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(conflictData)
        .expect(400); // 应该返回冲突错误
    });

    it('应该忽略低优先级预约的冲突', async () => {
      // 创建高优先级预约
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: '高优先级预约',
          description: '重要会议',
          startTime: '2026-03-30T10:00:00Z',
          endTime: '2026-03-30T11:00:00Z',
          priority: 'HIGH'
        })
        .expect(201);

      // 创建低优先级预约（应该允许）
      const lowPriorityData = {
        title: '低优先级预约',
        description: '不重要的会议',
        startTime: '2026-03-30T10:30:00Z',
        endTime: '2026-03-30T11:30:00Z',
        priority: 'LOW'
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${testToken}`)
        .send(lowPriorityData)
        .expect(201);
    });
  });

  describe('统计信息', () => {
    it('应该获取预约统计', async () => {
      const response = await request(app)
        .get('/api/appointments/analytics/overview')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAppointments');
      expect(response.body).toHaveProperty('categoryDistribution');
      expect(response.body).toHaveProperty('priorityDistribution');
      expect(response.body).toHaveProperty('upcomingAppointments');
      expect(response.body).toHaveProperty('completionRate');
    });

    it('应该获取分类统计', async () => {
      const response = await request(app)
        .get('/api/appointments/analytics/categories')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('应该获取时间模式统计', async () => {
      const response = await request(app)
        .get('/api/appointments/analytics/time-patterns')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dailyPatterns');
      expect(response.body).toHaveProperty('weeklyPatterns');
      expect(response.body).toHaveProperty('monthlyPatterns');
    });
  });
});