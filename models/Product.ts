
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
