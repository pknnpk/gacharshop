/**
 * Slip Verification System
 * 
 * Handles manual bank transfer verification for orders not processed through BeamCheckout.
 * Checks for duplicate QR codes and amount matching.
 */

import dbConnect from './db';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { debug, info, warn, errorLog } from './middleware/logger';

/**
 * Slip verification status
 */
export type SlipStatus = 'pending' | 'verified' | 'rejected' | 'duplicate';

/**
 * Bank slip data interface
 */
export interface BankSlipData {
    orderId: string;
    bankName: string;
    transferAmount: number;
    transferDate: string;
    slipImageUrl?: string;
    referenceNumber?: string;
    senderName?: string;
    senderAccount?: string;
    notes?: string;
}

/**
 * Verification result interface
 */
export interface SlipVerificationResult {
    success: boolean;
    status: SlipStatus;
    orderId: string;
    message: string;
    details?: {
        duplicateFound?: {
            orderId: string;
            amount: number;
            date: string;
        };
        amountMismatch?: {
            expected: number;
            received: number;
        };
    };
}

/**
 * Duplicate slip check result
 */
interface DuplicateCheck {
    isDuplicate: boolean;
    existingOrder?: {
        orderId: string;
        amount: number;
        date: Date;
    };
}

/**
 * Check for duplicate payment slip
 */
async function checkForDuplicates(slipData: BankSlipData): Promise<DuplicateCheck> {
    const transferDate = new Date(slipData.transferDate);
    const startOfDay = new Date(transferDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(transferDate);
    endOfDay.setHours(23, 59, 59, 999);

    const amountVariance = slipData.transferAmount * 0.05;
    const minAmount = slipData.transferAmount - amountVariance;
    const maxAmount = slipData.transferAmount + amountVariance;

    const existingOrders = await Order.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        totalAmount: { $gte: minAmount, $lte: maxAmount },
        status: { $in: ['paid', 'reserved', 'shipped', 'completed'] },
        _id: { $ne: slipData.orderId }
    })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

    if (existingOrders.length > 0) {
        const order: any = existingOrders[0];
        return {
            isDuplicate: true,
            existingOrder: {
                orderId: order._id.toString(),
                amount: order.totalAmount,
                date: order.createdAt
            }
        };
    }

    return { isDuplicate: false };
}

/**
 * Verify a bank payment slip
 */
export async function verifyBankSlip(slipData: BankSlipData): Promise<SlipVerificationResult> {
    debug('Verifying bank slip', { orderId: slipData.orderId, metadata: { amount: slipData.transferAmount } });

    try {
        await dbConnect();

        const order = await Order.findById(slipData.orderId);
        if (!order) {
            return {
                success: false,
                status: 'rejected',
                orderId: slipData.orderId,
                message: 'Order not found'
            };
        }

        if (['paid', 'shipped', 'completed'].includes(order.status)) {
            return {
                success: false,
                status: 'rejected',
                orderId: slipData.orderId,
                message: `Order is already ${order.status}`
            };
        }

        const duplicateCheck = await checkForDuplicates(slipData);
        if (duplicateCheck.isDuplicate) {
            return {
                success: false,
                status: 'duplicate',
                orderId: slipData.orderId,
                message: 'Duplicate payment detected',
                details: {
                    duplicateFound: {
                        orderId: duplicateCheck.existingOrder!.orderId,
                        amount: duplicateCheck.existingOrder!.amount,
                        date: duplicateCheck.existingOrder!.date.toISOString()
                    }
                }
            };
        }

        const amountVariance = order.totalAmount * 0.01;
        const minExpected = order.totalAmount - amountVariance;
        const maxExpected = order.totalAmount + amountVariance;

        if (slipData.transferAmount < minExpected || slipData.transferAmount > maxExpected) {
            return {
                success: false,
                status: 'rejected',
                orderId: slipData.orderId,
                message: 'Amount mismatch',
                details: {
                    amountMismatch: {
                        expected: order.totalAmount,
                        received: slipData.transferAmount
                    }
                }
            };
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            order.status = 'paid';
            order.paymentId = `BANK_${slipData.referenceNumber || Date.now()}`;
            order.statusHistory.push({
                status: 'paid',
                reason: `Bank transfer verified via slip. Bank: ${slipData.bankName}, Ref: ${slipData.referenceNumber || 'N/A'}`,
                timestamp: new Date(),
                changedBy: null
            });

            (order as any).bankTransferInfo = {
                bankName: slipData.bankName,
                amount: slipData.transferAmount,
                transferDate: slipData.transferDate,
                slipImageUrl: slipData.slipImageUrl,
                referenceNumber: slipData.referenceNumber,
                senderName: slipData.senderName,
                verifiedAt: new Date()
            };

            await order.save({ session: dbSession });
            await dbSession.commitTransaction();
            dbSession.endSession();

            info('Bank slip verified successfully', { orderId: slipData.orderId });

            return {
                success: true,
                status: 'verified',
                orderId: slipData.orderId,
                message: 'Payment verified successfully'
            };

        } catch (err) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw err;
        }

    } catch (error: any) {
        errorLog('Slip verification failed', { orderId: slipData.orderId, error: error.message });
        return {
            success: false,
            status: 'rejected',
            orderId: slipData.orderId,
            message: error.message || 'Verification failed'
        };
    }
}

/**
 * Reject a bank payment slip
 */
export async function rejectBankSlip(
    orderId: string,
    reason: string,
    rejectedBy: string
): Promise<{ success: boolean; message: string }> {
    try {
        await dbConnect();

        const order = await Order.findById(orderId);
        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        order.statusHistory.push({
            status: 'rejected',
            reason: `Bank transfer rejected: ${reason}`,
            timestamp: new Date(),
            changedBy: rejectedBy
        });

        await order.save();

        info('Bank slip rejected', { orderId, metadata: { reason } });
        return { success: true, message: 'Slip rejected' };

    } catch (error: any) {
        errorLog('Slip rejection failed', { orderId, error: error.message });
        return { success: false, message: error.message };
    }
}

/**
 * Get pending slip verifications
 */
export async function getPendingSlipVerifications(): Promise<any[]> {
    await dbConnect();

    const orders = await Order.find({
        status: 'reserved',
        bankTransferInfo: { $exists: true },
        'bankTransferInfo.verifiedAt': { $exists: false }
    })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .lean();

    return orders;
}

/**
 * Mock slip verification for development
 */
export async function mockVerifyBankSlip(slipData: BankSlipData): Promise<SlipVerificationResult> {
    debug('[MOCK] Verifying bank slip', { metadata: slipData as any });

    await new Promise(resolve => setTimeout(resolve, 500));

    const success = Math.random() < 0.9;

    if (success) {
        return {
            success: true,
            status: 'verified',
            orderId: slipData.orderId,
            message: '[MOCK] Payment verified successfully'
        };
    } else {
        return {
            success: false,
            status: 'rejected',
            orderId: slipData.orderId,
            message: '[MOCK] Verification failed - simulated error'
        };
    }
}
