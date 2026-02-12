
import mongoose, { Schema, model, models } from 'mongoose';

const CategorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        image: {
            type: String,
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        level: {
            type: Number,
            default: 0,
        },
        ancestors: [{
            _id: {
                type: Schema.Types.ObjectId,
                ref: 'Category',
            },
            name: String,
            slug: String,
        }],
    },
    {
        timestamps: true,
    }
);

const Category = models.Category || model('Category', CategorySchema);

export default Category;
