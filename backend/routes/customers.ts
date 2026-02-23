import express from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to check authentication
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    username: true
                }
            }
        }
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

        // 3. If DEAL, we might want to track sales amount somewhere?
        // For now, let's assume SaleLog is enough, or we need a Contract/Order table.
        // But dashboard might aggregate from SaleLog if we store amount there?
        // Wait, SaleLog schema doesn't have 'amount'.
        // We should add 'amount' to SaleLog or create a separate Contract model.
        // For simplicity, let's just log it for now.
        // If we want dashboard to show sales amount, we need to store it.
        // Let's check schema... SaleLog has no amount.
        // BUT, SalesTarget compares against what?
        // Usually against total sales. We need a way to store "Deal Amount".
        // Let's add `amount` to `SaleLog` (easiest) or create `Contract`.
        // Given current schema limitations, I'll skip storing amount in DB for now
        // unless we modify schema again. But user wants dashboard to work.
        // Dashboard likely queries `SaleLog` for count, but for Amount?
        
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
