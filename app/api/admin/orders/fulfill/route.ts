import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const admin = await User.findOne({ email: session.user.email });

        // Admin role check
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { orderId, trackingNumber, courier } = body;

        if (!orderId || !trackingNumber) {
            return NextResponse.json({ error: 'Order ID and Tracking Number are required' }, { status: 400 });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'paid') {
            return NextResponse.json({ error: 'Order is not in PAID status' }, { status: 400 });
        }

        order.status = 'shipped';
        order.statusHistory.push({
            status: 'shipped',
            reason: `Shipped via ${courier || 'Unknown'}. Tracking: ${trackingNumber}`,
            timestamp: new Date(),
            changedBy: admin._id,
        });

        // Save Tracking Info
        order.trackingInfo = {
            courier: courier || 'Unknown',
            trackingNumber: trackingNumber,
            shippedAt: new Date()
        };

        await order.save();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
