import express from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../lib/middleware';
import { getAccessibleUserIds } from '../lib/utils';

const router = express.Router();

// Get Training List
router.get('/', authenticate, async (req: any, res) => {
    try {
        const { role, userId } = req.user;
        
        // Filter Logic:
        // - Admin/Manager: See all (or dept based)
        // - Instructor: See assigned only
        
        const where: any = {};
        
        // If not admin/manager, restrict to assigned
        if (role !== 'ADMIN' && role !== 'MANAGER') {
            where.assigneeId = userId;
        }

        const trainings = await prisma.training.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        courseName: true,
                        courseType: true,
                        phone: true
                    }
                },
                assignee: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                logs: {
                    orderBy: { submittedAt: 'desc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        res.json(trainings);
    } catch (error) {
        console.error('Error fetching trainings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Assign Instructor
router.patch('/:id/assign', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { assigneeId } = req.body;
    
    // Only Manager/Admin can assign
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const training = await prisma.training.update({
            where: { id: Number(id) },
            data: { 
                assigneeId: Number(assigneeId),
                status: 'IN_PROGRESS' // Auto start when assigned
            },
            include: { assignee: true }
        });
        res.json(training);
    } catch (error) {
        console.error('Error assigning training:', error);
        res.status(500).json({ message: 'Failed to assign' });
    }
});

// Submit Log
router.post('/:id/log', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { stage, score, result, content } = req.body;
    
    try {
        const log = await prisma.trainingLog.create({
            data: {
                trainingId: Number(id),
                stage,
                score: score ? Number(score) : null,
                result,
                content,
                status: 'SUBMITTED'
            }
        });
        
        // Update Training Status/UpdatedAt
        await prisma.training.update({
            where: { id: Number(id) },
            data: { updatedAt: new Date() }
        });

        res.json(log);
    } catch (error) {
        console.error('Error submitting log:', error);
        res.status(500).json({ message: 'Failed to submit log' });
    }
});

// Approve Log
router.patch('/log/:logId/approve', authenticate, async (req: any, res) => {
    const { logId } = req.params;
    
    // Only Manager/Admin can approve
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const log = await prisma.trainingLog.update({
            where: { id: Number(logId) },
            data: {
                status: 'APPROVED',
                approvedBy: req.user.userId,
                approvedAt: new Date()
            }
        });
        res.json(log);
    } catch (error) {
        console.error('Error approving log:', error);
        res.status(500).json({ message: 'Failed to approve log' });
    }
});

// Get Instructors (Employees in Training Dept or similar)
// For simplicity, reusing /users/assignable logic in frontend or creating a specific one here
// Let's create a specific one for "Training Dept" users if we had a dept ID, 
// but for now we'll just fetch all assignable users in frontend.

export default router;
