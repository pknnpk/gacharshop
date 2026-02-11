/**
 * Email Notification Service
 * 
 * Sends email notifications for order updates, confirmations, etc.
 * Uses nodemailer for SMTP sending.
 */

import nodemailer from 'nodemailer';
import { debug, info, errorLog } from './middleware/logger';

// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('SMTP credentials not configured');
        }
        transporter = nodemailer.createTransport(emailConfig);
    }
    return transporter;
}

/**
 * Email types
 */
export type EmailType =
    | 'order_confirmation'
    | 'order_shipped'
    | 'order_delivered'
    | 'order_cancelled'
    | 'payment_received'
    | 'stock_low'
    | 'password_reset';

/**
 * Email template interface
 */
interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

/**
 * Get email template based on type
 */
function getEmailTemplate(type: EmailType, data: Record<string, any>): EmailTemplate {
    const templates: Record<EmailType, EmailTemplate> = {
        order_confirmation: {
            subject: `Order Confirmed - #${data.orderNumber}`,
            html: `
                <h1>Order Confirmed</h1>
                <p>Thank you for your order!</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Total:</strong> ฿${data.totalAmount.toLocaleString()}</p>
                <p>We will process your order shortly.</p>
            `,
            text: `Order Confirmed - #${data.orderNumber}\n\nThank you for your order!\nTotal: ฿${data.totalAmount.toLocaleString()}`,
        },
        order_shipped: {
            subject: `Order Shipped - #${data.orderNumber}`,
            html: `
                <h1>Order Shipped</h1>
                <p>Your order has been shipped!</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Tracking:</strong> ${data.trackingNumber}</p>
                <p><strong>Courier:</strong> ${data.courier}</p>
            `,
            text: `Order Shipped - #${data.orderNumber}\n\nTracking: ${data.trackingNumber}\nCourier: ${data.courier}`,
        },
        order_delivered: {
            subject: `Order Delivered - #${data.orderNumber}`,
            html: `
                <h1>Order Delivered</h1>
                <p>Your order has been delivered!</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p>We hope you enjoy your purchase.</p>
            `,
            text: `Order Delivered - #${data.orderNumber}\n\nWe hope you enjoy your purchase!`,
        },
        order_cancelled: {
            subject: `Order Cancelled - #${data.orderNumber}`,
            html: `
                <h1>Order Cancelled</h1>
                <p>Your order has been cancelled.</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.refundAmount ? `<p><strong>Refund:</strong> ฿${data.refundAmount.toLocaleString()}</p>` : ''}
            `,
            text: `Order Cancelled - #${data.orderNumber}\n\nReason: ${data.reason}`,
        },
        payment_received: {
            subject: `Payment Received - #${data.orderNumber}`,
            html: `
                <h1>Payment Received</h1>
                <p>We've received your payment.</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Amount:</strong> ฿${data.amount.toLocaleString()}</p>
            `,
            text: `Payment Received - #${data.orderNumber}\n\nAmount: ฿${data.amount.toLocaleString()}`,
        },
        stock_low: {
            subject: `Low Stock Alert: ${data.productName}`,
            html: `
                <h1>Low Stock Alert</h1>
                <p><strong>Product:</strong> ${data.productName}</p>
                <p><strong>Current Stock:</strong> ${data.currentStock}</p>
                <p>Please restock soon.</p>
            `,
            text: `Low Stock Alert: ${data.productName}\n\nCurrent Stock: ${data.currentStock}`,
        },
        password_reset: {
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>Click the link below to reset your password:</p>
                <p><a href="${data.resetUrl}">Reset Password</a></p>
                <p>This link expires in 1 hour.</p>
            `,
            text: `Password Reset\n\nClick the link below to reset your password:\n${data.resetUrl}\n\nThis link expires in 1 hour.`,
        },
    };

    return templates[type];
}

/**
 * Send an email
 */
export async function sendEmail(
    to: string,
    type: EmailType,
    data: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const template = getEmailTemplate(type, data);
        const fromName = process.env.EMAIL_FROM_NAME || 'GacharShop';
        const fromEmail = process.env.EMAIL_FROM || 'noreply@gacharshop.com';

        const transporter = getTransporter();

        const result = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });

        info('Email sent', { metadata: { to, emailType: type, messageId: result.messageId } });

        return {
            success: true,
            messageId: result.messageId,
        };
    } catch (error: any) {
        errorLog('Failed to send email', { metadata: { to, emailType: type, error: error.message } });
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(
    email: string,
    orderId: string,
    orderNumber: string,
    totalAmount: number
): Promise<{ success: boolean; error?: string }> {
    const result = await sendEmail(email, 'order_confirmation', {
        orderId,
        orderNumber,
        totalAmount,
    });
    return { success: result.success, error: result.error };
}

/**
 * Send order shipped email
 */
export async function sendOrderShipped(
    email: string,
    orderId: string,
    orderNumber: string,
    trackingNumber: string,
    courier: string
): Promise<{ success: boolean; error?: string }> {
    const result = await sendEmail(email, 'order_shipped', {
        orderId,
        orderNumber,
        trackingNumber,
        courier,
    });
    return { success: result.success, error: result.error };
}

/**
 * Send order cancelled email
 */
export async function sendOrderCancelled(
    email: string,
    orderId: string,
    orderNumber: string,
    reason: string,
    refundAmount?: number
): Promise<{ success: boolean; error?: string }> {
    const result = await sendEmail(email, 'order_cancelled', {
        orderId,
        orderNumber,
        reason,
        refundAmount,
    });
    return { success: result.success, error: result.error };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
    email: string,
    resetUrl: string
): Promise<{ success: boolean; error?: string }> {
    const result = await sendEmail(email, 'password_reset', { resetUrl });
    return { success: result.success, error: result.error };
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
    try {
        const transporter = getTransporter();
        await transporter.verify();
        info('Email connection verified');
        return true;
    } catch (error: any) {
        errorLog('Email connection failed', { error: error.message });
        return false;
    }
}

/**
 * Mock email service for development/testing
 */
export async function mockSendEmail(
    to: string,
    type: EmailType,
    data: Record<string, any>
): Promise<{ success: boolean; messageId: string }> {
    debug('[MOCK] Email sent', { metadata: { to, emailType: type, data } });
    return {
        success: true,
        messageId: `mock-${Date.now()}`,
    };
}
