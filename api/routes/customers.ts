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

        // 3. Create Commission if DEAL
        if (stage === 'DEAL' && contractAmount) {
            await prisma.commission.create({
                data: {
                    userId: req.user.userId,
                    customerId: parseInt(id),
                    amount: Number(contractAmount),
                    commission: 0, // Pending calculation
                    status: 'PENDING'
                }
            });
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
