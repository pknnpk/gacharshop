
import mongoose, { Schema, model, models } from 'mongoose';
import '@/models/Category'; // Ensure Category model is registered
import '@/models/Location'; // Ensure Location model is registered

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
        inventory: [
            {
                location: {
                    type: Schema.Types.ObjectId,
                    ref: 'Location',
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            }
        ],
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
        costPrice: {
            type: Number,
            default: 0,
        },
        barcode: {
            type: String,
            sparse: true,
            unique: true,
        },
        brand: {
            type: String,
        },
        tags: [String],
        weight: {
            type: Number, // in grams
            default: 0,
        },
        dimensions: {
            length: { type: Number, default: 0 },
            width: { type: Number, default: 0 },
            height: { type: Number, default: 0 },
        },
        isPhysical: {
            type: Boolean,
            default: true,
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
