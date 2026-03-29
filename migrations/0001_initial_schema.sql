// Migration for initial database schema
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  avatar    String?
  timezone  String   @default("UTC")
  language  String   @default("en")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  appointments Appointment[]
  reminders    Reminder[]
  calendarIntegrations CalendarIntegration[]
  analytics     Analytics[]

  @@map("users")
}

model Appointment {
  id           String   @id @default(cuid())
  title        String
  description  String?
  startTime    DateTime
  endTime      DateTime
  location     String?
  isRecurring  Boolean  @default(false)
  recurrenceRule String?
  status       String
  priority     String
  timezone     String   @default("UTC")
  
  // AI processed data
  aiSummary    String?
  aiKeywords   String? // JSON string
  aiConfidence Float?
  
  // Relations
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  
  calendarEvents CalendarEvent[]
  reminders    Reminder[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("appointments")
}

model CalendarIntegration {
  id        String   @id @default(cuid())
  provider  String
  externalId String
  refreshToken String?
  isActive  Boolean  @default(true)
  syncEnabled Boolean @default(true)
  
  // Relations
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("calendar_integrations")
}

model CalendarEvent {
  id           String   @id @default(cuid())
  externalId   String
  provider     String
  appointmentId String
  appointment  Appointment @relation(fields: [appointmentId], references: [id])
  
  startTime    DateTime
  endTime      DateTime
  summary      String
  description  String?
  location     String?
  status       String
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([externalId, provider])
  @@map("calendar_events")
}

model Reminder {
  id           String     @id @default(cuid())
  appointmentId String
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  
  // Relations
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  
  type         String
  time         DateTime   // When reminder should be sent
  message      String
  isSent       Boolean    @default(false)
  channel      String     @default('EMAIL')
  
  // AI generated reminder content
  aiMessage    String?
  aiTone       String?
  
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("reminders")
}

model Analytics {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  date      DateTime // Date of analytics
  metric    String   // Metric name
  value     Float    // Metric value
  metadata  String?  // JSON metadata
  
  createdAt DateTime @default(now())

  @@unique([userId, date, metric])
  @@map("analytics")
}