import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { exportProductsToExcel, exportProductsToCSV } from '@/lib/importExport';

/**
 * Admin Product Export API
 * 
 * GET /api/admin/products/export?format=excel|csv
 */

export async function GET(req: Request) {
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

        // Get format from query params
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format')?.toLowerCase() || 'excel';

        let result;

        if (format === 'csv') {
            result = await exportProductsToCSV();
            if (!result.success || !result.data) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 500 });
            }

            const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;

            return new NextResponse(result.data, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        } else {
            result = await exportProductsToExcel();
            if (!result.success || !result.buffer) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 500 });
            }

            const filename = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;

            return new NextResponse(result.buffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }

    } catch (error: any) {
        console.error('Product export error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
