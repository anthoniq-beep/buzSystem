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
                const pointsRaw = Number(customer.channel?.points || 0);
                const pointsRate = pointsRaw > 1 ? pointsRaw / 100 : pointsRaw;
                const netAmount = amount * (1 - pointsRate);
                const logs = customer.saleLogs;
                const commissionData: any[] = [];
                
                // Identify Actors
                const chanceLog = logs.find((l: any) => l.stage === 'CHANCE');
                const callLog = logs.find((l: any) => l.stage === 'CALL');
                const touchLog = logs.find((l: any) => l.stage === 'TOUCH');
                const dealActorId = req.user.userId;
                
                const actorIds = new Set<number>();
                if (chanceLog) actorIds.add(chanceLog.actorId);
                if (callLog) actorIds.add(callLog.actorId);
                if (touchLog) actorIds.add(touchLog.actorId);
                actorIds.add(dealActorId);
                
                // Fetch all actors
                const actors = await prisma.user.findMany({
                    where: { id: { in: Array.from(actorIds) } },
                    include: { department: true }
                });
                const actorsMap = new Map(actors.map(u => [u.id, u]));
                
                // Fetch managers of involved departments -> CHANGED TO VIRTUAL USERS (Dept Name)
                const deptIds = new Set<number>();
                actors.forEach(u => { if(u.departmentId) deptIds.add(u.departmentId); });
                
                let deptVirtualUsers = new Map<number, number>();
                if (deptIds.size > 0) {
                    // 1. Get Dept Names
                    const depts = await prisma.department.findMany({
                        where: { id: { in: Array.from(deptIds) } }
                    });
                    const deptNames = depts.map(d => d.name);
                    
                    // 2. Find Users with Dept Names
                    const virtualUsers = await prisma.user.findMany({
                        where: { name: { in: deptNames } }
                    });
                    
                    // 3. Map DeptID -> VirtualUserID
                    depts.forEach(d => {
                        const vUser = virtualUsers.find(u => u.name === d.name);
                        if (vUser) {
                            deptVirtualUsers.set(d.id, vUser.id);
                        }
                    });
                }

                // 3.1 CHANCE Commission
                if (chanceLog) {
                    const category = customer.channel?.category || 'COMPANY';
                    if (category === 'COMPANY') {
                        commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.01, status: 'PENDING', type: 'CHANCE' });
                        const actor = actorsMap.get(chanceLog.actorId);
                        if (actor?.departmentId) {
                            const vUserId = deptVirtualUsers.get(actor.departmentId);
                            if (vUserId) commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'DEPT' });
                        }
                    } else {
                        commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                    }
                }

                // 3.2 CALL Commission (2%)
                if (callLog) {
                    commissionData.push({ userId: callLog.actorId, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'CALL' });
                }

                // 3.3 TOUCH Commission (2%)
                if (touchLog) {
                    commissionData.push({ userId: touchLog.actorId, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'TOUCH' });
                }

                // 3.4 DEAL Commission
                const dealActor = actorsMap.get(dealActorId);
                if (dealActor) {
                    let userRate = 0.01;
                    let deptRate = 0.02;
                    if (dealActor.role === 'MANAGER') { userRate = 0.03; deptRate = 0; }
                    else if (dealActor.role === 'SUPERVISOR') { userRate = 0.02; deptRate = 0.01; }
                    
                    commissionData.push({ userId: dealActor.id, customerId, amount, commission: netAmount * userRate, status: 'PENDING', type: 'DEAL' });
                    
                    if (deptRate > 0 && dealActor.departmentId) {
                        const vUserId = deptVirtualUsers.get(dealActor.departmentId);
                        if (vUserId) commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * deptRate, status: 'PENDING', type: 'DEPT' });
                    }
                }

                // Batch Insert
                if (commissionData.length > 0) {
                    await prisma.commission.createMany({
                        data: commissionData
                    });
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
