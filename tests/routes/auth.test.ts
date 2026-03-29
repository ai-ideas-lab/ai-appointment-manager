import request from 'supertest';
import { app } from '../../src/index';
import { prisma, createTestUser } from '../setup';

describe('Auth API', () => {
  let testUser: any;
  let testToken: string;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User',
      password: 'hashedPassword123'
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
    });

    it('应该拒绝重复注册', async () => {
      const userData = {
        email: 'testuser@example.com',
        name: 'Duplicate User',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
    });

    it('应该验证密码强度', async () => {
      const weakPasswordData = {
        email: 'weak@example.com',
        name: 'Weak User',
        password: '123',
        confirmPassword: '123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);
    });

    it('应该验证邮箱格式', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        name: 'Invalid User',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);
    });

    it('应该验证密码确认匹配', async () => {
      const mismatchData = {
        email: 'mismatch@example.com',
        name: 'Mismatch User',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(mismatchData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('testuser@example.com');
      
      // 保存token供后续测试使用
      testToken = response.body.token;
    });

    it('应该拒绝错误的密码', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('应该验证邮箱格式', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Password123!'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该获取当前用户信息', async () => {
      // 先登录获取token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body.name).toBe('Test User');
    });

    it('应该拒绝没有token的请求', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('应该拒绝无效的token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('应该拒绝过期token', async () => {
      // 这里可以添加过期token的测试
      // 实际实现中需要生成一个过期的JWT
    });
  });

  describe('POST /api/auth/logout', () => {
    it('应该成功登出', async () => {
      // 先登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('登出成功');
    });

    it('应该允许未登录用户访问登出', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('应该成功刷新token', async () => {
      // 先登录获取token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(token);
    });

    it('应该拒绝没有refresh token的请求', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .expect(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('应该更新用户信息', async () => {
      // 先登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const updateData = {
        name: 'Updated Name',
        phone: '13800138000'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.phone).toBe('13800138000');
    });

    it('应该验证更新数据', async () => {
      // 先登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const invalidData = {
        name: '', // 空名称
        email: 'invalid-email' // 无效邮箱
      };

      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);
    });

    it('应该拒绝未认证的更新请求', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/auth/delete', () => {
    it('应该成功删除用户账户', async () => {
      // 先登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .delete('/api/auth/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('账户删除成功');

      // 验证用户已被删除
      const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(deletedUser).toBeNull();
    });

    it('应该拒绝未认证的删除请求', async () => {
      await request(app)
        .delete('/api/auth/delete')
        .expect(401);
    });

    it('应该验证密码确认', async () => {
      // 先登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.token;

      const deleteRequest = {
        password: 'wrong-password'
      };

      await request(app)
        .delete('/api/auth/delete')
        .set('Authorization', `Bearer ${token}`)
        .send(deleteRequest)
        .expect(400);
    });
  });

  describe('安全测试', () => {
    it('应该防止SQL注入', async () => {
      const maliciousData = {
        email: "test' OR '1'='1",
        name: 'Malicious User',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('应该防止XSS攻击', async () => {
      const xssData = {
        email: 'test@example.com',
        name: '<script>alert("xss")</script>',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(xssData)
        .expect(201);

      // 验证XSS内容被清理
      expect(response.body.user.name).not.toContain('<script>');
    });

    it('应该实现速率限制', async () => {
      // 多次尝试注册相同邮箱（模拟暴力破解）
      const userData = {
        email: 'rate@example.com',
        name: 'Rate Test',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      // 第一次应该成功
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // 后续请求应该被阻止
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(429);
      }
    });
  });
});