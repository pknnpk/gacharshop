import { z, ZodError } from 'zod';

/**
 * Inventory Adjustment Validation Schema
 */
export const inventoryAdjustmentSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    change: z.number().refine((val) => val !== 0, 'Change cannot be zero'),
    reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

/**
 * Order Fulfillment Validation Schema
 */
export const orderFulfillmentSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    trackingNumber: z.string().min(1, 'Tracking number is required'),
    courier: z.string().optional().default('Unknown'),
});

export type OrderFulfillmentInput = z.infer<typeof orderFulfillmentSchema>;

/**
 * Cart Item Validation Schema
 */
export const cartItemSchema = z.object({
    product: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

export const cartUpdateSchema = z.object({
    items: z.array(cartItemSchema).min(0),
});

export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;

/**
 * Address Validation Schema
 */
export const addressSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(9, 'Invalid phone number'),
    address: z.string().min(10, 'Address too short'),
    city: z.string().min(1, 'City is required'),
    district: z.string().min(1, 'District is required'),
    postalCode: z.string().min(5, 'Invalid postal code'),
    isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

/**
 * Product Validation Schema (for admin)
 */
export const productSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    description: z.string().min(10, 'Description too short'),
    price: z.number().positive('Price must be positive'),
    category: z.string().min(1, 'Category is required'),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    reservationDuration: z.number().int().min(1).max(1440).optional().default(60),
    quotaLimit: z.number().int().min(0).optional().default(0),
    status: z.enum(['active', 'draft', 'archived']).optional().default('draft'),
    images: z.array(z.string().url()).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

/**
 * Helper function to validate request body
 */
export async function validateRequest<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (result.success) {
            return { success: true, data: result.data };
        } else {
            const errorMessages = result.error.issues.map((issue: z.ZodIssue) =>
                `${issue.path.join('.')}: ${issue.message}`
            ).join(', ');

            return {
                success: false,
                error: `Validation failed: ${errorMessages}`,
                status: 400
            };
        }
    } catch {
        return {
            success: false,
            error: 'Invalid JSON body',
            status: 400
        };
    }
}
