import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';
import { debug, info, warn, errorLog } from '@/lib/middleware/logger';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            warn('Unauthorized access to analytics', { userId: session?.user?.id });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

        // Calculate date range
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0); // All time
        }

        debug('Fetching analytics', { period, startDate });

        // Run all queries in parallel
        const [
            salesSummary,
            ordersByStatus,
            topProducts,
            revenueByDay,
            newCustomers,
            inventorySummary
        ] = await Promise.all([
            // Sales Summary
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalOrders: { $sum: 1 },
                        avgOrderValue: { $avg: '$totalAmount' }
                    }
                }
            ]),

            // Orders by Status
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Top Selling Products
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        totalSold: { $sum: '$items.quantity' },
                        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $project: {
                        productId: '$_id',
                        name: '$product.name',
                        totalSold: 1,
                        revenue: 1
                    }
                }
            ]),

            // Revenue by Day
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // New Customers
            User.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $count: 'total' }
            ]),

            // Inventory Summary
            Product.aggregate([
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        totalStock: { $sum: '$stock' },
                        avgPrice: { $avg: '$price' },
                        lowStockProducts: {
                            $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);

        const analytics = {
            period,
            salesSummary: salesSummary[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
            ordersByStatus: ordersByStatus.reduce((acc: Record<string, number>, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            topProducts,
            revenueByDay,
            newCustomers: newCustomers[0]?.total || 0,
            inventorySummary: inventorySummary[0] || { totalProducts: 0, totalStock: 0, avgPrice: 0, lowStockProducts: 0 }
        };

        info('Analytics retrieved', { period, adminId: session.user.id });

        return NextResponse.json({
            success: true,
            data: analytics
        });

    } catch (error: any) {
        errorLog('Analytics API error', { error: error.message });
        return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
    }
}
