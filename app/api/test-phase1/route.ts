
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
    const results = {
        database: {
            status: 'unknown',
            message: '',
            modelCount: 0,
        },
        auth: {
            googleConfigured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
            lineConfigured: !!process.env.LINE_CHANNEL_ID && !!process.env.LINE_CHANNEL_SECRET,
            nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        },
    };

    try {
        const conn = await connectToDatabase();
        results.database.status = 'connected';
        results.database.message = `Connected to ${conn.name}`;
        results.database.modelCount = mongoose.modelNames().length;
    } catch (error: any) {
        results.database.status = 'error';
        results.database.message = error.message;
    }

    return NextResponse.json(results);
}
