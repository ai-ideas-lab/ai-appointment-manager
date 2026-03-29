import { PrismaClient } from '@prisma/client';
import { log } from '../src/utils/logger';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  log.info('🌱 Starting database seeding...');

  // Create test users
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  const user1 = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
      timezone: 'UTC',
      language: 'en'
    }
  });

  log.info('✅ Created demo user:', { email: user1.email });

  // Create sample appointments
  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        title: 'Team Meeting',
        description: 'Weekly team sync and planning',
        startTime: new Date('2026-03-29T10:00:00Z'),
        endTime: new Date('2026-03-29T11:00:00Z'),
        location: 'Conference Room A',
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        timezone: 'UTC',
        aiSummary: 'Weekly team meeting to discuss progress and plan for next week',
        aiKeywords: ['team', 'meeting', 'sync', 'planning'],
        aiConfidence: 0.95,
        userId: user1.id
      }
    }),
    prisma.appointment.create({
      data: {
        title: 'Client Presentation',
        description: 'Quarterly results presentation to major client',
        startTime: new Date('2026-03-30T14:00:00Z'),
        endTime: new Date('2026-03-30T15:30:00Z'),
        location: 'Client Office',
        status: 'SCHEDULED',
        priority: 'HIGH',
        timezone: 'UTC',
        aiSummary: 'Quarterly business presentation to key client',
        aiKeywords: ['client', 'presentation', 'quarterly', 'results'],
        aiConfidence: 0.98,
        userId: user1.id
      }
    }),
    prisma.appointment.create({
      data: {
        title: '1-on-1 with Manager',
        description: 'Monthly performance review and goal setting',
        startTime: new Date('2026-03-31T09:00:00Z'),
        endTime: new Date('2026-03-31T10:00:00Z'),
        location: 'Zoom Meeting',
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        timezone: 'UTC',
        aiSummary: 'Monthly one-on-one meeting for performance review',
        aiKeywords: ['1-on-1', 'performance', 'review', 'goals'],
        aiConfidence: 0.90,
        userId: user1.id
      }
    })
  ]);

  log.info('✅ Created sample appointments:', { count: appointments.length });

  // Create sample calendar integrations
  const calendarIntegration = await prisma.calendarIntegration.create({
    data: {
      provider: 'GOOGLE',
      externalId: 'google-calendar-primary',
      isActive: true,
      syncEnabled: true,
      userId: user1.id
    }
  });

  log.info('✅ Created calendar integration:', { provider: calendarIntegration.provider });

  // Create sample calendar events
  const calendarEvents = await Promise.all([
    prisma.calendarEvent.create({
      data: {
        externalId: 'google-event-123',
        provider: 'GOOGLE',
        appointmentId: appointments[0].id,
        startTime: new Date('2026-03-29T10:00:00Z'),
        endTime: new Date('2026-03-29T11:00:00Z'),
        summary: 'Team Meeting',
        description: 'Weekly team sync and planning',
        location: 'Conference Room A',
        status: 'confirmed'
      }
    }),
    prisma.calendarEvent.create({
      data: {
        externalId: 'google-event-456',
        provider: 'GOOGLE',
        appointmentId: appointments[1].id,
        startTime: new Date('2026-03-30T14:00:00Z'),
        endTime: new Date('2026-03-30T15:30:00Z'),
        summary: 'Client Presentation',
        description: 'Quarterly results presentation to major client',
        location: 'Client Office',
        status: 'confirmed'
      }
    })
  ]);

  log.info('✅ Created calendar events:', { count: calendarEvents.length });

  // Create sample reminders
  const reminders = await Promise.all([
    prisma.reminder.create({
      data: {
        appointmentId: appointments[0].id,
        type: 'BEFORE_START',
        time: new Date('2026-03-29T09:00:00Z'),
        message: 'Team meeting starts in 1 hour',
        channel: 'EMAIL',
        aiMessage: 'Your team meeting is starting soon in Conference Room A',
        aiTone: 'FRIENDLY',
        isSent: false
      }
    }),
    prisma.reminder.create({
      data: {
        appointmentId: appointments[0].id,
        type: 'AT_START',
        time: new Date('2026-03-29T10:00:00Z'),
        message: 'Team meeting starting now',
        channel: 'PUSH',
        aiMessage: 'Your team meeting is starting now',
        aiTone: 'URGENT',
        isSent: false
      }
    }),
    prisma.reminder.create({
      data: {
        appointmentId: appointments[1].id,
        type: 'BEFORE_START',
        time: new Date('2026-03-30T13:00:00Z'),
        message: 'Client presentation starts in 1 hour',
        channel: 'EMAIL',
        aiMessage: 'Your client presentation is starting soon',
        aiTone: 'FORMAL',
        isSent: false
      }
    })
  ]);

  log.info('✅ Created reminders:', { count: reminders.length });

  // Create sample analytics data
  const analytics = await Promise.all([
    prisma.analytics.create({
      data: {
        userId: user1.id,
        date: new Date('2026-03-28'),
        metric: 'appointments_completed',
        value: 3.0,
        metadata: JSON.stringify({ source: 'system' })
      }
    }),
    prisma.analytics.create({
      data: {
        userId: user1.id,
        date: new Date('2026-03-28'),
        metric: 'meeting_duration_avg',
        value: 45.0,
        metadata: JSON.stringify({ unit: 'minutes' })
      }
    }),
    prisma.analytics.create({
      data: {
        userId: user1.id,
        date: new Date('2026-03-28'),
        metric: 'attendance_rate',
        value: 0.95,
        metadata: JSON.stringify({ type: 'percentage' })
      }
    })
  ]);

  log.info('✅ Created analytics data:', { count: analytics.length });

  log.info('🎉 Database seeding completed successfully!');
  log.info('📊 Summary:');
  log.info(`   - Users created: 1`);
  log.info(`   - Appointments created: ${appointments.length}`);
  log.info(`   - Calendar integrations: ${1}`);
  log.info(`   - Calendar events: ${calendarEvents.length}`);
  log.info(`   - Reminders: ${reminders.length}`);
  log.info(`   - Analytics records: ${analytics.length}`);
}

main()
  .catch((e) => {
    log.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });