/**
 * POSPOS Integration Library
 * 
 * This module provides integration with the POSPOS physical store system.
 * In development, it uses mock functions. In production, replace with actual API calls.
 */

export interface POSPOSStockUpdate {
    sku: string;
    quantity: number;
    action: 'add' | 'subtract' | 'set';
    source: 'web_sale' | 'manual_adjustment' | 'sync';
    referenceId?: string;
}

export interface POSPOSSyncResult {
    success: boolean;
    sku: string;
    posposStock: number;
    syncedAt: Date;
    error?: string;
}

export interface POSPOSProductInfo {
    sku: string;
    name: string;
    posposStock: number;
    lastUpdated: Date;
}

// POSPOS API configuration
const POSPOS_API_URL = process.env.POSPOS_API_URL || 'https://api.pospos.mock/v1';
const POSPOS_API_KEY = process.env.POSPOS_API_KEY;

/**
 * Mock POSPOS Sync Function
 * Simulates API call to update stock levels in POSPOS system
 */
export async function mockPOSPOSSync(update: POSPOSStockUpdate): Promise<POSPOSSyncResult> {
    console.log(`[POSPOS Sync] ${update.action} ${update.quantity} units of SKU ${update.sku} (Source: ${update.source})`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
        return {
            success: false,
            sku: update.sku,
            posposStock: 0,
            syncedAt: new Date(),
            error: 'Simulated POSPOS API timeout'
        };
    }

    return {
        success: true,
        sku: update.sku,
        posposStock: update.action === 'set' ? update.quantity : update.quantity,
        syncedAt: new Date()
    };
}

/**
 * Real POSPOS API call (for production use)
 */
async function callPOSPOSAPI(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${POSPOS_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${POSPOS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`POSPOS API error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Sync stock update to POSPOS (production version)
 */
export async function syncStockToPOSPOS(
    sku: string,
    quantity: number,
    action: 'add' | 'subtract' | 'set'
): Promise<POSPOSSyncResult> {
    try {
        const result = await callPOSPOSAPI('/inventory/update', {
            sku,
            quantity,
            action,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            sku,
            posposStock: result.currentStock,
            syncedAt: new Date()
        };
    } catch (error: any) {
        return {
            success: false,
            sku,
            posposStock: 0,
            syncedAt: new Date(),
            error: error.message
        };
    }
}

/**
 * Batch sync all products to POSPOS
 */
export async function syncAllStockToPOSPOS(
    products: Array<{ sku: string; stock: number }>
): Promise<POSPOSSyncResult[]> {
    const results: POSPOSSyncResult[] = [];

    for (const product of products) {
        const result = await syncStockToPOSPOS(product.sku, product.stock, 'set');
        results.push(result);
    }

    return results;
}

/**
 * Get product stock from POSPOS
 */
export async function getProductStockFromPOSPOS(sku: string): Promise<POSPOSProductInfo | null> {
    try {
        const result = await callPOSPOSAPI('/inventory/get', { sku });

        return {
            sku: result.sku,
            name: result.name,
            posposStock: result.stock,
            lastUpdated: new Date(result.updatedAt)
        };
    } catch (error) {
        console.error(`[POSPOS] Failed to get stock for SKU ${sku}:`, error);
        return null;
    }
}

/**
 * Initialize POSPOS sync for a product
 * Call this when a product is first created
 */
export async function initializePOSPOSProduct(
    sku: string,
    name: string,
    initialStock: number
): Promise<boolean> {
    try {
        await callPOSPOSAPI('/inventory/create', {
            sku,
            name,
            stock: initialStock
        });
        return true;
    } catch (error) {
        console.error(`[POSPOS] Failed to initialize product ${sku}:`, error);
        return false;
    }
}
