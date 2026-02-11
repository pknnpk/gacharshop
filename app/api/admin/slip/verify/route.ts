import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyBankSlip, rejectBankSlip, getPendingSlipVerifications, BankSlipData } from '@/lib/slipVerification';
import { createRateLimiter } from '@/lib/middleware/rateLimit';
import { debug, info, warn, errorLog } from '@/lib/middleware/logger';

const rateLimitHandler = createRateLimiter(100, 60 * 1000); // 100 requests per minute

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            warn('Unauthorized access to slip verification list', { userId: session?.user?.id });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const pendingSlips = await getPendingSlipVerifications();
        debug('Retrieved pending slip verifications', { metadata: { count: pendingSlips.length } });

        return NextResponse.json({
            success: true,
            data: pendingSlips,
            total: pendingSlips.length
        });

    } catch (error: any) {
        errorLog('Failed to get pending slips', { error: error.message });
        return NextResponse.json({ error: 'Failed to retrieve pending verifications' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const rateLimitResponse = await rateLimitHandler(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            warn('Unauthorized slip verification attempt', { userId: session?.user?.id });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: BankSlipData = await request.json();

        debug('Processing slip verification request', {
            metadata: { orderId: body.orderId, adminId: session.user.id }
        });

        const result = await verifyBankSlip(body);

        info('Slip verification completed', {
            metadata: {
                orderId: body.orderId,
                status: result.status,
                success: result.success,
                adminId: session.user.id
            }
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                status: result.status,
                message: result.message
            });
        } else {
            return NextResponse.json({
                success: false,
                status: result.status,
                message: result.message,
                details: result.details
            }, { status: 400 });
        }

    } catch (error: any) {
        errorLog('Slip verification API error', { error: error.message });
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const rateLimitResponse = await rateLimitHandler(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            warn('Unauthorized slip rejection attempt', { userId: session?.user?.id });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        const reason = searchParams.get('reason') || 'Slip verification failed';

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        debug('Processing slip rejection', {
            metadata: { orderId, adminId: session.user.id }
        });

        const result = await rejectBankSlip(orderId, reason, session.user.id);

        if (result.success) {
            info('Slip rejected', {
                metadata: { orderId, adminId: session.user.id, reason }
            });
            return NextResponse.json({
                success: true,
                message: result.message
            });
        } else {
            return NextResponse.json({
                success: false,
                message: result.message
            }, { status: 400 });
        }

    } catch (error: any) {
        errorLog('Slip rejection API error', { error: error.message });
        return NextResponse.json({ error: 'Rejection failed' }, { status: 500 });
    }
}
