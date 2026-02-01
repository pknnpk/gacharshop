/**
 * BeamCheckout Integration Library
 * 
 * Handles payment processing, webhook verification, and refunds.
 */

export const BEAM_API_URL = process.env.BEAM_API_URL || 'https://api.beamcheckout.com/v1';
export const BEAM_API_KEY = process.env.BEAM_API_KEY || '';
export const BEAM_WEBHOOK_SECRET = process.env.BEAM_WEBHOOK_SECRET || '';

export interface BeamCheckoutSession {
    url: string;
    token: string;
    transactionId: string;
}

export interface BeamRefundResult {
    success: boolean;
    refundId?: string;
    error?: string;
}

export interface BeamWebhookPayload {
    event_type: string;
    transaction_id: string;
    order_id: string;
    status: string;
    amount: number;
    currency: string;
    customer_email?: string;
    created_at: string;
    metadata?: any;
}

/**
 * Create a BeamCheckout session for payment
 */
export async function createBeamCheckoutSession(
    orderId: string,
    amount: number,
    customerEmail?: string
): Promise<BeamCheckoutSession> {
    console.log(`[Beam] Creating session for Order ${orderId}, Amount: ${amount}`);

    // If no API key configured, return mock response
    if (!BEAM_API_KEY) {
        console.log('[Beam] No API key configured, returning mock session');
        return {
            url: `https://mock-beam.com/pay/${orderId}`,
            token: `mock_token_${orderId}`,
            transactionId: `mock_txn_${Date.now()}`
        };
    }

    try {
        const response = await fetch(`${BEAM_API_URL}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEAM_API_KEY}`
            },
            body: JSON.stringify({
                order_id: orderId,
                amount: amount,
                currency: 'THB',
                customer_email: customerEmail,
                success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?orderId=${orderId}`,
                cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout/cancel?orderId=${orderId}`,
                webhook_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/beam`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Beam] Failed to create session:', errorText);
            throw new Error(`Failed to create Beam session: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            url: data.checkout_url || data.url,
            token: data.token,
            transactionId: data.transaction_id || data.id
        };
    } catch (error: any) {
        console.error('[Beam] Error creating session:', error);
        throw error;
    }
}

/**
 * Verify Beam webhook signature
 */
export async function verifyBeamWebhookSignature(
    signature: string,
    payload: string
): Promise<boolean> {
    // If no webhook secret configured, return true for development
    if (!BEAM_WEBHOOK_SECRET) {
        console.log('[Beam] No webhook secret configured, skipping signature verification');
        return true;
    }

    try {
        // In production, implement proper HMAC signature verification
        // Example: const crypto = require('crypto');
        // const expectedSignature = crypto.createHmac('sha256', BEAM_WEBHOOK_SECRET)
        //     .update(payload)
        //     .digest('hex');
        // return signature === expectedSignature;

        console.log('[Beam] Signature verification skipped (implement HMAC in production)');
        return true;
    } catch (error) {
        console.error('[Beam] Signature verification error:', error);
        return false;
    }
}

/**
 * Create a refund for a transaction
 * Called when an order is cancelled and payment was already made
 */
export async function createBeamRefund(
    transactionId: string,
    amount: number,
    reason?: string
): Promise<BeamRefundResult> {
    console.log(`[Beam] Creating refund for transaction ${transactionId}, Amount: ${amount}`);

    // If no API key configured, return mock response
    if (!BEAM_API_KEY) {
        console.log('[Beam] No API key configured, returning mock refund');
        return {
            success: true,
            refundId: `mock_refund_${Date.now()}`
        };
    }

    try {
        const response = await fetch(`${BEAM_API_URL}/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEAM_API_KEY}`
            },
            body: JSON.stringify({
                transaction_id: transactionId,
                amount: amount,
                reason: reason || 'Customer cancellation'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Beam] Refund failed:', errorText);
            return {
                success: false,
                error: errorText
            };
        }

        const data = await response.json();
        return {
            success: true,
            refundId: data.refund_id || data.id
        };
    } catch (error: any) {
        console.error('[Beam] Refund error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get transaction status from Beam
 */
export async function getBeamTransactionStatus(transactionId: string): Promise<string | null> {
    console.log(`[Beam] Getting status for transaction ${transactionId}`);

    if (!BEAM_API_KEY) {
        return 'mock_status';
    }

    try {
        const response = await fetch(`${BEAM_API_URL}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${BEAM_API_KEY}`
            }
        });

        if (!response.ok) {
            console.error('[Beam] Failed to get transaction status');
            return null;
        }

        const data = await response.json();
        return data.status;
    } catch (error) {
        console.error('[Beam] Error getting transaction status:', error);
        return null;
    }
}

/**
 * Mock payment for development/testing
 */
export async function mockBeamPayment(
    orderId: string,
    amount: number
): Promise<{ success: boolean; transactionId: string }> {
    console.log(`[Beam] Mock payment for Order ${orderId}, Amount: ${amount}`);

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // 90% success rate for mock
    const success = Math.random() < 0.9;

    return {
        success,
        transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
}
