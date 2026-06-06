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
        const userIds = users.map((u: any) => u.id);

        // Lead Counts (Customer created)
        const leadCounts = await prisma.customer.groupBy({
            by: ['ownerId'],
            where: {
                ownerId: { in: userIds },
                createdAt: { gte: startOfMonth, lte: endOfMonth }
            },
            _count: { id: true }
        });
        const leadMap = new Map(leadCounts.map((item: any) => [item.ownerId, item._count.id]));

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
        logStats.forEach((item: any) => {
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
        const targetMap = new Map(targets.map((t: any) => [t.userId, Number(t.amount)]));

        // Assemble
        const stats = users.map((user: any) => {
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
                completionRate: targetAmount ? (s.amount / Number(targetAmount)) * 100 : 0
            };
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin Dashboard Stats (Last 12 Months)
router.get('/stats/admin', authenticate, async (req: any, res) => {
    try {
        const { role, departmentId } = req.user;
        if (role !== 'ADMIN' && role !== 'MANAGER') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const now = dayjs();
        const start = now.subtract(11, 'month').startOf('month');
        const end = now.endOf('month');

        // Prepare Scope Filter
        let userIds: number[] | undefined;
        if (role === 'MANAGER') {
            if (!departmentId) return res.json([]); // No dept -> no data
            const deptUsers = await prisma.user.findMany({
                where: { departmentId },
                select: { id: true }
            });
            userIds = deptUsers.map((u: any) => u.id);
        }

        // 1. Actual Sales (SaleLog DEAL)
        const logWhere: any = {
            stage: 'DEAL',
            occurredAt: { gte: start.toDate(), lte: end.toDate() }
        };
        if (userIds) logWhere.actorId = { in: userIds };

        const logs = await prisma.saleLog.findMany({
            where: logWhere,
            select: { occurredAt: true, dealAmount: true }
        });

        // 2. Sales Targets
        const targetWhere: any = {
            month: { gte: start.format('YYYY-MM'), lte: end.format('YYYY-MM') }
        };
        if (userIds) targetWhere.userId = { in: userIds };

        const targets = await prisma.salesTarget.findMany({
            where: targetWhere
        });

        // 3. Aggregate
        const stats: Record<string, { month: string, target: number, actual: number }> = {};
        
        // Init months
        for (let i = 0; i < 12; i++) {
            const m = start.add(i, 'month').format('YYYY-MM');
            stats[m] = { month: m, target: 0, actual: 0 };
        }
        
        logs.forEach((log: any) => {
            const m = dayjs(log.occurredAt).format('YYYY-MM');
            if (stats[m]) stats[m].actual += Number(log.dealAmount || 0);
        });
        
        targets.forEach((t: any) => {
            const m = t.month;
            if (stats[m]) stats[m].target += Number(t.amount || 0);
        });
        
        res.json(Object.values(stats));
    } catch (error) {
        console.error('Error fetching admin stats:', error);
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
        
        const result = channels.map((c: any) => ({
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
                type: type || 'OTHER', // Default to OTHER if not provided
                category: category || 'COMPANY',
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
            where: {
                status: { not: 'TERMINATED' }
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                phone: true,
                status: true,
                canSendMail: true,
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
        const userId = Number(id);
        if (Number.isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, status: true }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (existingUser.status === 'TERMINATED') {
            return res.json({ message: 'Deleted successfully' });
        }

        await prisma.$transaction(async (tx: any) => {
            await tx.user.updateMany({
                where: { supervisorId: userId },
                data: { supervisorId: null }
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    status: 'TERMINATED',
                    departmentId: null,
                    supervisorId: null,
                    phone: null,
                    username: `${existingUser.username}_terminated_${Date.now()}`
                }
            });
        });

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        const detail = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: 'Failed to delete user', detail });
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

router.post('/organization', authenticate, async (req: any, res) => {
    try {
        const { role } = req.user;
        if (role !== 'ADMIN' && role !== 'HR') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { name, parentId } = req.body ?? {};
        const deptName = typeof name === 'string' ? name.trim() : '';
        if (!deptName) {
            return res.status(400).json({ message: '部门名称不能为空' });
        }

        const parsedParentId =
            parentId === null || parentId === undefined || parentId === ''
                ? null
                : Number(parentId);

        if (parsedParentId !== null && Number.isNaN(parsedParentId)) {
            return res.status(400).json({ message: 'parentId 不合法' });
        }

        if (parsedParentId !== null) {
            const parent = await prisma.department.findUnique({
                where: { id: parsedParentId },
                select: { id: true }
            });
            if (!parent) {
                return res.status(400).json({ message: '父部门不存在' });
            }
        }

        const exists = await prisma.department.findFirst({
            where: { name: deptName, parentId: parsedParentId }
        });
        if (exists) {
            return res.status(409).json({ message: '部门已存在' });
        }

        const dept = await prisma.department.create({
            data: {
                name: deptName,
                parentId: parsedParentId
            }
        });

        res.json(dept);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/mails/unread-count', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const count = await prisma.internalMail.count({
            where: { recipientId: userId, readAt: null }
        });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/mails/unread', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const limitRaw = req.query.limit;
        const limit = Math.min(Math.max(Number(limitRaw ?? 5) || 5, 1), 20);
        const mails = await prisma.internalMail.findMany({
            where: { recipientId: userId, readAt: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { sender: { select: { id: true, name: true, username: true } } }
        });
        res.json(mails);
    } catch (error) {
        console.error('Error fetching unread mails:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/mails', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const includeReadRaw = req.query.includeRead;
        const includeRead = includeReadRaw === 'true' || includeReadRaw === true;

        const mails = await prisma.internalMail.findMany({
            where: {
                recipientId: userId,
                ...(includeRead ? {} : { readAt: null })
            },
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, name: true, username: true } } }
        });
        res.json(mails);
    } catch (error) {
        console.error('Error fetching mails:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/mails/:id/read', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const mailId = Number(req.params.id);
        if (Number.isNaN(mailId)) {
            return res.status(400).json({ message: 'Invalid mail id' });
        }

        const mail = await prisma.internalMail.findUnique({
            where: { id: mailId },
            select: { id: true, recipientId: true, readAt: true }
        });

        if (!mail || mail.recipientId !== userId) {
            return res.status(404).json({ message: 'Mail not found' });
        }

        if (mail.readAt) {
            return res.json({ message: 'ok' });
        }

        await prisma.internalMail.update({
            where: { id: mailId },
            data: { readAt: new Date() }
        });

        res.json({ message: 'ok' });
    } catch (error) {
        console.error('Error marking mail read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/mails', authenticate, async (req: any, res) => {
    try {
        const senderId = Number(req.user.userId);
        const senderRole = req.user.role;
        const { title, content, recipientId } = req.body ?? {};

        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        const trimmedContent = typeof content === 'string' ? content.trim() : '';
        const rid = Number(recipientId);

        if (!trimmedTitle) return res.status(400).json({ message: '标题不能为空' });
        if (!trimmedContent) return res.status(400).json({ message: '内容不能为空' });
        if (Number.isNaN(rid)) return res.status(400).json({ message: 'recipientId 不合法' });

        const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { id: true, canSendMail: true }
        });
        if (!sender) return res.status(401).json({ message: 'Unauthorized' });

        const canSend = senderRole === 'ADMIN' || sender.canSendMail;
        if (!canSend) {
            return res.status(403).json({ message: '未开通发送权限' });
        }

        const recipient = await prisma.user.findUnique({
            where: { id: rid },
            select: { id: true, status: true }
        });
        if (!recipient || recipient.status === 'TERMINATED') {
            return res.status(400).json({ message: '收件人不存在' });
        }

        const mail = await prisma.internalMail.create({
            data: {
                title: trimmedTitle,
                content: trimmedContent,
                senderId,
                recipientId: rid
            }
        });

        res.json(mail);
    } catch (error) {
        console.error('Error sending mail:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/mails/broadcast', authenticate, async (req: any, res) => {
    try {
        const senderId = Number(req.user.userId);
        const senderRole = req.user.role;
        const { title, content } = req.body ?? {};

        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        const trimmedContent = typeof content === 'string' ? content.trim() : '';
        if (!trimmedTitle) return res.status(400).json({ message: '标题不能为空' });
        if (!trimmedContent) return res.status(400).json({ message: '内容不能为空' });

        const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { id: true, canSendMail: true, status: true }
        });
        if (!sender || sender.status === 'TERMINATED') return res.status(401).json({ message: 'Unauthorized' });

        const canSend = senderRole === 'ADMIN' || sender.canSendMail;
        if (!canSend) {
            return res.status(403).json({ message: '未开通发送权限' });
        }

        const recipients = await prisma.user.findMany({
            where: { status: { not: 'TERMINATED' }, id: { not: senderId } },
            select: { id: true }
        });

        if (!recipients.length) {
            return res.json({ created: 0 });
        }

        const result = await prisma.internalMail.createMany({
            data: recipients.map(r => ({
                title: trimmedTitle,
                content: trimmedContent,
                senderId,
                recipientId: r.id
            }))
        });

        res.json({ created: result.count });
    } catch (error) {
        console.error('Error broadcasting mail:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/users/:id/mail-permission', authenticate, async (req: any, res) => {
    try {
        const { role } = req.user;
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const targetUserId = Number(req.params.id);
        if (Number.isNaN(targetUserId)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const { canSendMail } = req.body ?? {};
        if (typeof canSendMail !== 'boolean') {
            return res.status(400).json({ message: 'canSendMail 必须为 boolean' });
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { canSendMail },
            select: { id: true, canSendMail: true }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error updating mail permission:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/announcements/latest', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const latest = await prisma.announcement.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!latest) {
            return res.json(null);
        }

        const view = await prisma.announcementView.findUnique({
            where: { announcementId_userId: { announcementId: latest.id, userId } },
            select: { id: true }
        });

        res.json({ ...latest, seen: !!view });
    } catch (error) {
        console.error('Error fetching latest announcement:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/announcements/:id/seen', authenticate, async (req: any, res) => {
    try {
        const userId = Number(req.user.userId);
        const announcementId = Number(req.params.id);
        if (Number.isNaN(announcementId)) {
            return res.status(400).json({ message: 'Invalid announcement id' });
        }

        const exists = await prisma.announcement.findUnique({
            where: { id: announcementId },
            select: { id: true, isActive: true }
        });
        if (!exists || !exists.isActive) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        await prisma.announcementView.upsert({
            where: { announcementId_userId: { announcementId, userId } },
            update: { seenAt: new Date() },
            create: { announcementId, userId }
        });

        res.json({ message: 'ok' });
    } catch (error) {
        console.error('Error marking announcement seen:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/announcements', authenticate, async (req: any, res) => {
    try {
        const { role } = req.user;
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { title, mediaUrl, isActive } = req.body ?? {};
        const t = typeof title === 'string' ? title.trim() : '';
        const url = typeof mediaUrl === 'string' ? mediaUrl.trim() : '';
        if (!t) return res.status(400).json({ message: '标题不能为空' });
        if (!url) return res.status(400).json({ message: '媒体链接不能为空' });

        const created = await prisma.announcement.create({
            data: {
                title: t,
                mediaUrl: url,
                isActive: typeof isActive === 'boolean' ? isActive : true
            }
        });

        res.json(created);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/announcements', authenticate, async (req: any, res) => {
    try {
        const { role } = req.user;
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const list = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(list);
    } catch (error) {
        console.error('Error listing announcements:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/announcements/:id/active', authenticate, async (req: any, res) => {
    try {
        const { role } = req.user;
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const announcementId = Number(req.params.id);
        if (Number.isNaN(announcementId)) {
            return res.status(400).json({ message: 'Invalid announcement id' });
        }

        const { isActive } = req.body ?? {};
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive 必须为 boolean' });
        }

        const updated = await prisma.announcement.update({
            where: { id: announcementId },
            data: { isActive }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error updating announcement:', error);
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
                customer: { 
                    select: { 
                        name: true,
                        channel: true // Include channel info to get points
                    } 
                }
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
    const { commission, status, userId } = req.body;
    try {
        const updateData: any = {};
        if (commission !== undefined) updateData.commission = Number(commission);
        if (status !== undefined) updateData.status = status;
        if (userId !== undefined) updateData.userId = Number(userId);

        const updated = await prisma.commission.update({
            where: { id: Number(id) },
            data: updateData
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
