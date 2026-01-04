
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from '../models/User';

// Hardcoded for the one-off fix to Prod, or read from env
const PROD_URI = "mongodb+srv://p:475861239@cluster0.p0zxn.mongodb.net/gacharshop_prod";

async function fixIndexes() {
    try {
        console.log('Connecting to PRODUCTION DB:', PROD_URI);
        await mongoose.connect(PROD_URI);
        console.log('Connected to Prod DB');

        await User.syncIndexes();
        console.log('User indexes synced successfully on PROD');

    } catch (error) {
        console.error('Error syncing indexes:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();
