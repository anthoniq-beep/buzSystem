import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get Channels
router.get('/channel', async (req, res) => {
    try {
        const channels = await prisma.channel.findMany({
            where: { status: 'ACTIVE' }
        });
        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Assignable Users (Managers & Employees)
router.get('/users/assignable', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: { in: ['MANAGER', 'EMPLOYEE', 'SUPERVISOR'] },
                status: 'REGULAR'
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                department: { select: { name: true } }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching assignable users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get All Users
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                status: true,
                department: { select: { name: true } }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Organization (Departments)
router.get('/organization', async (req, res) => {
    try {
        const depts = await prisma.department.findMany({
            include: { children: true }
        });
        // Transform to tree structure if needed, for now just list
        res.json(depts);
    } catch (error) {
        console.error('Error fetching organization:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Sales Targets
router.get('/sales-target', async (req, res) => {
    // Return empty list for now
    res.json([]);
});

// Get Payment Requests
router.get('/payment', async (req, res) => {
    // Return empty list for now
    res.json([]);
});

export default router;
