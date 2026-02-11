
import AuditLog from '@/models/AuditLog';

interface AuditLogEntry {
    action: string;
    entity: string;
    entityId?: string;
    performedBy: string;
    details?: any;
    req?: Request;
}

export async function logAdminAction({
    action,
    entity,
    entityId,
    performedBy,
    details,
    req
}: AuditLogEntry) {
    try {
        let ipAddress = 'unknown';
        let userAgent = 'unknown';

        if (req) {
            ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
            userAgent = req.headers.get('user-agent') || 'unknown';
        }

        await AuditLog.create({
            action,
            entity,
            entityId,
            performedBy,
            details,
            ipAddress,
            userAgent,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent blocking the main action
    }
}
