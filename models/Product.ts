
import mongoose, { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        sku: {
            type: String,
            sparse: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        images: {
            type: [String],
            default: [],
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
        },
        // POSPOS Integration
        posposStock: {
            type: Number,
            default: 0,
        },
        posposLastSyncAt: {
            type: Date,
        },
        reservationDuration: {
            type: Number,
            default: 60, // Minutes
        },
        quotaLimit: {
            type: Number,
            default: 0, // 0 = unlimited
        },
        status: {
            type: String,
            enum: ['active', 'draft', 'archived'],
            default: 'draft',
        },
    },
    {
        timestamps: true,
    }
);

const Product = models.Product || model('Product', ProductSchema);

export default Product;
