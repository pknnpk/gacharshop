
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from '../models/User';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
}

async function fixIndexes() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to DB');

        // Sync indexes for User model
        // This will drop indexes that don't match the schema and create new ones
        await User.syncIndexes();
        console.log('User indexes synced successfully');

        // Optional: List indexes to verify
        const indexes = await User.listIndexes();
        console.log('Current Indexes:', indexes);

    } catch (error) {
        console.error('Error syncing indexes:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();
