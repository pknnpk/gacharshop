/**
 * CSV and Excel Import/Export Library
 * 
 * Provides bulk import and export functionality for products.
 */

import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import Product from '@/models/Product';
import Category from '@/models/Category';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { debug, info, warn, errorLog } from './middleware/logger';

/**
 * Import result interface
 */
export interface ImportResult {
    success: boolean;
    imported: number;
    errors: Array<{ row: number; error: string; data?: any }>;
    warnings?: Array<{ row: number; message: string }>;
}

/**
 * CSV Product row interface
 */
export interface CSVProductRow {
    sku?: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    stock: string;
    category: string;
    reservationDuration?: string;
    quotaLimit?: string;
    status?: string;
    images?: string;
}

/**
 * Excel Product data interface
 */
export interface ExcelProductData {
    sku?: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    reservationDuration?: number;
    quotaLimit?: number;
    status?: string;
    images?: string[];
}

/**
 * Validate CSV product row
 */
function validateCSVRow(row: CSVProductRow, rowNumber: number): {
    valid: boolean;
    data?: ExcelProductData;
    error?: string;
} {
    const errors: string[] = [];

    // Required fields
    if (!row.name || row.name.trim().length === 0) {
        errors.push('Name is required');
    }
    if (!row.slug || row.slug.trim().length === 0) {
        errors.push('Slug is required');
    }
    if (!row.description || row.description.trim().length === 0) {
        errors.push('Description is required');
    }

    // Price validation
    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) {
        errors.push('Invalid price');
    }

    // Stock validation
    const stock = parseInt(row.stock);
    if (isNaN(stock) || stock < 0) {
        errors.push('Invalid stock');
    }

    // Slug format validation (alphanumeric and hyphens only)
    if (row.slug && !/^[a-z0-9-]+$/.test(row.slug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // SKU uniqueness check will be done in bulk
    if (row.sku && row.sku.length > 0 && !/^[A-Z0-9-]+$/.test(row.sku)) {
        errors.push('SKU must contain only uppercase letters, numbers, and hyphens');
    }

    if (errors.length > 0) {
        return { valid: false, error: errors.join('; ') };
    }

    // Parse optional fields
    const reservationDuration = row.reservationDuration
        ? parseInt(row.reservationDuration)
        : 60;
    const quotaLimit = row.quotaLimit
        ? parseInt(row.quotaLimit)
        : 0;
    const status = row.status || 'draft';

    // Parse images
    const images = row.images
        ? row.images.split(',').map((url: string) => url.trim()).filter(Boolean)
        : [];

    return {
        valid: true,
        data: {
            name: row.name.trim(),
            slug: row.slug.trim().toLowerCase(),
            description: row.description.trim(),
            price,
            stock,
            category: row.category.trim(),
            reservationDuration,
            quotaLimit,
            status,
            images,
            sku: row.sku?.trim().toUpperCase() || undefined
        }
    };
}

/**
 * Import products from CSV buffer
 */
export async function importProductsFromCSV(buffer: Buffer): Promise<ImportResult> {
    debug('Starting CSV import');

    const results: ExcelProductData[] = [];
    const errors: Array<{ row: number; error: string; data?: any }> = [];
    const warnings: Array<{ row: number; message: string }> = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
        const stream = require('stream');
        const passThrough = new stream.PassThrough();

        passThrough.pipe(csv())
            .on('data', (data: CSVProductRow) => {
                rowNumber++;
                const validation = validateCSVRow(data, rowNumber);

                if (validation.valid && validation.data) {
                    results.push(validation.data);
                } else if (validation.error) {
                    errors.push({
                        row: rowNumber,
                        error: validation.error,
                        data: data as any
                    });
                }
            })
            .on('end', async () => {
                debug(`CSV parsed: ${results.length} valid, ${errors.length} errors`);

                if (results.length === 0) {
                    resolve({
                        success: true,
                        imported: 0,
                        errors,
                        warnings
                    });
                    return;
                }

                try {
                    await dbConnect();

                    const dbSession = await mongoose.startSession();
                    dbSession.startTransaction();

                    try {
                        // Check for SKU uniqueness
                        const skusWithData = results.filter(r => r.sku);
                        if (skusWithData.length > 0) {
                            const existingProducts = await Product.find({
                                sku: { $in: skusWithData.map(r => r.sku) }
                            }).session(dbSession);

                            const existingSkus = new Set(existingProducts.map(p => p.sku));

                            // Filter out products with duplicate SKUs
                            const uniqueResults = results.filter(r => {
                                if (!r.sku) return true;
                                if (!existingSkus.has(r.sku)) return true;
                                const idx = results.indexOf(r);
                                errors.push({
                                    row: idx + 1,
                                    error: `SKU ${r.sku} already exists`,
                                    data: r as any
                                });
                                return false;
                            });

                            results.length = 0;
                            results.push(...uniqueResults);
                        }

                        // Resolve category IDs
                        const categoryNames = [...new Set(results.map(r => r.category))];
                        const categories = await Category.find({
                            name: { $in: categoryNames }
                        }).session(dbSession);

                        const categoryMap = new Map(
                            categories.map(c => [c.name.toLowerCase(), c._id])
                        );

                        // Add warnings for missing categories
                        results.forEach((product, idx) => {
                            const categoryId = categoryMap.get(product.category.toLowerCase());
                            if (!categoryId) {
                                warnings.push({
                                    row: idx + 1,
                                    message: `Category "${product.category}" not found, using first available`
                                });
                            }
                        });

                        // Prepare products for insertion
                        const productsToInsert = results.map(product => {
                            const categoryId = categoryMap.get(product.category.toLowerCase());
                            return {
                                name: product.name,
                                slug: product.sku
                                    ? `${product.slug}-${product.sku.toLowerCase()}`
                                    : product.slug,
                                description: product.description,
                                price: product.price,
                                stock: product.stock,
                                category: categoryId || categories[0]?._id,
                                reservationDuration: product.reservationDuration || 60,
                                quotaLimit: product.quotaLimit || 0,
                                status: product.status || 'draft',
                                images: product.images || [],
                                sku: product.sku
                            };
                        });

                        // Bulk insert
                        if (productsToInsert.length > 0) {
                            await Product.insertMany(productsToInsert, { session: dbSession });
                        }

                        await dbSession.commitTransaction();
                        dbSession.endSession();

                        info('CSV import completed', {
                            imported: productsToInsert.length,
                            metadata: { errorCount: errors.length }
                        });

                        resolve({
                            success: true,
                            imported: productsToInsert.length,
                            errors,
                            warnings
                        });

                    } catch (err) {
                        await dbSession.abortTransaction();
                        dbSession.endSession();
                        throw err;
                    }

                } catch (err: any) {
                    errorLog('CSV import failed', { error: err.message });
                    resolve({
                        success: false,
                        imported: 0,
                        errors: [...errors, { row: 0, error: err.message }]
                    });
                }
            });

        passThrough.end(buffer);
    });
}

