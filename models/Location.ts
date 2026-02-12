
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
            enum: ['warehouse', 'store', 'zone', 'aisle', 'shelf', 'bin', 'virtual'],
            default: 'warehouse',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Location',
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

LocationSchema.virtual('children', {
    ref: 'Location',
    localField: '_id',
    foreignField: 'parent',
});

// Force rebuild model in development to apply schema changes
if (process.env.NODE_ENV === 'development' && models.Location) {
    delete models.Location;
}

const Location = models.Location || model('Location', LocationSchema);

export default Location;
