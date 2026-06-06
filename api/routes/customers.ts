import express from 'express';
import prisma from '../lib/prisma';
import { getAccessibleUserIds } from '../lib/utils';
import { authenticate } from '../lib/middleware';

const router = express.Router();

// Get all customers (with permission filter)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const accessibleIds = await getAccessibleUserIds(req.user);
    
    const where: any = {
        status: { not: 'CHURNED' }
    };
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
        saleLogs: {
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: { occurredAt: 'desc' }
        }
      }
    });

    if (!customer || customer.status === 'CHURNED') {
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
    const { name, phone, sourceId, ownerId, companyName, courseType, courseName } = req.body;
    console.log(`User ${req.user?.userId} creating customer:`, req.body); // Debug log

    try {
        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                companyName,
                courseType,
                courseName,
                channelId: sourceId ? parseInt(sourceId) : null,
                ownerId: ownerId ? parseInt(ownerId) : req.user.userId, // Default to current user
                status: 'LEAD',
                // Auto-create Training Record
                training: {
                    create: {
                        status: 'PENDING'
                    }
                }
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
                const actors: any[] = await prisma.user.findMany({
                    where: { id: { in: Array.from(actorIds) } },
                    include: { department: true }
                });
                const actorsMap = new Map(actors.map((u: any) => [u.id, u]));
                
                // Fetch managers of involved departments -> CHANGED TO VIRTUAL USERS (Dept Name)
                const deptIds = new Set<number>();
                actors.forEach((u: any) => { if(u.departmentId) deptIds.add(u.departmentId); });
                
                let deptVirtualUsers = new Map<number, number>();
                if (deptIds.size > 0) {
                    // 1. Get Dept Names
                    const depts = await prisma.department.findMany({
                        where: { id: { in: Array.from(deptIds) } }
                    });
                    const deptNames = depts.map((d: any) => d.name);
                    
                    // 2. Find Users with Dept Names
                    const virtualUsers = await prisma.user.findMany({
                        where: { name: { in: deptNames } }
                    });
                    
                    // 3. Map DeptID -> VirtualUserID
                    depts.forEach((d: any) => {
                        const vUser = virtualUsers.find((u: any) => u.name === d.name);
                        if (vUser) {
                            deptVirtualUsers.set(d.id, vUser.id);
                        }
                    });
                }

                // 3.1 CHANCE Commission
                if (chanceLog) {
                    const category = customer.channel?.category || 'COMPANY';
                    if (category === 'COMPANY') {
                        // For Company Leads: 100% to Actor
                        // Check if actor is supervisor/manager
                        const actor = actorsMap.get(chanceLog.actorId);
                        // If supervisor, 2% to actor, 1% to dept virtual user
                        if (actor?.departmentId) {
                            const vUserId = deptVirtualUsers.get(actor.departmentId);
                            if (vUserId && (actor.role === 'SUPERVISOR' || actor.role === 'MANAGER')) {
                                commissionData.push({ userId: actor.id, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'CHANCE' });
                                commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * 0.01, status: 'PENDING', type: 'DEPT' });
                            } else {
                                commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                            }
                        } else {
                            commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                        }
                    } else {
                         // PERSONAL Leads: No CHANCE commission (already included in Personal Deal?)
                         // Actually rule says: Personal Leads -> 40% total?
                         // Let's stick to simple rule for now: CHANCE always gets something?
                         // For now assume standard 3% for chance stage regardless of source?
                         // Wait, for PERSONAL leads, the deal commission is higher, maybe chance is skipped?
                         // Let's keep it simple: 3% for chance
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
                // Company: 3% (Employee) or 2%+1% (Supervisor)
                // Personal: 40% (Total?) -> Let's implement Company Logic first
                // If Personal, deal actor gets 33%? (40 - 3 - 2 - 2 = 33)
                if (dealActorId) {
                    let userRate = 0.03;
                    let deptRate = 0;
                    
                    const dealActor = actorsMap.get(dealActorId);
                    if (dealActor) {
                        if (customer.channel?.category === 'PERSONAL') {
                            userRate = 0.33; // Simplify
                        } else {
                            if (dealActor.role === 'MANAGER') { userRate = 0.03; deptRate = 0; }
                            else if (dealActor.role === 'SUPERVISOR') { userRate = 0.02; deptRate = 0.01; }
                        }

                        commissionData.push({ userId: dealActor.id, customerId, amount, commission: netAmount * userRate, status: 'PENDING', type: 'DEAL' });

                        if (deptRate > 0 && dealActor.departmentId) {
                            const vUserId = deptVirtualUsers.get(dealActor.departmentId);
                            if (vUserId) {
                                commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * deptRate, status: 'PENDING', type: 'DEPT' });
                            }
                        }
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
        
        // 4. BACKFILL COMMISSION LOGIC (If adding non-DEAL log but DEAL exists)
        if (stage !== 'DEAL') {
             // Check if DEAL exists
             const dealLog = await prisma.saleLog.findFirst({
                 where: { customerId: parseInt(id), stage: 'DEAL' }
             });

             if (dealLog && dealLog.dealAmount) {
                const amount = Number(dealLog.dealAmount);
                const customerId = parseInt(id);

                // Fetch customer with channel
                const customer = await prisma.customer.findUnique({
                    where: { id: customerId },
                    include: { channel: true }
                });

                if (customer) {
                    const pointsRaw = Number(customer.channel?.points || 0);
                    const pointsRate = pointsRaw > 1 ? pointsRaw / 100 : pointsRaw;
                    const netAmount = amount * (1 - pointsRate);
                    const commissionData: any[] = [];
                    
                    // Check if commission for this stage ALREADY exists
                    // Type matches stage name for CHANCE, CALL, TOUCH
                    const existingComm = await prisma.commission.findFirst({
                        where: { customerId, type: stage } 
                    });

                    if (!existingComm) {
                         // Calculate just for this stage
                         const actorId = req.user.userId;
                         
                         if (stage === 'CHANCE') {
                             // Need to check Category logic
                             const category = customer.channel?.category || 'COMPANY';
                             if (category === 'COMPANY') {
                                 commissionData.push({ userId: actorId, customerId, amount, commission: netAmount * 0.01, status: 'PENDING', type: 'CHANCE' });
                                 // Handle DEPT commission? 
                                 // Fetch actor dept
                                 const actor = await prisma.user.findUnique({ where: { id: actorId }, include: { department: true } });
                                 if (actor?.department) {
                                     // Find virtual user for dept
                                     const vUser = await prisma.user.findFirst({ where: { name: actor.department.name } });
                                     if (vUser) {
                                         commissionData.push({ userId: vUser.id, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'DEPT' });
                                     }
                                 }
                             } else {
                                 commissionData.push({ userId: actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                             }
                         } else if (stage === 'CALL') {
                             commissionData.push({ userId: actorId, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'CALL' });
                         } else if (stage === 'TOUCH') {
                             commissionData.push({ userId: actorId, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'TOUCH' });
                         }

                         if (commissionData.length > 0) {
                             await prisma.commission.createMany({ data: commissionData });
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
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const {
        status,
        contractAmount,
        note,
        sourceId,
        channelId,
        ownerId,
        name,
        phone,
        companyName,
        courseType,
        courseName
    } = req.body;
    
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (courseType !== undefined) updateData.courseType = courseType;
        if (courseName !== undefined) updateData.courseName = courseName;
        if (ownerId !== undefined) updateData.ownerId = ownerId ? Number(ownerId) : null;
        const finalChannelId = sourceId !== undefined ? sourceId : channelId;
        if (finalChannelId !== undefined) {
            updateData.channelId = finalChannelId ? Number(finalChannelId) : null;
        }
        if (status !== undefined) updateData.status = status;

        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // If status changed to DEAL, ensure training record exists
        if (status === 'DEAL') {
             // ... logic using contractAmount ...
             const { courseName } = req.body;
             
             if (contractAmount) {
                await prisma.saleLog.create({
                    data: {
                        customerId: parseInt(id),
                        actorId: req.user.userId,
                        stage: 'DEAL',
                        note: note ? `合同签约完成。课程：${courseName}。备注：${note}` : `合同签约完成。课程：${courseName}`,
                        isEffective: true,
                        dealAmount: Number(contractAmount),
                        occurredAt: new Date()
                    }
                });
             }
             
             // 1.5 Calculate Commission
             if (contractAmount) {
                try {
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
                const actors: any[] = await prisma.user.findMany({
                    where: { id: { in: Array.from(actorIds) } },
                    include: { department: true }
                });
                const actorsMap = new Map(actors.map((u: any) => [u.id, u]));
                
                // Fetch managers of involved departments -> CHANGED TO VIRTUAL USERS (Dept Name)
                const deptIds = new Set<number>();
                actors.forEach((u: any) => { if(u.departmentId) deptIds.add(u.departmentId); });
                
                let deptVirtualUsers = new Map<number, number>();
                if (deptIds.size > 0) {
                    // 1. Get Dept Names
                    const depts = await prisma.department.findMany({
                        where: { id: { in: Array.from(deptIds) } }
                    });
                    const deptNames = depts.map((d: any) => d.name);
                    
                    // 2. Find Users with Dept Names
                    const virtualUsers = await prisma.user.findMany({
                        where: { name: { in: deptNames } }
                    });
                    
                    // 3. Map DeptID -> VirtualUserID
                    depts.forEach((d: any) => {
                        const vUser = virtualUsers.find((u: any) => u.name === d.name);
                        if (vUser) {
                            deptVirtualUsers.set(d.id, vUser.id);
                        }
                    });
                }

                // 3.1 CHANCE Commission
                if (chanceLog) {
                    const category = customer.channel?.category || 'COMPANY';
                    if (category === 'COMPANY') {
                        // For Company Leads: 100% to Actor
                        // Check if actor is supervisor/manager
                        const actor = actorsMap.get(chanceLog.actorId);
                        // If supervisor, 2% to actor, 1% to dept virtual user
                        if (actor?.departmentId) {
                            const vUserId = deptVirtualUsers.get(actor.departmentId);
                            if (vUserId && (actor.role === 'SUPERVISOR' || actor.role === 'MANAGER')) {
                                commissionData.push({ userId: actor.id, customerId, amount, commission: netAmount * 0.02, status: 'PENDING', type: 'CHANCE' });
                                commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * 0.01, status: 'PENDING', type: 'DEPT' });
                            } else {
                                commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                            }
                        } else {
                            commissionData.push({ userId: chanceLog.actorId, customerId, amount, commission: netAmount * 0.03, status: 'PENDING', type: 'CHANCE' });
                        }
                    } else {
                         // PERSONAL Leads: No CHANCE commission (already included in Personal Deal?)
                         // Actually rule says: Personal Leads -> 40% total?
                         // Let's stick to simple rule for now: CHANCE always gets something?
                         // For now assume standard 3% for chance stage regardless of source?
                         // Wait, for PERSONAL leads, the deal commission is higher, maybe chance is skipped?
                         // Let's keep it simple: 3% for chance
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
                // Company: 3% (Employee) or 2%+1% (Supervisor)
                // Personal: 40% (Total?) -> Let's implement Company Logic first
                // If Personal, deal actor gets 33%? (40 - 3 - 2 - 2 = 33)
                if (dealActorId) {
                    let userRate = 0.03;
                    let deptRate = 0;
                    
                    const dealActor = actorsMap.get(dealActorId);
                    if (dealActor) {
                        if (customer.channel?.category === 'PERSONAL') {
                            userRate = 0.33; // Simplify
                        } else {
                            if (dealActor.role === 'MANAGER') { userRate = 0.03; deptRate = 0; }
                            else if (dealActor.role === 'SUPERVISOR') { userRate = 0.02; deptRate = 0.01; }
                        }

                        commissionData.push({ userId: dealActor.id, customerId, amount, commission: netAmount * userRate, status: 'PENDING', type: 'DEAL' });

                        if (deptRate > 0 && dealActor.departmentId) {
                            const vUserId = deptVirtualUsers.get(dealActor.departmentId);
                            if (vUserId) {
                                commissionData.push({ userId: vUserId, customerId, amount, commission: netAmount * deptRate, status: 'PENDING', type: 'DEPT' });
                            }
                        }
                    }
                }

                    // Batch Insert
                        if (commissionData.length > 0) {
                            await prisma.commission.createMany({
                                data: commissionData
                            });
                        }
                    }
                } catch (commissionError) {
                    console.error('Commission calculation failed:', commissionError);
                }
             }
             
             // ... rest of logic ...
            const existingTraining = await prisma.training.findUnique({
                where: { customerId: parseInt(id) }
            });
            
            if (!existingTraining) {
                await prisma.training.create({
                    data: {
                        customerId: parseInt(id),
                        status: 'PENDING'
                    }
                });
            } else {
                 // Update training if needed (e.g. if contract resigned/updated)
                 await prisma.training.update({
                     where: { id: existingTraining.id },
                     data: { status: 'PENDING' } // Reset or keep? Maybe just ensure it exists.
                 });
            }
        }

        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        const detail = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: 'Internal server error', detail });
    }
});

// Delete customer
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request to delete customer ${id} by user ${req.user.userId} (${req.user.role})`);
    
    try {
        const customerId = parseInt(id);
        if (Number.isNaN(customerId)) {
            return res.status(400).json({ message: 'Invalid customer id' });
        }
        
        // 权限校验：仅允许 Admin, Manager, Supervisor (本部门) 删除
        const userRole = req.user.role;
        const userDeptId = req.user.departmentId;
        
        console.log(`[DELETE] User Role: ${userRole}, User Dept: ${userDeptId}`);

        if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'SUPERVISOR') {
            console.log('[DELETE] Forbidden: Insufficient role');
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete customer' });
        }
        
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: { owner: true }
        });
        
        if (!customer) {
            console.log('[DELETE] Customer not found');
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        const ownerDeptId = customer.owner?.departmentId ?? null;
        console.log(`[DELETE] Target Customer Owner Dept: ${ownerDeptId}`);

        // Supervisor/Manager can only delete if the customer's owner is in the same department
        if (userRole === 'MANAGER' || userRole === 'SUPERVISOR') {
             if (!ownerDeptId || ownerDeptId !== userDeptId) {
                 console.log('[DELETE] Forbidden: Cross-department deletion attempt');
                 return res.status(403).json({ message: 'Forbidden: Can only delete customers within your department' });
             }
        }
        
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                status: 'CHURNED',
                lastContactAt: new Date()
            }
        });
        
        console.log('[DELETE] Customer marked as CHURNED');
        res.json({ message: 'Customer deleted successfully', deleted: true, mode: 'soft' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: 'Internal server error', error: String(error) });
    }
});

export default router;
