
import mongoose, { Schema, model, models } from 'mongoose';

const AuditLogSchema = new Schema(
    {
        action: {
            type: String,
            required: true,
        },
        entity: {
            type: String,
            required: true,
        },
        entityId: {
            type: String, // ID of the affected entity
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        details: {
            type: Schema.Types.Mixed,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    {
        timestamps: true,
        capped: { size: 5242880, max: 5000 } // 5MB or 5000 docs
    }
);

const AuditLog = models.AuditLog || model('AuditLog', AuditLogSchema);

export default AuditLog;
