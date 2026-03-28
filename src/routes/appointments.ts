import { Router } from 'express';
import { body, query } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { log } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { AppointmentAIService } from '../services/appointmentAI';
import { MultiModalRecognitionService, RecognitionResult } from '../services/multiModalRecognition';

const router = Router();
const appointmentAI = new AppointmentAIService();
const recognitionService = new MultiModalRecognitionService();

// Validation middleware
const appointmentValidation = [
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Start time must be a valid ISO date'),
  body('endTime').isISO8601().withMessage('End time must be a valid ISO date'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('location').optional().isString().withMessage('Location must be a string'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
];

// Get all appointments for the current user
router.get('/', [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).withMessage('Invalid status'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
], asyncHandler(async (req, res) => {
  const { userId } = req as any; // TODO: Get from JWT token
  const { startDate, endDate, status, priority } = req.query;
  
  log.info('Fetching appointments:', { userId, startDate, endDate, status, priority });
  
  const where: any = { userId };
  
  // Apply date range filter
  if (startDate && endDate) {
    where.startTime = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }
  
  // Apply status filter
  if (status) {
    where.status = status;
  }
  
  // Apply priority filter
  if (priority) {
    where.priority = priority;
  }
  
  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include: {
      reminders: {
        where: { isSent: false },
        orderBy: { time: 'asc' }
      }
    }
  });
  
  res.json({
    appointments,
    total: appointments.length,
    filters: { startDate, endDate, status, priority }
  });
}));

// Get a specific appointment
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Fetching appointment:', { id, userId });
  
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      reminders: {
        orderBy: { time: 'asc' }
      },
      calendarEvents: {
        orderBy: { startTime: 'asc' }
      }
    }
  });
  
  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }
  
  // Verify user has access
  if (appointment.userId !== userId) {
    throw createError(403, 'Access denied');
  }
  
  // Check for conflicts
  const conflicts = await appointmentAI.detectConflicts(appointment, userId);
  
  res.json({
    appointment,
    conflicts
  });
}));

// Create a new appointment
router.post('/', appointmentValidation, asyncHandler(async (req, res) => {
  const { title, description, startTime, endTime, location, priority = 'MEDIUM', timezone = 'UTC' } = req.body;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Creating appointment:', { title, startTime, endTime, userId });
  
  // Create appointment with AI analysis
  const appointmentData = {
    userId,
    title,
    description,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    location,
    priority,
    timezone,
    status: 'SCHEDULED',
  };
  
  const appointment = await prisma.appointment.create({
    data: appointmentData
  });
  
  // Perform AI analysis
  const aiResult = await appointmentAI.extractAppointmentInfo(
    `${title} ${description || ''}`, 
    userId
  );
  
  if (aiResult.success && aiResult.appointment) {
    // Update with AI-generated data
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        aiSummary: aiResult.appointment.aiSummary,
        aiKeywords: aiResult.appointment.aiKeywords,
        aiConfidence: aiResult.confidence,
      }
    });
  }
  
  // Check for conflicts
  const conflicts = await appointmentAI.detectConflicts(appointment, userId);
  
  // Generate smart reminders
  if (conflicts.hasConflicts) {
    log.warn('Appointment conflicts detected:', { conflicts });
    // TODO: Create conflict reminders
  }
  
  res.status(201).json({
    message: 'Appointment created successfully',
    appointment: {
      ...appointment,
      aiSummary: appointment.aiSummary,
      aiKeywords: appointment.aiKeywords,
      aiConfidence: appointment.aiConfidence,
      conflicts
    }
  });
}));

// Update an appointment
router.put('/:id', appointmentValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, startTime, endTime, location, priority, status } = req.body;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Updating appointment:', { id, userId });
  
  // Fetch existing appointment
  const existingAppointment = await prisma.appointment.findUnique({
    where: { id }
  });
  
  if (!existingAppointment) {
    throw createError(404, 'Appointment not found');
  }
  
  // Verify user has access
  if (existingAppointment.userId !== userId) {
    throw createError(403, 'Access denied');
  }
  
  const updateData: any = {
    title,
    description,
    startTime: startTime ? new Date(startTime) : existingAppointment.startTime,
    endTime: endTime ? new Date(endTime) : existingAppointment.endTime,
    location,
    priority,
    status,
    updatedAt: new Date()
  };
  
  // Regenerate AI analysis if needed
  if (title !== existingAppointment.title || description !== existingAppointment.description) {
    const aiResult = await appointmentAI.extractAppointmentInfo(
      `${title} ${description || ''}`, 
      userId
    );
    
    if (aiResult.success && aiResult.appointment) {
      updateData.aiSummary = aiResult.appointment.aiSummary;
      updateData.aiKeywords = aiResult.appointment.aiKeywords;
      updateData.aiConfidence = aiResult.confidence;
    }
  }
  
  const updatedAppointment = await prisma.appointment.update({
    where: { id },
    data: updateData
  });
  
  // Check for conflicts after update
  const conflicts = await appointmentAI.detectConflicts(updatedAppointment, userId);
  
  res.json({
    message: 'Appointment updated successfully',
    appointment: {
      ...updatedAppointment,
      conflicts
    }
  });
}));

// Delete an appointment
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Deleting appointment:', { id, userId });
  
  // Fetch existing appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id }
  });
  
  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }
  
  // Verify user has access
  if (appointment.userId !== userId) {
    throw createError(403, 'Access denied');
  }
  
  // Delete appointment (cascade deletes related reminders and calendar events)
  await prisma.appointment.delete({
    where: { id }
  });
  
  res.json({
    message: 'Appointment deleted successfully',
    appointmentId: id
  });
}));

