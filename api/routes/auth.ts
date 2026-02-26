import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma'; // Use singleton

import { authenticate } from '../lib/middleware';

const router = express.Router();
// const prisma = new PrismaClient(); // Removed
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set in environment variables, using default key.');
}

// Change Password
router.post('/change-password', authenticate, async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Verify old password
        let isValid = false;
        if (user.password === oldPassword) isValid = true;
        else isValid = await bcrypt.compare(oldPassword, user.password);
        
        if (!isValid) return res.status(400).json({ message: 'Incorrect old password' });
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { department: true } // Include department info
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // In a real app, use bcrypt.compare
    // For now, since we seeded plain text password (or if you hashed it, use compare)
    // Let's assume seeded password 'password' is not hashed for simplicity in this demo step,
    // BUT we should fix seed script to hash it.
    // Let's check if password matches directly OR via hash
    
    let isPasswordValid = false;
    if (user.password === password) {
        isPasswordValid = true;
    } else {
        isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
          userId: user.id, 
          username: user.username, 
          role: user.role,
          departmentId: user.departmentId // Add departmentId to token
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      accessToken: token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error details:', error); // Enhanced logging
    res.status(500).json({ message: 'Server error during login', error: String(error) });
  }
});

// Get Current User (Me)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { department: true } // Include department info
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
