import prisma from './prisma';

export async function getAccessibleUserIds(user: any) {
    if (!user) return null; // Should not happen if authenticated
    const currentUserId = user.userId ?? user.id;

    if (user.role === 'ADMIN') return null; // All access

    if (user.role === 'MANAGER') {
        if (!user.departmentId) return currentUserId ? [currentUserId] : []; // Manager with no dept sees only self?
        // Get all users in department
        const users = await prisma.user.findMany({
            where: { departmentId: user.departmentId },
            select: { id: true }
        });
        return users.map((u: any) => u.id);
    }

    if (user.role === 'SUPERVISOR') {
        if (!user.departmentId) return currentUserId ? [currentUserId] : [];
        // Supervisor sees self and subordinates (Wait, supervisor logic might be dept based too?)
        // Let's assume Supervisor sees department for now, OR specific subordinates
        // Usually Supervisor sees Dept.
        const users = await prisma.user.findMany({
            where: { departmentId: user.departmentId },
            select: { id: true }
        });
        return users.map((u: any) => u.id);
    }

    return currentUserId ? [currentUserId] : [];
}
