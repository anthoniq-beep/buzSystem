import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
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
            assignedTo: {
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
        assignedTo: {
            select: {
                id: true,
                name: true,
                username: true
            }
        },
        communications: true,
        contracts: true
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
router.post('/', authenticate, async (req, res) => {
    try {
        const customer = await prisma.customer.create({
            data: req.body
        });
        res.json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Internal server error' });
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
