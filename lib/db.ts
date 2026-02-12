
import mongoose from 'mongoose';

// Register models to ensure they are available for populate refs
import '@/models/Category';
import '@/models/Location';
import '@/models/Product';
import '@/models/User'; // Good practice to include others
import '@/models/Order';
import '@/models/StockHistory';

const MONGODB_URI = process.env.MONGODB_URI;



/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongoose: MongooseCache;
    // eslint-disable-next-line no-var
    var mongoose_fix: MongooseCache;
}

// Use a new global key to force reset during this debug session
let cached = global.mongoose_fix;

if (!cached) {
    cached = global.mongoose_fix = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (!MONGODB_URI) {
        throw new Error(
            'Please define the MONGODB_URI environment variable inside .env.local'
        );
    }

    // Log intent to connect
    // console.log("DB: connectToDatabase called. Cached conn state:", cached.conn?.readyState);

    if (cached.conn) {
        if (cached.conn.readyState === 1) {
            // console.log("DB: Using cached ready connection");
            return cached.conn;
        }
        console.log("DB: Cached connection exists but not ready (state " + cached.conn.readyState + "). Resetting.");
        // If connection is not ready (0=disconnected, 2=connecting, 3=disconnecting), 
        // we might want to wait if it's 2, or reset if it's 0/3. 
        // For safety, let's reset.
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        console.log("DB: Initiating new MongoDB connection...");
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            console.log("DB: MongoDB connected successfully");
            return mongoose.connection;
        });
    } else {
        console.log("DB: Awaiting existing connection promise...");
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error("DB: MongoDB connection error:", e);
        throw e;
    }

    return cached.conn;
}

export default connectToDatabase;
