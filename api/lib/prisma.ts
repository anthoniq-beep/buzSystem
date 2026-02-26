import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

try {
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  // Create a dummy proxy to prevent crash on import, but will fail on usage
  prisma = new Proxy({} as PrismaClient, {
    get: () => {
      throw new Error('Prisma Client failed to initialize. Check server logs.');
    }
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
