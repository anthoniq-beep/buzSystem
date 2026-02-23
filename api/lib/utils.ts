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
        // Get self and ALL subordinates recursively
        let accessibleIds = [userId];
        let currentLevel = [userId];
        
        // Loop to find subordinates (breadth-first search)
        // Max depth safety check: 10 levels
        let depth = 0;
        while (currentLevel.length > 0 && depth < 10) {
            const subordinates = await prisma.user.findMany({
                where: { supervisorId: { in: currentLevel } },
                select: { id: true }
            });
            
            // Filter out already processed IDs to prevent cycles
            const nextLevel = subordinates.map(u => u.id).filter(id => !accessibleIds.includes(id));
            
            if (nextLevel.length === 0) break;
            
            accessibleIds = [...accessibleIds, ...nextLevel];
            currentLevel = nextLevel;
            depth++;
        }
        return accessibleIds;
    }
    
    // EMPLOYEE: Only self
    return [userId];
};
