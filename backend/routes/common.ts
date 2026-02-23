import express from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const router = express.Router();

// === CHANNEL ROUTES ===

// Get All Channels
router.get('/channel', async (req, res) => {
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
router.post('/channel', async (req, res) => {
    const { name, type, points, cost, isActive } = req.body;
    try {
        const channel = await prisma.channel.create({
            data: {
                name,
                type,
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
router.patch('/channel/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, points, cost, isActive } = req.body;
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
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
router.get('/sales-target', async (req, res) => {
    try {
        const targets = await prisma.salesTarget.findMany({
            orderBy: { month: 'desc' }
        });
        res.json(targets);
    } catch (error) {
        console.error('Error fetching sales targets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create/Update Sales Target (Upsert)
router.post('/sales-target', async (req, res) => {
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


// === PAYMENT ROUTES ===
router.get('/payment', async (req, res) => {
    res.json([]);
});

export default router;
