
import mongoose, { Schema, model, models } from 'mongoose';

const OrderItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
    },
});

const OrderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [OrderItemSchema],
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['reserved', 'paid', 'shipped', 'completed', 'cancelled'],
            default: 'reserved',
        },
        statusHistory: [
            {
                status: { type: String, required: true },
                changedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // User or null for system
                reason: { type: String },
                timestamp: { type: Date, default: Date.now }
            }
        ],
        paymentId: {
            type: String,
        },
        address: {
            type: String,
        },
        trackingInfo: {
            courier: String,
            trackingNumber: String,
            shippedAt: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Order = models.Order || model('Order', OrderSchema);

export default Order;
