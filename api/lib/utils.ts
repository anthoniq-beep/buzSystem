import prisma from './prisma';

export const getAccessibleUserIds = async (currentUser: any) => {
    const { userId, role, departmentId } = currentUser;
    
    if (role === 'ADMIN') {
        return undefined; // No filter
    }
    
    if (role === 'MANAGER') {
        // Get users in same department
        if (!departmentId) return [userId];
        const users = await prisma.user.findMany({
            where: { departmentId: departmentId },
            select: { id: true }
        });
        return users.map(u => u.id);
    }
    
    if (role === 'SUPERVISOR') {
        // Get self and direct subordinates
        const users = await prisma.user.findMany({
            where: { 
                OR: [
                    { id: userId },
                    { supervisorId: userId }
                ]
            },
            select: { id: true }
        });
        return users.map(u => u.id);
    }
    
    // EMPLOYEE: Only self
    return [userId];
};
