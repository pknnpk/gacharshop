/**
 * Line OA Integration Library
 * 
 * Provides integration with Line Messaging API for:
 * - Sending tracking notifications
 * - Self-service order status bot
 * - Admin user tagging
 * - Rich Menu configuration
 */

import { debug, info, warn, errorLog } from './middleware/logger';

// Line API configuration
const LINE_API_URL = process.env.LINE_API_URL || 'https://api.line.me/v2';
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_OA_USER_ID = process.env.LINE_OA_USER_ID || '';

/**
 * Line OA Message types
 */
export interface LineTextMessage {
    type: 'text';
    text: string;
    quickReply?: {
        items: Array<{
            type: 'action';
            action: {
                type: 'message' | 'uri' | 'postback';
                label: string;
                text?: string;
                uri?: string;
                data?: string;
            };
        }>;
    };
}

export interface LineTemplateMessage {
    type: 'template';
    altText: string;
    template: {
        type: 'buttons' | 'carousel' | 'confirm';
        text: string;
        actions: Array<{
            type: 'message' | 'uri' | 'postback';
            label: string;
            text?: string;
            uri?: string;
            data?: string;
        }>;
        title?: string;
        thumbnailImageUrl?: string;
    };
}

export interface LineFlexMessage {
    type: 'flex';
    altText: string;
    contents: any;
}

export type LineMessage = LineTextMessage | LineTemplateMessage | LineFlexMessage;

export interface LinePushMessageRequest {
    to: string;
    messages: LineMessage[];
}

/**
 * User profile from Line
 */
export interface LineUserProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

/**
 * Order info for Line notifications
 */
export interface OrderInfo {
    orderId: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    trackingInfo?: {
        courier: string;
        trackingNumber: string;
        url?: string;
    };
    createdAt: Date;
}

/**
 * Check if Line OA is configured
 */
export function isLineConfigured(): boolean {
    return !!(LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ID);
}

/**
 * Make authenticated request to Line API
 */
async function lineApiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
): Promise<T> {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        throw new Error('Line channel access token not configured');
    }

    const url = `${LINE_API_URL}${endpoint}`;

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const errorText = await response.text();
        errorLog(`Line API error: ${response.status} ${response.statusText}`, {
            endpoint,
            error: errorText
        });
        throw new Error(`Line API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}

/**
 * Send push message to Line user
 */
export async function sendLineMessage(
    to: string,
    messages: LineMessage[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    debug(`Sending Line message to user ${to}`);

    if (!isLineConfigured()) {
        warn('Line not configured, skipping message');
        return { success: true }; // Return success in development
    }

    try {
        const result = await lineApiRequest<{ messageId: string }>('/bot/message/push', 'POST', {
            to,
            messages
        } as LinePushMessageRequest);

        debug('Line message sent successfully');
        return { success: true, messageId: result.messageId };
    } catch (error: any) {
        errorLog('Failed to send Line message', { to, error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Send text message to Line user
 */
export async function sendLineTextMessage(
    to: string,
    text: string,
    quickReplies?: Array<{ label: string; text: string }>
): Promise<{ success: boolean; error?: string }> {
    const message: LineTextMessage = {
        type: 'text',
        text
    };

    if (quickReplies && quickReplies.length > 0) {
        message.quickReply = {
            items: quickReplies.map(qr => ({
                type: 'action',
                action: {
                    type: 'message',
                    label: qr.label,
                    text: qr.text
                }
            }))
        };
    }

    return sendLineMessage(to, [message]);
}

/**
 * Send tracking notification to Line user
 */
export async function sendTrackingNotification(
    lineUserId: string,
    orderInfo: OrderInfo
): Promise<{ success: boolean; error?: string }> {
    debug(`Sending tracking notification for order ${orderInfo.orderId}`);

    const trackingUrl = orderInfo.trackingInfo?.url
        || `https://track.example.com/${orderInfo.trackingInfo?.trackingNumber}`;

    const message: LineTemplateMessage = {
        type: 'template',
        altText: `Order ${orderInfo.orderNumber} has been shipped!`,
        template: {
            type: 'buttons',
            text: `📦 Your order #${orderInfo.orderNumber} has been shipped!\n\n` +
                `📬 Courier: ${orderInfo.trackingInfo?.courier}\n` +
                `🔢 Tracking: ${orderInfo.trackingInfo?.trackingNumber}`,
            actions: [
                {
                    type: 'uri' as const,
                    label: 'Track Package',
                    uri: trackingUrl
                },
                {
                    type: 'message' as const,
                    label: 'Order Status',
                    text: `Order #${orderInfo.orderNumber} status`
                }
            ]
        }
    };

    return sendLineMessage(lineUserId, [message]);
}

/**
 * Send order confirmation notification
 */
export async function sendOrderConfirmation(
    lineUserId: string,
    orderInfo: OrderInfo
): Promise<{ success: boolean; error?: string }> {
    const message: LineTextMessage = {
        type: 'text',
        text: `✅ Order #${orderInfo.orderNumber} confirmed!\n\n` +
            `Total: ฿${orderInfo.totalAmount.toLocaleString()}\n` +
            `Items: ${orderInfo.items.length}\n\n` +
            `We'll notify you when it ships!`,
        quickReply: {
            items: [
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: 'Check Status',
                        text: `Order #${orderInfo.orderNumber} status`
                    }
                }
            ]
        }
    };

    return sendLineMessage(lineUserId, [message]);
}

/**
 * Get user profile from Line
 */
