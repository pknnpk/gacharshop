
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
    await connectToDatabase();
    try {
        const categories = await Category.find({}).sort({ name: 1 }).lean();
        return NextResponse.json(categories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
