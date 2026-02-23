import express from 'express';
import prisma from '../lib/prisma';
import { getAccessibleUserIds } from '../lib/utils';
import { authenticate } from '../lib/middleware';

const router = express.Router();

// Get all customers (with permission filter)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const accessibleIds = await getAccessibleUserIds(req.user);
    
    const where: any = {};
    if (accessibleIds) {
        where.ownerId = { in: accessibleIds };
    }

    const customers = await prisma.customer.findMany({
        where,
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    username: true
                }
            },
            channel: true, // Include channel info (was source)
            saleLogs: {
                orderBy: { occurredAt: 'desc' } // Order logs by date descending
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: {
            select: {
                id: true,
                name: true,
                username: true
            }
        },
        saleLogs: true
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create customer
router.post('/', authenticate, async (req: any, res) => {
    const { name, phone, sourceId, ownerId, companyName } = req.body;
    console.log(`User ${req.user?.userId} creating customer:`, req.body); // Debug log

    try {
        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                companyName,
                channelId: sourceId ? parseInt(sourceId) : null,
                ownerId: ownerId ? parseInt(ownerId) : req.user.userId, // Default to current user
                status: 'LEAD'
            }
        });
        res.json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Failed to create customer' });
    }
});

// Add Sale Log (Follow-up)
router.post('/:id/log', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { stage, note, isEffective, contractAmount } = req.body;
    
    try {
        // 1. Create Sale Log
        const log = await prisma.saleLog.create({
            data: {
                customerId: parseInt(id),
                actorId: req.user.userId,
                stage,
                note,
                isEffective: isEffective !== false, // Default true
                dealAmount: contractAmount ? Number(contractAmount) : null,
                occurredAt: new Date()
            }
        });

        // 2. Update Customer Status & Last Contact
        const updateData: any = {
            lastContactAt: new Date()
        };
        
        // If stage is DEAL, update status to DEAL
        // Or map stage to status generally if they match
        if (stage === 'DEAL') {
            updateData.status = 'DEAL';
        } else if (stage === 'CHANCE') {
            updateData.status = 'CHANCE';
        } else if (stage === 'CALL') {
            updateData.status = 'CALL';
        } else if (stage === 'TOUCH') {
            updateData.status = 'TOUCH';
        }

        await prisma.customer.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // 3. COMMISSION LOGIC (Only on DEAL)
        if (stage === 'DEAL' && contractAmount) {
            const amount = Number(contractAmount);
            const customerId = parseInt(id);
            
            // Fetch customer with channel and history
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                include: { channel: true, saleLogs: { orderBy: { occurredAt: 'desc' } } }
            });
            
            if (customer) {
                // Helper to create commission
                const createComm = async (uid: number, rate: number, type: any) => {
                    await prisma.commission.create({
                        data: {
                            userId: uid,
                            customerId,
                            amount,
                            commission: amount * rate,
                            status: 'PENDING',
                            type
                        }
                    });
                };

                // 3.1 CHANCE Commission
                const chanceLog = customer.saleLogs.find((l: any) => l.stage === 'CHANCE');
                if (chanceLog) {
                    const category = customer.channel?.category || 'COMPANY';
                    
                    if (category === 'COMPANY') {
                        // User 1%
                        await createComm(chanceLog.actorId, 0.01, 'CHANCE');
                        // Dept 2% (Assign to Manager of Dept)
                        const chanceActor = await prisma.user.findUnique({ where: { id: chanceLog.actorId } });
                        if (chanceActor?.departmentId) {
                            const manager = await prisma.user.findFirst({
                                where: { departmentId: chanceActor.departmentId, role: 'MANAGER' }
                            });
                            if (manager) {
                                await createComm(manager.id, 0.02, 'DEPT');
                            }
                        }
                    } else {
                        // Personal -> User 3%
                        await createComm(chanceLog.actorId, 0.03, 'CHANCE');
                    }
                }

                // 3.2 CALL Commission (2%)
                const callLog = customer.saleLogs.find((l: any) => l.stage === 'CALL');
                if (callLog) {
                    await createComm(callLog.actorId, 0.02, 'CALL');
                }

                // 3.3 TOUCH Commission (2%)
                const touchLog = customer.saleLogs.find((l: any) => l.stage === 'TOUCH');
                if (touchLog) {
                    await createComm(touchLog.actorId, 0.02, 'TOUCH');
                }

                // 3.4 DEAL Commission
                const dealActor = await prisma.user.findUnique({ where: { id: req.user.userId } });
                if (dealActor) {
                    let userRate = 0.01;
                    let deptRate = 0.02;

                    if (dealActor.role === 'MANAGER') {
                        userRate = 0.03;
                        deptRate = 0;
                    } else if (dealActor.role === 'SUPERVISOR') {
                        userRate = 0.02;
                        deptRate = 0.01;
                    }
                    
                    await createComm(dealActor.id, userRate, 'DEAL');
                    
                    if (deptRate > 0 && dealActor.departmentId) {
                        const manager = await prisma.user.findFirst({
                            where: { departmentId: dealActor.departmentId, role: 'MANAGER' }
                        });
                        if (manager) {
                            await createComm(manager.id, deptRate, 'DEPT');
                        }
                    }
                }
            }
        }
        
        res.json(log);
    } catch (error) {
        console.error('Error adding log:', error);
        res.status(500).json({ message: 'Failed to add log' });
    }
});

// Update customer
router.put('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
