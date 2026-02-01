# PRD Gap Analysis & Implementation Plan

**Based on Revised PRD (BeamCheckout + POSPOS + Line OA)**  
**Analysis Date**: January 2026

---

## 1. Current Implementation vs PRD Requirements Comparison

### 1.1 Database & ACID Transactions

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| MongoDB with ACID Transactions | ✅ Implemented in order creation | None |
| Atomic "Deduct Stock" + "Create Order" | ✅ Implemented in [`app/api/orders/route.ts`](app/api/orders/route.ts) | None |
| `Products` collection (SKU, base price, stock) | ✅ Exists in [`models/Product.ts`](models/Product.ts) | None |
| `Orders` collection (BeamCheckout ID, Line ID, status) | ⚠️ Partial - Missing `line_user_id` | Add Line OA ID to Order model |
| `Logs` collection (capped for activity) | ⚠️ Exists but not capped | Convert to capped collection |
| Execution time logging | ❌ Not implemented | Add to all API routes |
| Error trace logging | ⚠️ Console only | Add structured logging |

### 1.2 Payment Integration (BeamCheckout)

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| `mockBeamPayment()` function | ✅ Basic mock in [`lib/beam.ts`](lib/beam.ts) | Needs enhancement |
| BeamCheckout webhook handler | ⚠️ Exists but incomplete | Complete implementation |
| Auto-refund trigger on cancellation | ❌ Not implemented | Add to cancel order logic |
| Slip verification for direct transfers | ❌ Not implemented | New feature needed |

### 1.3 POSPOS Integration

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| `mockPOSPOSSync()` function | ❌ Not implemented | New feature needed |
| Sync stock levels to POSPOS | ❌ Not implemented | New feature needed |
| Real-time stock sync on sale | ❌ Not implemented | New feature needed |

### 1.4 Line OA Integration

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| Line OA Messaging API integration | ❌ Not implemented | New feature needed |
| Admin tagging of users | ❌ Not implemented | New feature needed |
| Tracking push notifications | ❌ Not implemented | New feature needed |
| Self-service order status bot | ❌ Not implemented | New feature needed |
| Rich Menu for Line OA | ❌ Not implemented | New feature needed |

### 1.5 File Management

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| CSV bulk import | ❌ Not implemented | New feature needed |
| Excel (.xlsx) bulk import | ❌ Not implemented | New feature needed |
| SKU uniqueness validation | ⚠️ Partial - uses slug | Add SKU field |
| Bulk export | ❌ Not implemented | New feature needed |

### 1.6 Admin Dashboard

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| Real-time "Available to Sell" view | ⚠️ Partial - basic inventory | Needs POSPOS stock aggregation |
| Web Stock + POSPOS Stock view | ❌ Not implemented | New feature needed |

---

## 2. Implementation Priority Matrix

### Phase 1: Core Foundation (Week 1-2)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | Add `line_user_id` to Order model | Low | Database migration |
| P0 | Complete BeamCheckout webhook implementation | Medium | lib/beam.ts enhancement |
| P0 | Implement auto-refund on cancellation | Medium | Order model update |
| P1 | Create `mockPOSPOSSync()` function | Medium | New lib file |
| P1 | Add execution time logging middleware | Low | New middleware |
| P2 | Convert Logs to capped collection | Medium | MongoDB migration |

### Phase 2: Line OA Integration (Week 3-4)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P1 | Create Line OA service layer | Medium | New lib file |
| P1 | Implement tracking push notifications | Medium | Line API credentials |
| P1 | Create self-service status endpoint | Low | Order model |
| P2 | Admin user tagging feature | Medium | Line API + Admin UI |
| P2 | Rich Menu configuration | Low | Line Developer console |

### Phase 3: File Management (Week 5-6)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P1 | Add SKU field to Product model | Low | Database migration |
| P1 | Implement CSV import endpoint | Medium | csv-parser package |
| P1 | Implement Excel import endpoint | Medium | exceljs package |
| P2 | Implement bulk export endpoint | Low | csv-writer package |

