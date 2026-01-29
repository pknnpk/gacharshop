import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import InventoryLog from '@/models/InventoryLog'; // In case we need to log something, though status change is enough on Order
import { verifyBeamWebhookSignature } from '@/lib/beam';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-beam-signature') || '';

        // 1. Security Check
        const isValid = await verifyBeamWebhookSignature(signature, body);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 2. Parse Event
        // Assuming Beam sends { type: 'transaction.succeeded', data: { order_id: '...', ... } }
        // Adjust based on actual API docs.
        const { type, data } = body;

        if (type !== 'transaction.succeeded') {
            return NextResponse.json({ message: 'Ignored event type' });
        }

        const orderId = data.order_id;
        if (!orderId) {
            return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
        }

        await dbConnect();

        // 3. Update Order - No transaction needed for single doc update unless we touch stock (we don't)
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') {
            return NextResponse.json({ message: 'Order already paid' });
        }

        // Update status
        order.status = 'paid';
        order.paymentId = data.transaction_id || order.paymentId; // Capture Beam transaction ID found in payload
        order.statusHistory.push({
            status: 'paid',
            reason: 'Payment confirmed via Beam Webhook',
            timestamp: new Date(),
            changedBy: null // System
        });

        await order.save();

        return NextResponse.json({ message: 'Order updated to PAID' });

    } catch (error: any) {
        console.error('Beam Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