/**
 * Import products from Excel buffer
 */
export async function importProductsFromExcel(buffer: Buffer): Promise<ImportResult> {
    debug('Starting Excel import');

    const errors: Array<{ row: number; error: string; data?: any }> = [];
    const warnings: Array<{ row: number; message: string }> = [];

    try {
        await dbConnect();

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return {
                success: false,
                imported: 0,
                errors: [{ row: 0, error: 'No worksheet found in Excel file' }]
            };
        }

        // Read header row
        const headerRow = worksheet.getRow(1);
        const headers: Record<number, string> = {};
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = (cell.value as string)?.toLowerCase().trim() || '';
        });

        // Find column indices
        const colIndex: Record<string, number> = {};
        const expectedHeaders = ['sku', 'name', 'slug', 'description', 'price', 'stock', 'category'];

        for (const header of expectedHeaders) {
            const colNum = Object.entries(headers).find(([_, h]) => h === header)?.[0];
            if (colNum) {
                colIndex[header] = parseInt(colNum);
            }
        }

        // Validate required columns
        const missingColumns = expectedHeaders.filter(h => !colIndex[h]);
        if (missingColumns.length > 0) {
            return {
                success: false,
                imported: 0,
                errors: [{ row: 0, error: `Missing columns: ${missingColumns.join(', ')}` }]
            };
        }

        const results: ExcelProductData[] = [];

        // Read data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rowData: Partial<ExcelProductData> = {};
            let rowError = '';

            // Read each column
            const nameCell = row.getCell(colIndex['name']);
            const slugCell = row.getCell(colIndex['slug']);
            const descCell = row.getCell(colIndex['description']);
            const priceCell = row.getCell(colIndex['price']);
            const stockCell = row.getCell(colIndex['stock']);
            const categoryCell = row.getCell(colIndex['category']);

            // Validate required fields
            if (!nameCell.value || String(nameCell.value).trim().length === 0) {
                rowError = 'Name is required';
            } else if (!slugCell.value || String(slugCell.value).trim().length === 0) {
                rowError = 'Slug is required';
            } else if (!descCell.value || String(descCell.value).trim().length === 0) {
                rowError = 'Description is required';
            }

            if (rowError) {
                errors.push({ row: rowNumber, error: rowError });
                return;
            }

            // Parse values
            const price = parseFloat(String(priceCell.value || '0'));
            const stock = parseInt(String(stockCell.value || '0'));

            if (isNaN(price) || price < 0) {
                errors.push({ row: rowNumber, error: 'Invalid price' });
                return;
            }

            if (isNaN(stock) || stock < 0) {
                errors.push({ row: rowNumber, error: 'Invalid stock' });
                return;
            }

            // Optional fields
            const skuCell = row.getCell(colIndex['sku']);
            const sku = skuCell.value ? String(skuCell.value).trim().toUpperCase() : undefined;

            const resDurationCell = row.getCell(colIndex['reservationDuration']);
            const reservationDuration = resDurationCell.value
                ? parseInt(String(resDurationCell.value))
                : 60;

            const quotaCell = row.getCell(colIndex['quotaLimit']);
            const quotaLimit = quotaCell.value
                ? parseInt(String(quotaCell.value))
                : 0;

            const statusCell = row.getCell(colIndex['status']);
            const status = statusCell.value
                ? String(statusCell.value).toLowerCase()
                : 'draft';

            results.push({
                name: String(nameCell.value).trim(),
                slug: String(slugCell.value).trim().toLowerCase(),
                description: String(descCell.value).trim(),
                price,
                stock,
                category: String(categoryCell.value).trim(),
                reservationDuration,
                quotaLimit,
                status,
                sku
            });
        });

        debug(`Excel parsed: ${results.length} valid, ${errors.length} errors`);

        if (results.length === 0) {
            return {
                success: true,
                imported: 0,
                errors,
                warnings
            };
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // Check for SKU uniqueness
            const skusWithData = results.filter(r => r.sku);
            if (skusWithData.length > 0) {
                const existingProducts = await Product.find({
                    sku: { $in: skusWithData.map(r => r.sku) }
                }).session(dbSession);

                const existingSkus = new Set(existingProducts.map(p => p.sku));

                const uniqueResults = results.filter(r => {
                    if (!r.sku) return true;
                    if (!existingSkus.has(r.sku)) return true;
                    const idx = results.indexOf(r);
                    errors.push({
                        row: idx + 2,
                        error: `SKU ${r.sku} already exists`,
                        data: r as any
                    });
                    return false;
                });

                results.length = 0;
                results.push(...uniqueResults);
            }

            // Resolve category IDs
            const categoryNames = [...new Set(results.map(r => r.category))];
            const categories = await Category.find({
                name: { $in: categoryNames }
            }).session(dbSession);

            const categoryMap = new Map(
                categories.map(c => [c.name.toLowerCase(), c._id])
            );

            results.forEach((product, idx) => {
                const categoryId = categoryMap.get(product.category.toLowerCase());
                if (!categoryId) {
                    warnings.push({
                        row: idx + 2,
                        message: `Category "${product.category}" not found, using first available`
                    });
                }
            });

            const productsToInsert = results.map(product => {
                const categoryId = categoryMap.get(product.category.toLowerCase());
                return {
                    name: product.name,
                    slug: product.sku
                        ? `${product.slug}-${product.sku.toLowerCase()}`
                        : product.slug,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    category: categoryId || categories[0]?._id,
                    reservationDuration: product.reservationDuration || 60,
                    quotaLimit: product.quotaLimit || 0,
                    status: product.status || 'draft',
                    images: [],
                    sku: product.sku
                };
            });

            if (productsToInsert.length > 0) {
                await Product.insertMany(productsToInsert, { session: dbSession });
            }

            await dbSession.commitTransaction();
            dbSession.endSession();

            info('Excel import completed', {
                imported: productsToInsert.length,
                metadata: { errorCount: errors.length }
            });

            return {
                success: true,
                imported: productsToInsert.length,
                errors,
                warnings
            };

        } catch (err: any) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw err;
        }

    } catch (err: any) {
        errorLog('Excel import failed', { error: err.message });
        return {
            success: false,
            imported: 0,
            errors: [{ row: 0, error: err.message }]
        };
    }
}

