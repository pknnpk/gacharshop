
import mongoose, { Schema, model, models } from 'mongoose';

const LocationSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        address: {
            type: String,
        },
        type: {
            type: String,
            enum: ['warehouse', 'store', 'virtual'],
            default: 'warehouse',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Location = models.Location || model('Location', LocationSchema);

export default Location;