export async function getLineUserProfile(userId: string): Promise<LineUserProfile | null> {
    if (!isLineConfigured()) {
        return null;
    }

    try {
        const profile = await lineApiRequest<LineUserProfile>(`/bot/profile/${userId}`);
        return profile;
    } catch (error) {
        errorLog('Failed to get Line user profile', { userId });
        return null;
    }
}

/**
 * Create Line OA self-service status message
 */
export function createOrderStatusMessage(orderInfo: OrderInfo): LineMessage {
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

    const trackingActions: Array<{
        type: 'message' | 'uri' | 'postback';
        label: string;
        text?: string;
        uri?: string;
        data?: string;
    }> = [];

    if (orderInfo.trackingInfo) {
        trackingActions.push({
            type: 'uri',
            label: 'Track Package',
            uri: `https://track.example.com/${orderInfo.trackingInfo.trackingNumber}`
        });
    }

    trackingActions.push({
        type: 'message',
        label: 'Help',
        text: `Help with order #${orderInfo.orderNumber}`
    });

    return {
        type: 'template',
        altText: `Order #${orderInfo.orderNumber} - ${statusText[orderInfo.status]}`,
        template: {
            type: 'buttons',
            title: `Order #${orderInfo.orderNumber}`,
            text: `${statusEmoji[orderInfo.status]} ${statusText[orderInfo.status]}\n\n` +
                `Total: ฿${orderInfo.totalAmount.toLocaleString()}\n` +
                `Date: ${orderInfo.createdAt.toLocaleDateString()}` +
                (orderInfo.trackingInfo
                    ? `\n\n📬 ${orderInfo.trackingInfo.courier}: ${orderInfo.trackingInfo.trackingNumber}`
                    : ''),
            actions: trackingActions
        }
    };
}

/**
 * Broadcast message to all Line OA followers
 */
export async function broadcastLineMessage(
    messages: LineMessage[]
): Promise<{ success: boolean; error?: string }> {
    debug('Broadcasting Line message to all followers');

    if (!isLineConfigured()) {
        warn('Line not configured, skipping broadcast');
        return { success: true };
    }

    try {
        await lineApiRequest('/bot/message/broadcast', 'POST', { messages });
        return { success: true };
    } catch (error: any) {
        errorLog('Failed to broadcast Line message', { error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Send push notification to Line OA (for admin use)
 */
export async function sendAdminNotification(
    message: string
): Promise<{ success: boolean; error?: string }> {
    if (!LINE_OA_USER_ID) {
        warn('Line OA user ID not configured');
        return { success: true };
    }

    return sendLineTextMessage(LINE_OA_USER_ID, `📢 Admin Notification:\n\n${message}`);
}

/**
 * Mock Line functions for development
 */
export async function mockSendLineMessage(
    to: string,
    messages: LineMessage[]
): Promise<{ success: boolean; messageId: string }> {
    debug(`[MOCK] Sending Line message to ${to}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
        success: true,
        messageId: `mock_msg_${Date.now()}`
    };
}

/**
 * Rich Menu action type
 */
interface RichMenuAction {
    type: 'message' | 'uri' | 'postback';
    label?: string;
    text?: string;
    uri?: string;
    data?: string;
}

/**
 * Rich Menu area bounds
 */
interface RichMenuBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Rich Menu area
 */
interface RichMenuArea {
    bounds: RichMenuBounds;
    action: RichMenuAction;
}

/**
 * Rich Menu configuration
 */
export interface RichMenu {
    richMenuId: string;
    richMenuAliasId: string;
    name: string;
    chatBarText: string;
    areas: RichMenuArea[];
}

export const DEFAULT_RICH_MENU: RichMenu = {
    richMenuId: 'default-menu',
    richMenuAliasId: 'gachar-shop-menu',
    name: 'GacharShop Menu',
    chatBarText: '🛒 Menu',
    areas: [
        {
            bounds: { x: 0, y: 0, width: 833, height: 843 },
            action: { type: 'uri', uri: 'https://gacharshop.com/products' }
        },
        {
            bounds: { x: 833, y: 0, width: 833, height: 843 },
            action: { type: 'message', text: 'My Orders' }
        },
        {
            bounds: { x: 1666, y: 0, width: 833, height: 843 },
            action: { type: 'uri', uri: 'https://gacharshop.com/cart' }
        }
    ]
};

/**
 * Create or update Rich Menu
 */
export async function createRichMenu(
    richMenu: RichMenu
): Promise<{ success: boolean; richMenuId?: string; error?: string }> {
    if (!isLineConfigured()) {
        warn('Line not configured, skipping Rich Menu creation');
        return { success: true };
    }

    try {
        // Create Rich Menu structure
        const result = await lineApiRequest<{ richMenuId: string }>('/bot/richmenu', 'POST', {
            richMenu: {
                name: richMenu.name,
                chatBarText: richMenu.chatBarText,
                areas: richMenu.areas.map(area => ({
                    bounds: area.bounds,
                    action: area.action
                }))
            }
        });

        info('Rich Menu created');
        return { success: true, richMenuId: result.richMenuId };
    } catch (error: any) {
        errorLog('Failed to create Rich Menu', { error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Set Rich Menu as default for all users
 */
export async function setDefaultRichMenu(
    richMenuId: string
): Promise<{ success: boolean; error?: string }> {
    if (!isLineConfigured()) {
        return { success: true };
    }

    try {
        await lineApiRequest(`/bot/richmenu/${richMenuId}/default`, 'POST');
        return { success: true };
    } catch (error: any) {
        errorLog('Failed to set default Rich Menu', { richMenuId, error: error.message });
        return { success: false, error: error.message };
    }
}
