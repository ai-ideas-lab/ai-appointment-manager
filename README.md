# AI Appointment Manager

> **一句话卖点**：健忘族在收到预约确认时，用 AI 预约管家截图识别，从错过重要预约损失 ¥200+ 到提前3天自动提醒，再也不怕预约撞车

一个AI驱动的多模态预约管理系统，帮助用户管理日程、接收智能提醒，防止遗忘重要预约。

## 🎯 核心功能

### 多模态智能识别
- **截图识别**：拍照/截图自动提取预约信息（时间、地点、服务内容）
- **短信解析**：Android 自动识别预约确认短信；iOS 手动转发
- **邮件解析**：读取预约确认邮件（IMAP 授权）
- **置信度分层**：高置信度自动录入，低置信度人工确认

### 统一时间线视图
- 所有预约在一个时间线上展示
- 分类视图：医疗 / 生活服务 / 社交 / 个人成长
- 心理时间感：今天 / 明天 / 本周 / 未来

### 智能提醒系统
- 多级提醒：提前 3 天 / 1 天 / 2 小时
- 动态调整：根据预约类型调整提醒时间
- 个性化学习：根据用户历史行为优化提醒时机

### 冲突检测与预警
- 时间重叠检测
- 地理位置分析（交通时间评估）
- 准备时间建议（就诊需要提前到）
- 身体状态考虑（牙医和按摩排太近可能不是好主意）

### 一键改约助手
- 生成礼貌、得体的改期/取消话术
- 提供最佳改期时间建议
- 一键复制话术到剪贴板

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **后端** | Node.js + Express + TypeScript | 高性能API服务 |
| **数据库** | Prisma + SQLite | 数据访问层 |
| **AI服务** | OpenAI GPT-4 | 自然语言处理和分析 |
| **认证** | JWT | 用户身份验证 |
| **缓存** | Redis | 会话和数据缓存 |
| **邮件** | Nodemailer | 通知邮件发送 |
| **定时任务** | Node-cron | 智能提醒调度 |
| **日历** | Google Calendar API | 外部日历集成 |

## 🚀 快速开始

### 1. 环境配置
```bash
# 克隆项目
cd /Users/wangshihao/projects/openclaws/ai-appointment-manager

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加 API 密钥
```

### 2. 数据库设置
```bash
# 生成 Prisma 客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# (可选) 填充初始数据
npm run db:seed
```

### 3. 启动开发服务器
```bash
# 使用开发脚本（推荐）
./dev.sh

# 或直接运行
npm run dev
```

### 4. 访问服务
- **健康检查**: http://localhost:3001/health
- **API文档**: http://localhost:3001/api
- **预约管理**: http://localhost:3001/api/appointments

## 📁 项目结构

```
src/
├── services/           # 核心业务逻辑
│   ├── appointmentAI.ts      # AI预约分析服务
│   └── multiModalRecognition.ts # 多模态识别服务
├── routes/             # API路由
│   ├── appointments.ts       # 预约管理API
│   ├── auth.ts             # 认证API
│   ├── calendars.ts        # 日历集成API
│   ├── reminders.ts       # 提醒系统API
│   └── analytics.ts        # 分析统计API
├── middleware/         # Express中间件
│   └── errorHandler.ts     # 错误处理
├── utils/              # 工具函数
│   ├── logger.ts          # 日志工具
│   └── prisma.ts          # 数据库客户端
└── types/              # TypeScript类型定义
```

## 🔌 API 接口

### 预约管理
```bash
# 获取所有预约
GET /api/appointments

# 创建预约
POST /api/appointments

# 多模态识别
POST /api/appointments/recognize
{
  "type": "screenshot",
  "data": "image_buffer_or_text"
}

# 批量识别
POST /api/appointments/batch-recognize
{
  "recognitions": [
    {"type": "sms", "data": "预约确认短信..."},
    {"type": "email", "data": {...}},
    {"type": "screenshot", "data": "image_buffer"}
  ]
}

# AI分析预约
POST /api/appointments/:id/analyze

# 生成改约话术
POST /api/appointments/:id/reschedule-message
{
  "newTime": "2026-03-30T14:00:00Z",
  "reason": "需要调整时间"
}
```

### 智能分析
```bash
# 获取预约概览
GET /api/appointments/analytics/overview

# 检测冲突
GET /api/appointments/:id  # 返回冲突信息
```

## 🧪 开发工具

### 开发脚本
```bash
# 完整开发环境启动
./dev.sh

# 仅启动服务
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
```

### 数据库工具
```bash
# 打开数据库管理界面
npm run db:studio

# 重置数据库
npm run db:migrate reset

# 生成类型
npm run db:generate
```

## 🎮 使用示例

### 1. 截图识别预约
```bash
curl -X POST http://localhost:3001/api/appointments/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "type": "screenshot",
    "data": "base64_encoded_image"
  }'
```

### 2. 短信解析预约
```bash
curl -X POST http://localhost:3001/api/appointments/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "data": {
      "content": "【医院】您的预约已确认：3月15日下午2:00-3:00，市口腔医院",
      "sender": "hospital"
    }
  }'
```

### 3. 手动输入预约
```bash
curl -X POST http://localhost:3001/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "牙科检查",
    "description": "定期牙齿检查",
    "startTime": "2026-03-15T14:00:00Z",
    "endTime": "2026-03-15T15:00:00Z",
    "location": "市口腔医院",
    "priority": "HIGH"
  }'
```

### 4. AI分析预约
```bash
curl -X POST http://localhost:3001/api/appointments/123/analyze \
  -H "Content-Type: application/json"
```

## 📊 性能指标

### 目标指标
- **识别准确率**: > 85%
- **冲突检测准确率**: > 90%
- **提醒触达率**: > 95%
- **API响应时间**: < 200ms

### 用户指标
- **7日留存率**: > 40%
- **月活跃用户**: > 10,000（6个月目标）
- **付费转化率**: > 5%

## 🔒 安全特性

- **JWT认证**: 所有API请求需要有效token
- **输入验证**: 所有输入数据严格验证
- **SQL注入防护**: Prisma ORM提供防护
- **XSS防护**: Express helmet中间件
- **速率限制**: API请求频率限制
- **数据加密**: 敏感数据加密存储

## 🚧 开发中功能

- [ ] **微信小程序**: 移动端应用
- [ ] **iOS/Android**: 原生移动应用
- [ ] **Web界面**: React前端界面
- [ ] **多云同步**: 支持多设备同步
- [ ] **智能推荐**: 基于机器学习的建议
- [ ] **团队协作**: 多人共享预约管理

## 📝 开发日志

### v1.0.0 (2026-03-29)
- ✅ **基础架构**: Express + TypeScript + Prisma
- ✅ **AI服务**: OpenAI集成和预约分析
- ✅ **多模态识别**: 截图、短信、邮件解析
- ✅ **冲突检测**: 时间和位置冲突分析
- ✅ **智能提醒**: 多级提醒系统
- ✅ **改约助手**: 自动生成话术
- ✅ **GitHub集成**: 完整的版本控制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

**标签**: `ai` `appointment` `calendar` `productivity` `multimodal` `nlp`  
**状态**: 🚧 开发中  
**优先级**: 🔥 高  
**GitHub**: [ai-ideas-lab/ai-appointment-manager](https://github.com/ai-ideas-lab/ai-appointment-manager)