### Phase 4: Advanced Features (Week 7-8)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P1 | Implement slip verification system | Medium | New API endpoint |
| P2 | POSPOS stock aggregation dashboard | Medium | POSPOS sync + Admin UI |
| P2 | Structured logging (Winston/Pino) | Medium | New logging lib |

---

## 3. Detailed Implementation Tasks

### 3.1 Database Schema Updates

#### Update Order Model
```typescript
// models/Order.ts - Add these fields
line_user_id?: string;           // For Line OA tracking
beam_transaction_id?: string;    // For payment verification
pospos_sync_status?: string;     // 'pending', 'synced', 'failed'
pospos_sync_at?: Date;           // Last sync timestamp
```

#### Update Product Model
```typescript
// models/Product.ts - Add these fields
sku?: string;                    // Stock keeping unit (unique)
pospos_stock?: number;           // Physical store stock
web_stock?: number;              // Website stock (computed or stored)
```

#### Convert Logs to Capped Collection
```typescript
// In migration script
db.createCollection('inventorylogs', { capped: true, size: 1048576, max: 10000 });
```

### 3.2 BeamCheckout Enhancement

#### Update lib/beam.ts
```typescript
// Add these functions:
export async function createBeamRefund(transactionId: string, amount: number): Promise<RefundResult>;
export async function verifyBeamWebhook(payload: any, signature: string): Promise<boolean>;
export function mockBeamPayment(orderId: string, amount: number): Promise<PaymentResult>;
```

#### Add webhook handler
```typescript
// app/api/webhooks/beam/route.ts
export async function POST(req: Request) {
    const signature = req.headers.get('x-beam-signature');
    const body = await req.json();
    
    if (!verifyBeamWebhook(body, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const { event_type, transaction_id, order_id, status } = body;
    
    // Handle different event types
    if (event_type === 'payment.completed') {
        // Update order to 'paid' status
    } else if (event_type === 'payment.failed') {
        // Handle failed payment
    } else if (event_type === 'refund.completed') {
        // Update order refund status
    }
}
```

### 3.3 POSPOS Integration

#### Create lib/pospos.ts
```typescript
export interface POSPOSStockUpdate {
    sku: string;
    quantity: number;
    action: 'add' | 'subtract' | 'set';
    source: 'web_sale' | 'manual_adjustment' | 'sync';
}

export async function mockPOSPOSSync(update: POSPOSStockUpdate): Promise<POSPOSSyncResult> {
    // Simulate API call to POSPOS
    console.log(`[POSPOS Sync] ${update.action} ${update.quantity} units of SKU ${update.sku}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
        success: true,
        pospos_stock: update.quantity,
        synced_at: new Date()
    };
}

export async function syncAllStock(): Promise<void> {
    // Batch sync all products to POSPOS
}
```

### 3.4 Line OA Integration

#### Create lib/line.ts
```typescript
export interface LineMessage {
    to: string;
    messages: Array<{
        type: 'text' | 'template';
        text?: string;
        template?: any;
    }>;
}

const LINE_API_URL = process.env.LINE_API_URL || 'https://api.line.me/v2';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function sendTrackingNotification(
    line_user_id: string,
    trackingInfo: { courier: string; trackingNumber: string; orderId: string }
): Promise<void> {
    const message: LineMessage = {
        to: line_user_id,
        messages: [{
            type: 'template',
            template: {
                type: 'buttons',
                text: `Your order #${trackingInfo.orderId.slice(-6)} has been shipped!\n\nCourier: ${trackingInfo.courier}\nTracking: ${trackingInfo.trackingNumber}`,
                actions: [{
                    type: 'uri',
                    label: 'Track Package',
                    uri: `https://track.example.com/${trackingInfo.trackingNumber}`
                }]
            }
        }]
    };
    
    await fetch(`${LINE_API_URL}/bot/message/push`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });
}

export async function sendOrderStatus(line_user_id: string, orderId: string): Promise<string> {
    // Lookup order status and send to user
}
```

### 3.5 File Import/Export

#### Create lib/importExport.ts
```typescript
import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import Product from '@/models/Product';
import mongoose from 'mongoose';

interface CSVProduct {
    sku: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
}

