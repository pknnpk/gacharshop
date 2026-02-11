import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { importProductsFromCSV, importProductsFromExcel } from '@/lib/importExport';

/**
 * Admin Product Import API
 * 
 * POST /api/admin/products/import
 * Content-Type: multipart/form-data
 * Body: file (CSV or Excel file)
 */

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

        // Get the uploaded file
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Get file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
            return NextResponse.json({
                error: 'Invalid file type. Please upload a CSV or Excel file.'
            }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let result;

        if (fileExtension === 'csv') {
            result = await importProductsFromCSV(buffer);
        } else {
            result = await importProductsFromExcel(buffer);
        }

        if (!result.success) {
            return NextResponse.json({
                success: false,
                message: 'Import failed',
                imported: result.imported,
                errors: result.errors,
                warnings: result.warnings
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${result.imported} products`,
            imported: result.imported,
            errors: result.errors,
            warnings: result.warnings
        });

    } catch (error: any) {
        console.error('Product import error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET /api/admin/products/import
 * Returns import instructions and template
 */
export async function GET() {
    return NextResponse.json({
        message: 'Product Import API',
        instructions: {
            method: 'POST',
            contentType: 'multipart/form-data',
            body: {
                file: 'CSV or Excel file containing product data'
            }
        },
        csvTemplate: {
            headers: ['sku', 'name', 'slug', 'description', 'price', 'stock', 'category', 'reservationDuration', 'quotaLimit', 'status'],
            example: [
                'SKU001,Product Name,product-slug,Description here,99.99,100,Electronics,60,0,draft',
                'SKU002,Another Product,another-slug,Another description,149.99,50,Clothing,30,2,active'
            ]
        },
        notes: {
            sku: 'Optional. Must be unique if provided.',
            name: 'Required. Product name.',
            slug: 'Required. URL-friendly identifier.',
            description: 'Required. Product description.',
            price: 'Required. Price in THB.',
            stock: 'Required. Initial stock quantity.',
            category: 'Required. Category name (must exist).',
            reservationDuration: 'Optional. Default: 60 minutes.',
            quotaLimit: 'Optional. Default: 0 (unlimited).',
            status: 'Optional. Default: draft. Options: active, draft, archived.'
        }
    });
}
