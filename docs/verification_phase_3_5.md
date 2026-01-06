# Verification Guide: Phase 3.5 (Advanced Inventory)

This phase introduces strict inventory controls. Please verify the following scenarios.

## 1. Guest Restrictions
*   Open the app in Incognito mode (as Guest).
*   Try to "Add to Cart" any product.
*   **Expectation**: You are redirected to `/login`. No item is added.

## 2. Stock Reservation (Immediate)
*   **Setup**: Find a product with e.g. Stock = 10.
*   **Action**: Login. Add 2 items to cart.
*   **Verify**:
    *   Reload product page (or check DB). Stock should now be **8** (Immediate decrement).
    *   Cart page shows the item with a Timer counting down from 15:00.

## 3. Reservation Timeout
*   **Action**: Wait for the timer to hit 00:00 (or manually set `expiresAt` to past in DB).
*   **Verify**:
    *   Refresh Cart Page.
    *   Item should disappear.
    *   Toast message: "1 item(s) removed due to reservation timeout".
    *   Product Stock should return to **10**.

## 4. Quota Limits
*   **Setup**: In DB, set a product's `quotaLimit` to 2.
*   **Action**:
    *   Buy 1 item (Checkout & complete order).
    *   Go back to product page. Add 1 item to cart. (Total engaged = 2. Allowed).
    *   Try to Add 1 more (Total engaged = 3).
*   **Expectation**: 
    *   Toast Error: "Quota exceeded for [Product]. Limit: 2, Bought: 1, In Cart: 2".
    *   Item is NOT added.