export async function importProductsFromCSV(buffer: Buffer): Promise<ImportResult> {
    const results: CSVProduct[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    let rowNumber = 0;
    
    return new Promise((resolve, reject) => {
        const stream = require('stream');
        const passThrough = new stream.PassThrough();
        
        passThrough.pipe(csv())
            .on('data', async (data: CSVProduct) => {
                rowNumber++;
                try {
                    // Validate SKU uniqueness
                    const existing = await Product.findOne({ sku: data.sku });
                    if (existing) {
                        errors.push({ row: rowNumber, error: `SKU ${data.sku} already exists` });
                        return;
                    }
                    results.push(data);
                } catch (err) {
                    errors.push({ row: rowNumber, error: 'Database error' });
                }
            })
            .on('end', async () => {
                // Bulk insert valid products
                if (results.length > 0) {
                    await Product.insertMany(results);
                }
                resolve({ imported: results.length, errors });
            });
        
        passThrough.end(buffer);
    });
}

export async function exportProductsToExcel(): Promise<Buffer> {
    const products = await Product.find({}).lean();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');
    
    worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Name', key: 'name', width: 40 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'Stock', key: 'stock', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
    ];
    
    products.forEach(p => worksheet.addRow(p));
    
    return await workbook.xlsx.writeBuffer() as Buffer;
}
```

### 3.6 Logging Middleware

#### Create lib/middleware/logger.ts
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function loggingMiddleware(request: NextRequest) {
    const startTime = Date.now();
    
    // Log request
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        ip: request.headers.get('x-forwarded-for')
    }));
    
    // Add response listener to log execution time
    const originalResponse = NextResponse.next();
    
    originalResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    return originalResponse;
}

export function logError(error: Error, context?: any) {
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        stack: error.stack,
        context
    }));
}
```

---

## 4. Environment Variables Required

Add to `env.example.yaml`:

```yaml
# Line OA Integration
LINE_CHANNEL_ID: "your_line_channel_id"
LINE_CHANNEL_SECRET: "your_line_channel_secret"
LINE_CHANNEL_ACCESS_TOKEN: "your_line_access_token"
LINE_OA_USER_ID: "your_oa_user_id"

# POSPOS Integration
POSPOS_API_URL: "https://api.pospos.com/v1"
POSPOS_API_KEY: "your_pospos_api_key"

# Logging
LOG_LEVEL: "info"  # debug, info, warn, error

# BeamCheckout (additional)
BEAM_WEBHOOK_SECRET: "your_webhook_secret"
```

---

## 5. Testing Strategy

### 5.1 Unit Tests Required

- `lib/beam.test.ts` - Mock payment and refund tests
- `lib/pospos.test.ts` - Mock sync tests
- `lib/line.test.ts` - Message sending tests
- `lib/importExport.test.ts` - CSV/Excel parsing tests

### 5.2 Integration Tests Required

- Order flow with mock BeamCheckout
- Stock sync between web and POSPOS
- Line notification delivery
- CSV import with duplicate SKU handling

---

## 6. Rollout Plan

### Phase 1 Rollout
1. Database migration for new fields
2. Deploy enhanced lib files
3. Test in staging environment

### Phase 2 Rollout
1. Configure Line OA credentials
2. Test Line messaging in staging
3. Deploy to production

### Phase 3 Rollout
1. Configure file import dependencies
2. Test with sample CSV files
3. Deploy to production

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Line API rate limits | High | Implement message queuing |
| POSPOS API downtime | High | Queue sync operations |
| Large CSV imports timeout | Medium | Use streaming/background jobs |
| BeamCheckout webhook failures | High | Implement retry logic with exponential backoff |

---

## Appendix: File Reference Summary

| Feature | Key Files |
|---------|-----------|
| Database Models | [`models/Product.ts`](models/Product.ts), [`models/Order.ts`](models/Order.ts) |
| Payment | [`lib/beam.ts`](lib/beam.ts) |
| POSPOS | New: `lib/pospos.ts` |
| Line OA | New: `lib/line.ts` |
| File Import/Export | New: `lib/importExport.ts` |
| Logging | New: `lib/middleware/logger.ts` |
| Validation | [`lib/validators.ts`](lib/validators.ts) |
