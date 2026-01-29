import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const phone = searchParams.get('phone'); // Optional verification as discussed

    if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    try {
        await dbConnect();
        const order = await Order.findById(orderId).select('status trackingInfo address createdAt totalAmount');

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Ideally verify phone number matches address or user profile?
        // For now, if "Phone" param is sent, we just check if it's "1234" (Mock) or ignore for MVP as data might not extract easily from Address string.

        return NextResponse.json(order);

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
