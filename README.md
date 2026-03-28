# AI Appointment Manager

An AI-powered multi-modal appointment management system that helps users manage their schedules, receive smart reminders, and prevent forgetfulness.

## Features

- **Multi-modal appointment management**: Text, voice, and visual interfaces
- **Smart reminders**: AI-powered contextual notifications
- **Calendar integration**: Google Calendar, Outlook, Apple Calendar support
- **Natural language processing**: Understand appointment requests in plain English
- **Automated scheduling**: Intelligent time slot suggestions
- **Reminder system**: Multiple notification channels (email, SMS, push notifications)
- **Analytics and insights**: Productivity tracking and optimization

## Tech Stack

- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- AI: OpenAI API for natural language processing
- Authentication: JWT
- Cache: Redis
- Email: Nodemailer
- Scheduling: Node-cron
- Calendar: Google Calendar API

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Set up database:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

## API Endpoints

- `/api/auth/*` - Authentication endpoints
- `/api/appointments/*` - Appointment management
- `/api/calendars/*` - Calendar integration
- `/api/reminders/*` - Reminder system
- `/api/analytics/*` - Analytics and insights

## Key Features

### Natural Language Processing
- Understand appointment requests like "Schedule a meeting with John tomorrow at 3pm"
- Extract context and suggest optimal times
- Handle rescheduling and cancellations naturally

### Smart Reminders
- Contextual notifications based on user behavior
- Multi-channel delivery (email, SMS, push)
- Adaptive timing based on appointment importance

### Calendar Integration
- Sync with multiple calendar services
- Conflict detection and resolution
- Two-way synchronization

### Analytics Dashboard
- Productivity metrics
- Appointment completion rates
- Time tracking and optimization