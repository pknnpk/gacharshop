
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
        type: {
            type: String,
            enum: ['restock', 'sale', 'adjustment'],
            required: true,
        },
        reason: {
            type: String,
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
