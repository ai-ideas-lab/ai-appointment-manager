// Enums for Appointment Manager

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED'
}

export enum ReminderType {
  BEFORE_START = 'BEFORE_START',
  AT_START = 'AT_START',
  BEFORE_END = 'BEFORE_END',
  FOLLOW_UP = 'FOLLOW_UP',
  CUSTOM = 'CUSTOM'
}

export enum ReminderChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK'
}

export enum AITone {
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  CASUAL = 'CASUAL',
  URGENT = 'URGENT'
}

// Type definitions
export interface CreateReminderInput {
  appointmentId: string;
  type: ReminderType;
  time: Date;
  message: string;
  channel: ReminderChannel;
  aiMessage?: string;
  aiTone?: AITone;
}

export interface UpdateReminderInput {
  type?: ReminderType;
  time?: Date;
  message?: string;
  channel?: ReminderChannel;
  isSent?: boolean;
  aiMessage?: string;
  aiTone?: AITone;
}
