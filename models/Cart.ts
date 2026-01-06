
import mongoose, { Schema, model, models } from 'mongoose';

const CartItemSchema = new Schema({
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
    expiresAt: {
        type: Date,
        required: true,
    },
});

const CartSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        items: [CartItemSchema],
    },
    {
        timestamps: true,
    }
);

const Cart = models.Cart || model('Cart', CartSchema);

export default Cart;
