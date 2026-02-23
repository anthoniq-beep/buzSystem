import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import commonRoutes from './routes/common';
import prisma from './lib/prisma'; // Use singleton

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for now (for debugging)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/', commonRoutes);

// Mount all routes under /api
app.use('/api', apiRouter);

// Also mount under root for local dev convenience if accessing directly without /api prefix
// (Optional, but helps if local dev proxy strips /api)
// app.use('/', apiRouter);

// Error Handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
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