/**
 * Export products to Excel buffer
 */
export async function exportProductsToExcel(
    options: {
        includeStock?: boolean;
        includeImages?: boolean;
        status?: string;
    } = {}
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
    debug('Starting Excel export');

    try {
        await dbConnect();

        const query: any = {};
        if (options.status) {
            query.status = options.status;
        }

        const products = await Product.find(query)
            .populate('category')
            .lean();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'GacharShop';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Products');

        // Add header row
        worksheet.columns = [
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Name', key: 'name', width: 40 },
            { header: 'Slug', key: 'slug', width: 25 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Price', key: 'price', width: 12 },
            { header: 'Stock', key: 'stock', width: 10 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Reservation Duration (min)', key: 'reservationDuration', width: 20 },
            { header: 'Quota Limit', key: 'quotaLimit', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        products.forEach((product: any) => {
            worksheet.addRow({
                sku: product.sku || '',
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                stock: product.stock,
                category: product.category?.name || '',
                status: product.status,
                reservationDuration: product.reservationDuration || 60,
                quotaLimit: product.quotaLimit || 0,
                createdAt: product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
            column.width = Math.max(column.width || 10, 15);
        });

        const buffer = await workbook.xlsx.writeBuffer() as any;

        info('Excel export completed', { count: products.length });

        return { success: true, buffer };

    } catch (err: any) {
        errorLog('Excel export failed', { error: err.message });
        return { success: false, error: err.message };
    }
}

/**
 * Export products to CSV string
 */
export async function exportProductsToCSV(): Promise<{ success: boolean; data?: string; error?: string }> {
    debug('Starting CSV export');

    try {
        await dbConnect();

        const products = await Product.find({})
            .populate('category')
            .lean();

        // Build CSV header
        const headers = ['sku', 'name', 'slug', 'description', 'price', 'stock', 'category', 'status', 'reservationDuration', 'quotaLimit'];
        let csv = headers.join(',') + '\n';

        // Build CSV rows
        products.forEach((product: any) => {
            const escapeCSV = (value: any): string => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const row = [
                escapeCSV(product.sku),
                escapeCSV(product.name),
                escapeCSV(product.slug),
                escapeCSV(product.description),
                escapeCSV(product.price),
                escapeCSV(product.stock),
                escapeCSV(product.category?.name || ''),
                escapeCSV(product.status),
                escapeCSV(product.reservationDuration || 60),
                escapeCSV(product.quotaLimit || 0)
            ];

            csv += row.join(',') + '\n';
        });

        info('CSV export completed', { count: products.length });

        return { success: true, data: csv };

    } catch (err: any) {
        errorLog('CSV export failed', { error: err.message });
        return { success: false, error: err.message };
    }
}
