import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { log } from '../utils/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString().withMessage('Name must be a string'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required'),
];

// Register a new user
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const { email, password, name, timezone = 'UTC', language = 'en' } = req.body;
  
  log.info('User registration attempt:', { email });
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw createError('User already exists with this email', 409);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        timezone,
        language
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        language: true,
        createdAt: true
      }
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    log.info('User registered successfully:', { userId: user.id, email });
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    throw error;
  }
}));

// Login user
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  log.info('User login attempt:', { email });
  
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw createError('Invalid credentials', 401);
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    log.info('User logged in successfully:', { userId: user.id, email });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    throw error;
  }
}));

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        language: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      throw createError('User not found', 404);
    }
    
    res.json({
      user
    });
  } catch (error) {
    throw error;
  }
}));

// Update user profile
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { name, timezone, language } = req.body;
  
  log.info('Profile update attempt:', { userId: req.user!.id });
  
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(timezone && { timezone }),
        ...(language && { language })
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        language: true,
        updatedAt: true
      }
    });
    
    log.info('Profile updated successfully:', { userId: req.user!.id });
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    throw error;
  }
}));

// Change password
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  log.info('Password change attempt:', { userId: req.user!.id });
  
  try {
    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }
    
    if (newPassword.length < 8) {
      throw createError('New password must be at least 8 characters long', 400);
    }
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });
    
    if (!user) {
      throw createError('User not found', 404);
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401);
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        password: hashedNewPassword
      }
    });
    
    log.info('Password changed successfully:', { userId: req.user!.id });
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    throw error;
  }
}));

// Delete user account
router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  log.info('Account deletion attempt:', { userId: req.user!.id });
  
  try {
    // Delete all user data
    await prisma.reminder.deleteMany({
      where: { userId: req.user!.id }
    });
    
    await prisma.appointment.deleteMany({
      where: { userId: req.user!.id }
    });
    
    await prisma.calendarIntegration.deleteMany({
      where: { userId: req.user!.id }
    });
    
    await prisma.analytics.deleteMany({
      where: { userId: req.user!.id }
    });
    
    // Delete user
    await prisma.user.delete({
      where: { id: req.user!.id }
    });
    
    log.info('Account deleted successfully:', { userId: req.user!.id });
    
    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    throw error;
  }
}));

export default router;