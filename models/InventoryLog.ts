
import mongoose, { Schema, model, models } from 'mongoose';

const InventoryLogSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        change: {
            type: Number,
            required: true,
        }, // Positive for check-in, negative for check-out
        beforeBalance: {
            type: Number,
            required: true,
        },
        afterBalance: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['restock', 'sale', 'adjustment', 'return', 'cancel'],
            required: true,
        },
        reason: {
            type: String,
        },
        referenceType: {
            type: String,
            enum: ['Order', 'System', 'Manual'],
            default: 'System'
        },
        referenceId: {
            type: String, // Can be Order ID or empty
        },
        metadata: {
            type: Schema.Types.Mixed, // Flexible field for any extra context
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const InventoryLog = models.InventoryLog || model('InventoryLog', InventoryLogSchema);

export default InventoryLog;
