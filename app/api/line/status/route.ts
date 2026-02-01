import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import { createOrderStatusMessage, sendLineMessage } from '@/lib/line';

/**
 * Line OA Self-Service Order Status Endpoint
 * 
 * This endpoint handles incoming messages from Line OA users
 * and returns their order status.
 * 
 * Expected payload from Line Webhook:
 * {
 *   "events": [
 *     {
 *       "replyToken": "xxx",
 *       "type": "message",
 *       "message": { "type": "text", "text": "Order #12345 status" }
 *     }
 *   ]
 * }
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { events } = body;

        if (!events || events.length === 0) {
            return NextResponse.json({ success: true, message: 'No events' });
        }

        await dbConnect();

        // Process each event
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                await handleTextMessage(event);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Line status endpoint error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Handle incoming text message from Line
 */
async function handleTextMessage(event: any) {
    const replyToken = event.replyToken;
    const messageText = event.message.text.trim();
    const userId = event.source?.userId;

    // Parse command from message
    const orderNumberMatch = messageText.match(/#?([A-Z0-9]+)/i);
    const command = messageText.toLowerCase();

    // Handle different commands
    if (command === 'my orders' || command === 'orders' || command === 'สถานะคำสั่งซื้อ') {
        await sendUserOrders(userId, replyToken);
    } else if (orderNumberMatch) {
        const orderNumber = orderNumberMatch[1];
        await sendOrderStatus(userId, orderNumber, replyToken);
    } else if (command.startsWith('help') || command === 'ช่วยเหลือ') {
        await sendHelpMessage(replyToken);
    } else {
        await sendUnknownCommandMessage(replyToken);
    }
}

/**
 * Send user's recent orders list
 */
async function sendUserOrders(userId: string, replyToken: string) {
    try {
        const user = await User.findOne({ lineUserId: userId });

        if (!user) {
            await sendLineReply(replyToken, [
                {
                    type: 'text',
                    text: '❌ We couldn\'t find your account.\n\nPlease link your Line account by logging in at least once.'
                }
            ]);
            return;
        }

        const orders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        if (orders.length === 0) {
            await sendLineReply(replyToken, [
                {
                    type: 'text',
                    text: '📦 You have no orders yet.\n\nVisit our shop to make your first purchase!'
                }
            ]);
            return;
        }

        const orderList = orders.map((order: any, index: number) => {
            const statusEmoji: Record<string, string> = {
                'reserved': '⏳',
                'paid': '✅',
                'shipped': '📦',
                'completed': '🎉',
                'cancelled': '❌',
                'refunded': '💰'
            };
            const statusText: Record<string, string> = {
                'reserved': 'Awaiting Payment',
                'paid': 'Payment Confirmed',
                'shipped': 'Shipped',
                'completed': 'Delivered',
                'cancelled': 'Cancelled',
                'refunded': 'Refunded'
            };

            const orderNum = order._id.toString().slice(-6).toUpperCase();
            return `${index + 1}. #${orderNum} ${statusEmoji[order.status] || '❓'} ${statusText[order.status] || order.status}`;
        }).join('\n');

        await sendLineReply(replyToken, [
            {
                type: 'text',
                text: `📋 Your recent orders:\n\n${orderList}\n\nReply with "Order #XXX" for details.`
            }
        ]);
    } catch (error) {
        console.error('Error sending user orders:', error);
        await sendLineReply(replyToken, [
            {
                type: 'text',
                text: '❌ Error fetching your orders. Please try again.'
            }
        ]);
    }
}

/**
 * Send specific order status
 */
async function sendOrderStatus(userId: string, orderNumber: string, replyToken: string) {
    try {
        // Find user
        const user = await User.findOne({ lineUserId: userId });

        if (!user) {
            await sendLineReply(replyToken, [
                {
                    type: 'text',
                    text: '❌ We couldn\'t find your account.'
                }
            ]);
            return;
        }

        // Find order by matching the last 6 characters of the ID
        const orderId = orderNumber.toUpperCase();
        const order = await Order.findOne({
            user: user._id,
            _id: { $regex: `${orderId}$` }
        }).populate('items.product');

        if (!order) {
            await sendLineReply(replyToken, [
                {
                    type: 'text',
                    text: `❌ Order #${orderNumber} not found.\n\nPlease check the order number and try again.`
                }
            ]);
            return;
        }

        // Build order info
        const orderInfo = {
            orderId: order._id.toString(),
            orderNumber: order._id.toString().slice(-6).toUpperCase(),
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items.map((item: any) => ({
                name: item.product?.name || 'Product',
                quantity: item.quantity,
                price: item.price
            })),
            trackingInfo: order.trackingInfo ? {
                courier: order.trackingInfo.courier,
                trackingNumber: order.trackingInfo.trackingNumber,
                url: `https://track.example.com/${order.trackingInfo.trackingNumber}`
            } : undefined,
            createdAt: order.createdAt
        };

        // Create and send Line message
        const lineMessage = createOrderStatusMessage(orderInfo);
        await sendLineReply(replyToken, [lineMessage]);
    } catch (error) {
        console.error('Error sending order status:', error);
        await sendLineReply(replyToken, [
            {
                type: 'text',
                text: '❌ Error fetching order details. Please try again.'
            }
        ]);
    }
}

/**
 * Send help message
 */
async function sendHelpMessage(replyToken: string) {
    await sendLineReply(replyToken, [
        {
            type: 'text',
            text: '📚 GacharShop Help\n\n' +
                'Available commands:\n' +
                '• "My Orders" - View your recent orders\n' +
                '• "Order #XXX" - Get details for a specific order\n' +
                '• "Help" - Show this help message\n\n' +
                '💡 Tip: You can tap on quick reply buttons for faster navigation!'
        }
    ]);
}

/**
 * Send unknown command message
 */
async function sendUnknownCommandMessage(replyToken: string) {
    await sendLineReply(replyToken, [
        {
            type: 'text',
            text: '🤔 I don\'t understand that command.\n\n' +
                'Try:\n' +
                '• "My Orders" - View your orders\n' +
                '• "Order #12345" - Check order status\n' +
                '• "Help" - Show help',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        action: { type: 'message', label: 'My Orders', text: 'My Orders' }
                    },
                    {
                        type: 'action',
                        action: { type: 'message', label: 'Help', text: 'Help' }
                    }
                ]
            }
        }
    ]);
}

/**
 * Send reply to Line webhook
 */
async function sendLineReply(replyToken: string, messages: any[]) {
    const LINE_API_URL = process.env.LINE_API_URL || 'https://api.line.me/v2';
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.log('[Line Reply] No access token configured, skipping');
        return;
    }

    try {
        await fetch(`${LINE_API_URL}/bot/message/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                replyToken,
                messages
            })
        });
    } catch (error) {
        console.error('Failed to send Line reply:', error);
    }
}

/**
 * GET endpoint to check webhook health
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'line-status-webhook',
        timestamp: new Date().toISOString()
    });
}
