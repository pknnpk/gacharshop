
import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
        },
        image: {
            type: String,
        },
        role: {
            type: String,
            default: 'user',
            enum: ['user', 'admin'],
        },
        provider: {
            type: String,
        },
        providerId: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent overwrite of the model during HMR
const User = models.User || model('User', UserSchema);

export default User;
