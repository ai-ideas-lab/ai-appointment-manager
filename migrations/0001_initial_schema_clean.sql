-- Initial database schema for AI Appointment Manager
CREATE TABLE "User" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex((randomblob(4)))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Appointment" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  title TEXT NOT NULL,
  description TEXT,
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  location TEXT,
  isRecurring BOOLEAN DEFAULT FALSE,
  recurrenceRule TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  priority TEXT DEFAULT 'MEDIUM',
  timezone TEXT DEFAULT 'UTC',
  aiSummary TEXT,
  aiKeywords TEXT, -- JSON string
  aiConfidence REAL,
  userId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "CalendarIntegration" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  provider TEXT NOT NULL,
  externalId TEXT NOT NULL,
  refreshToken TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  syncEnabled BOOLEAN DEFAULT TRUE,
  userId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "CalendarEvent" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  externalId TEXT NOT NULL,
  provider TEXT NOT NULL,
  appointmentId TEXT NOT NULL,
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointmentId) REFERENCES "Appointment"(id) ON DELETE CASCADE,
  UNIQUE(externalId, provider)
);

CREATE TABLE "Reminder" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  appointmentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  time DATETIME NOT NULL,
  message TEXT NOT NULL,
  isSent BOOLEAN DEFAULT FALSE,
  channel TEXT DEFAULT 'EMAIL',
  aiMessage TEXT,
  aiTone TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointmentId) REFERENCES "Appointment"(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "Analytics" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  userId TEXT NOT NULL,
  date DATETIME NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  metadata TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, date, metric),
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_user_id ON "Appointment"(userId);
CREATE INDEX idx_appointments_start_time ON "Appointment"(startTime);
CREATE INDEX idx_appointments_status ON "Appointment"(status);
CREATE INDEX idx_reminders_user_id ON "Reminder"(userId);
CREATE INDEX idx_reminders_time ON "Reminder"(time);
CREATE INDEX idx_reminders_is_sent ON "Reminder"(isSent);
CREATE INDEX idx_analytics_user_id ON "Analytics"(userId);
CREATE INDEX idx_analytics_date ON "Analytics"(date);