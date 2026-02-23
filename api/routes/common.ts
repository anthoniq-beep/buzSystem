import express from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { authenticate } from '../lib/middleware';
import { getAccessibleUserIds } from '../lib/utils';
import dayjs from 'dayjs';

const router = express.Router();

// === STATS ROUTES ===
router.get('/stats/team', authenticate, async (req: any, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        const startOfMonth = dayjs(month as string).startOf('month').toDate();
        const endOfMonth = dayjs(month as string).endOf('month').toDate();

        const accessibleIds = await getAccessibleUserIds(req.user);
        
        // 1. Get Users
        const usersWhere: any = { status: { not: 'TERMINATED' } };
        if (accessibleIds) {
            usersWhere.id = { in: accessibleIds };
        }
        
        const users = await prisma.user.findMany({
            where: usersWhere,
            select: { id: true, name: true, role: true }
        });

        // 2. Aggregate Data (Optimized with groupBy)
        const userIds = users.map(u => u.id);

        // Lead Counts (Customer created)
        const leadCounts = await prisma.customer.groupBy({
            by: ['ownerId'],
            where: {
                ownerId: { in: userIds },
                createdAt: { gte: startOfMonth, lte: endOfMonth }
            },
            _count: { id: true }
        });
        const leadMap = new Map(leadCounts.map(item => [item.ownerId, item._count.id]));

        // Log Stats (Chance, Call, Touch, Deal)
        const logStats = await prisma.saleLog.groupBy({
            by: ['actorId', 'stage'],
            where: {
                actorId: { in: userIds },
                occurredAt: { gte: startOfMonth, lte: endOfMonth }
            },
            _count: { id: true },
            _sum: { dealAmount: true }
        });

        const statsMap = new Map();
        logStats.forEach(item => {
            const uid = item.actorId;
            if (!statsMap.has(uid)) statsMap.set(uid, { chance: 0, call: 0, touch: 0, deal: 0, amount: 0 });
            const entry = statsMap.get(uid);
            
            if (item.stage === 'CHANCE') entry.chance = item._count.id;
            if (item.stage === 'CALL') entry.call = item._count.id;
            if (item.stage === 'TOUCH') entry.touch = item._count.id;
            if (item.stage === 'DEAL') {
                entry.deal = item._count.id;
                entry.amount = Number(item._sum.dealAmount || 0);
            }
        });

        // Sales Targets
        const targets = await prisma.salesTarget.findMany({
            where: {
                userId: { in: userIds },
                month: month as string
            }
        });
        const targetMap = new Map(targets.map(t => [t.userId, Number(t.amount)]));

        // Assemble
        const stats = users.map(user => {
            const s = statsMap.get(user.id) || { chance: 0, call: 0, touch: 0, deal: 0, amount: 0 };
            const leadCount = leadMap.get(user.id) || 0;
            const targetAmount = targetMap.get(user.id) || 0;
            
            return {
                id: user.id,
                name: user.name,
                role: user.role,
                leadCount,
                chanceCount: s.chance,
                callCount: s.call,
                touchCount: s.touch,
                dealCount: s.deal,
                contractAmount: s.amount,
                targetAmount,
                completionRate: targetAmount ? (s.amount / targetAmount) * 100 : 0
            };
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// === CHANNEL ROUTES ===

// Get All Channels
router.get('/channel', authenticate, async (req, res) => {
    try {
        const channels = await prisma.channel.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        const result = channels.map(c => ({
            ...c,
            isActive: c.status === 'ACTIVE'
        }));
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create Channel
router.post('/channel', authenticate, async (req, res) => {
    const { name, type, category, points, cost, isActive } = req.body;
    try {
        const channel = await prisma.channel.create({
            data: {
                name,
                type,
                category: category || 'COMPANY', // Default
                points: Number(points) || 0,
                cost: Number(cost) || 0,
                status: isActive === false ? 'INACTIVE' : 'ACTIVE'
            }
        });
        res.json(channel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ message: 'Failed to create channel' });
    }
});

// Update Channel
router.patch('/channel/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, type, category, points, cost, isActive } = req.body;
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (category !== undefined) updateData.category = category;
        if (points !== undefined) updateData.points = Number(points);
        if (cost !== undefined) updateData.cost = Number(cost);
        if (isActive !== undefined) updateData.status = isActive ? 'ACTIVE' : 'INACTIVE';

        const channel = await prisma.channel.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json(channel);
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({ message: 'Failed to update channel' });
    }
});

// Delete Channel
router.delete('/channel/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.channel.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ message: 'Failed to delete channel' });
    }
});

// === USERS ROUTES ===

// Get Assignable Users
router.get('/users/assignable', authenticate, async (req: any, res) => {
    try {
        const accessibleIds = await getAccessibleUserIds(req.user);

        const where: any = {
            role: { in: ['MANAGER', 'EMPLOYEE', 'SUPERVISOR', 'ADMIN'] }, // Include ADMIN for testing
            // status: 'REGULAR' // Removed status check for now to allow testing
        };

        if (accessibleIds) {
            where.id = { in: accessibleIds };
        }

        const users = await prisma.user.findMany({
            where,
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
                phone: true,
                status: true,
                supervisorId: true,
                departmentId: true,
                department: { select: { id: true, name: true } }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create User
router.post('/users', async (req, res) => {
    const { name, phone, role, departmentId, supervisorId, status, password } = req.body;
    try {
        // Default password hash
        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        
        const user = await prisma.user.create({
            data: {
                name,
                username: phone, // Use phone as username
                phone,
                password: hashedPassword,
                role,
                departmentId: departmentId ? Number(departmentId) : null,
                supervisorId: supervisorId ? Number(supervisorId) : null,
                status: status || 'PROBATION'
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

// Update User
router.patch('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, role, departmentId, supervisorId, status } = req.body;
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) {
            updateData.phone = phone;
            updateData.username = phone; // Sync username
        }
        if (role !== undefined) updateData.role = role;
        if (departmentId !== undefined) updateData.departmentId = departmentId ? Number(departmentId) : null;
        if (supervisorId !== undefined) updateData.supervisorId = supervisorId ? Number(supervisorId) : null;
        if (status !== undefined) updateData.status = status;

        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: updateData
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// Support PUT as alias for PATCH (frontend uses PUT)
router.put('/users/:id', async (req, res) => {
    // Redirect logic to PATCH handler
    const { id } = req.params;
    const { name, phone, role, departmentId, supervisorId, status } = req.body;
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) {
            updateData.phone = phone;
            updateData.username = phone;
        }
        if (role !== undefined) updateData.role = role;
        if (departmentId !== undefined) updateData.departmentId = departmentId ? Number(departmentId) : null;
        if (supervisorId !== undefined) updateData.supervisorId = supervisorId ? Number(supervisorId) : null;
        if (status !== undefined) updateData.status = status;

        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: updateData
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});


// === ORGANIZATION ROUTES ===

// Get Organization
router.get('/organization', async (req, res) => {
    try {
        const depts = await prisma.department.findMany({
            include: { children: true }
        });
        res.json(depts);
    } catch (error) {
        console.error('Error fetching organization:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// === SALES TARGET ROUTES ===

// Get Sales Targets
router.get('/sales-target', authenticate, async (req: any, res) => {
    try {
        const accessibleIds = await getAccessibleUserIds(req.user);
        
        const where: any = {};
        if (accessibleIds) {
            where.userId = { in: accessibleIds };
        }

        const targets = await prisma.salesTarget.findMany({
            where,
            include: {
                user: { select: { name: true } },
                // department: { select: { name: true } } // Not in schema directly, accessed via user
            },
            orderBy: { month: 'desc' }
        });
        res.json(targets);
    } catch (error) {
        console.error('Error fetching sales targets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create/Update Sales Target (Upsert)
router.post('/sales-target', authenticate, async (req, res) => {
    // ... (Keep existing logic, maybe verify permission to edit target?)
    // For now, assume managers/admins can edit anyone
    const { userId, month, amount } = req.body;
    try {
        const target = await prisma.salesTarget.upsert({
            where: {
                userId_month: {
                    userId: Number(userId),
                    month: month
                }
            },
            update: {
                amount: Number(amount)
            },
            create: {
                userId: Number(userId),
                month: month,
                amount: Number(amount)
            }
        });
        res.json(target);
    } catch (error) {
        console.error('Error saving sales target:', error);
        res.status(500).json({ message: 'Failed to save sales target' });
    }
});


// === COMMISSION ROUTES ===
router.get('/commission', authenticate, async (req: any, res) => {
    try {
        const accessibleIds = await getAccessibleUserIds(req.user);
        
        const where: any = {};
        if (accessibleIds) {
            where.userId = { in: accessibleIds };
        }

        const commissions = await prisma.commission.findMany({
            where,
            include: {
                user: { select: { name: true } },
                customer: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Commission
router.put('/commission/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { commission, status } = req.body;
    try {
        const updated = await prisma.commission.update({
            where: { id: Number(id) },
            data: {
                commission: commission ? Number(commission) : undefined,
                status: status || undefined
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ message: 'Failed to update commission' });
    }
});

// Approve Commission
router.patch('/commission/:id/approve', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const updated = await prisma.commission.update({
            where: { id: Number(id) },
            data: { status: 'APPROVED' }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error approving commission:', error);
        res.status(500).json({ message: 'Failed to approve commission' });
    }
});
router.get('/payment', async (req, res) => {
    res.json([]);
});

export default router;
