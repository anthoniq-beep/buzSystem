import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import commonRoutes from './routes/common';
import trainingRoutes from './routes/training';
import prisma from './lib/prisma'; // Use singleton

import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const apiRouter = express.Router(); // Define apiRouter early

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for now (for debugging)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve Static Files (Frontend)
// Try to serve from './public' (deployment) or '../frontend/dist' (local dev)
const localFrontendDist = path.join(process.cwd(), '../frontend/dist');
const deployFrontendDist = path.join(process.cwd(), 'public');

// Check if 'public' exists
import fs from 'fs';
const frontendDist = fs.existsSync(deployFrontendDist) ? deployFrontendDist : localFrontendDist;

app.use(express.static(frontendDist));

// Debug Route
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'API is working',
        url: req.url,
        env: process.env.NODE_ENV,
        db_url_exists: !!process.env.DATABASE_URL
    });
});

// Simple Hello Route (No DB)
apiRouter.get('/hello', (req, res) => {
    res.json({ 
        message: 'Hello from API',
        cwd: process.cwd(),
        env: process.env.NODE_ENV
    });
});

// DB Connection Test Route
app.get('/api/db-test', async (req, res) => {
    try {
        // Try a simple query
        const count = await prisma.user.count();
        res.json({ 
            status: 'ok', 
            userCount: count,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV
            }
        });
    } catch (error) {
        console.error('DB Connection Test Failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed', 
            error: String(error) 
        });
    }
});

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/training', trainingRoutes);
apiRouter.use('/', commonRoutes);

// Mount all routes under /api
app.use('/api', apiRouter);

// Handle SPA routing (return index.html for all non-API routes)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
         res.status(404).json({ message: 'API endpoint not found' });
    } else {
         res.sendFile(path.join(frontendDist, 'index.html'));
    }
});

// Error Handling
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Export for Vercel
export default app;

// Start Server (Only for local dev or traditional hosting)
// Vercel sets NODE_ENV to production, but we might want to run locally too.
// Check if running directly (not imported)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
