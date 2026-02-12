import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import StockHistory from '@/models/StockHistory';
import User from '@/models/User'; // Ensure User model is registered
import Location from '@/models/Location'; // Ensure Location model is registered

export async function GET(req: NextRequest) {
    await connectToDatabase();

    // Check Admin Auth
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const locationId = searchParams.get('locationId');
        const productId = searchParams.get('productId');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query: any = {};

        if (locationId) {
            query.location = locationId;
        }

        if (productId) {
            query.product = productId;
        }

        const history = await StockHistory.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('user', 'name email')
            .populate('product', 'name sku images')
            .populate('location', 'name type')
            .lean();

        return NextResponse.json(history);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