// Multi-modal appointment recognition
router.post('/recognize', [
  body('type').isIn(['screenshot', 'sms', 'email', 'manual']).withMessage('Invalid recognition type'),
  body('data').notEmpty().withMessage('Data is required'),
], asyncHandler(async (req, res) => {
  const { type, data } = req.body;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Processing recognition request:', { type, userId });
  
  const result = await recognitionService.smartRecognize(
    { type, data },
    userId
  );
  
  if (result.success && result.data) {
    // Check for conflicts
    const conflicts = await appointmentAI.detectConflicts(result.data, userId);
    
    res.json({
      message: 'Recognition successful',
      result,
      conflicts,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({
      message: 'Recognition failed',
      error: result.error,
      confidence: result.confidence,
      type
    });
  }
}));

// Batch recognition from multiple sources
router.post('/batch-recognize', [
  body('recognitions').isArray().withMessage('Recognitions must be an array'),
  body('recognitions.*.type').isIn(['screenshot', 'sms', 'email', 'manual']).withMessage('Invalid recognition type'),
  body('recognitions.*.data').notEmpty().withMessage('Data is required'),
], asyncHandler(async (req, res) => {
  const { recognitions } = req.body;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Processing batch recognition:', { count: recognitions.length, userId });
  
  const results = await recognitionService.batchRecognize(recognitions, userId);
  
  res.json({
    message: 'Batch recognition completed',
    ...results,
    timestamp: new Date().toISOString()
  });
}));

// AI-powered appointment analysis
router.post('/:id/analyze', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Analyzing appointment:', { id, userId });
  
  // Fetch appointment details
  const appointment = await prisma.appointment.findUnique({
    where: { id }
  });
  
  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }
  
  // Verify user has access
  if (appointment.userId !== userId) {
    throw createError(403, 'Access denied');
  }
  
  // Perform deep AI analysis
  const conflictResult = await appointmentAI.detectConflicts(appointment, userId);
  
  // Generate enhanced AI summary
  const enhancedSummary = await appointmentAI.generateReminder(appointment, 'friendly');
  
  // Suggest optimal times
  const suggestedTimes = await appointmentAI.suggestAlternativeTimes(appointment, conflictResult.conflicts);
  
  res.json({
    message: 'Appointment analyzed successfully',
    analysis: {
      id: appointment.id,
      originalStartTime: appointment.startTime,
      originalEndTime: appointment.endTime,
      aiSummary: enhancedSummary,
      suggestedTimes,
      conflicts: conflictResult,
      insights: [
        appointment.priority === 'URGENT' ? 'High priority appointment requires preparation' : 'Normal priority appointment',
        conflictResult.hasConflicts ? 'Scheduling conflicts detected' : 'No scheduling conflicts',
        appointment.location ? `Located at ${appointment.location}` : 'Location to be confirmed'
      ],
      priority: appointment.priority,
      confidence: appointment.aiConfidence
    },
    timestamp: new Date().toISOString()
  });
}));

// Generate reschedule message
router.post('/:id/reschedule-message', [
  body('newTime').isISO8601().withMessage('New time must be a valid ISO date'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newTime, reason } = req.body;
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Generating reschedule message:', { id, newTime, userId });
  
  // Fetch appointment details
  const appointment = await prisma.appointment.findUnique({
    where: { id }
  });
  
  if (!appointment) {
    throw createError(404, 'Appointment not found');
  }
  
  // Verify user has access
  if (appointment.userId !== userId) {
    throw createError(403, 'Access denied');
  }
  
  // Generate reschedule message
  const message = await appointmentAI.generateRescheduleMessage(
    appointment,
    new Date(newTime),
    reason
  );
  
  res.json({
    message: 'Reschedule message generated successfully',
    rescheduleMessage: message,
    originalAppointment: {
      title: appointment.title,
      originalTime: appointment.startTime.toLocaleString('zh-CN'),
      newTime: new Date(newTime).toLocaleString('zh-CN'),
      reason
    },
    timestamp: new Date().toISOString()
  });
}));

// Get appointment analytics
router.get('/analytics/overview', asyncHandler(async (req, res) => {
  const { userId } = req as any; // TODO: Get from JWT token
  
  log.info('Fetching appointment analytics:', { userId });
  
  // Get appointment statistics
  const totalAppointments = await prisma.appointment.count({
    where: { userId }
  });
  
  const completedAppointments = await prisma.appointment.count({
    where: { userId, status: 'COMPLETED' }
  });
  
  const cancelledAppointments = await prisma.appointment.count({
    where: { userId, status: 'CANCELLED' }
  });
  
  const upcomingAppointments = await prisma.appointment.count({
    where: { 
      userId, 
      status: 'SCHEDULED',
      startTime: { gte: new Date() }
    }
  });
  
  const thisMonthAppointments = await prisma.appointment.count({
    where: { 
      userId,
      startTime: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  });
  
  // Get priority distribution
  const priorityDistribution = await prisma.appointment.groupBy({
    by: ['priority'],
    where: { userId },
    _count: { priority: true }
  });
  
  res.json({
    analytics: {
      total: totalAppointments,
      completed: completedAppointments,
      cancelled: cancelledAppointments,
      upcoming: upcomingAppointments,
      thisMonth: thisMonthAppointments,
      completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      priorityDistribution: priorityDistribution.reduce((acc, item) => {
        acc[item.priority.toLowerCase()] = item._count.priority;
        return acc;
      }, {} as any)
    },
    period: 'all_time',
    timestamp: new Date().toISOString()
  });
}));

export default router;