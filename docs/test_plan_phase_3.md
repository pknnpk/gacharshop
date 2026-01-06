# Phase 3 Test Plan: Shopping Cart & Checkout

## 1. Guest User (LocalStorage)
*   **TC-G1: Persistence**
    *   **Action**: Add items to cart as a guest. Refresh page or close/reopen browser.
    *   **Expected**: items remain in the cart (loaded from LocalStorage).
*   **TC-G2: Modification**
    *   **Action**: Update quantity using `+` and `-` buttons. Remove an item.
    *   **Expected**: Totals update immediately. Changes persist on refresh.
*   **TC-G3: Max Stock**
    *   **Action**: Try to increase quantity beyond available stock (e.g., stock is 5, try to add 6).
    *   **Expected**: Toast error "Only 5 items available". Quantity does not increase.

## 2. Authenticated User (Database Sync)
*   **TC-A1: Login Merge**
    *   **Action**: As guest, add distinct "Product A". Login as a user who already has "Product B" in their DB cart.
    *   **Expected**: Cart now contains BOTH "Product A" and "Product B". The new combined state is saved to DB.
*   **TC-A2: Cross-Device**
    *   **Action**: Add item on Desktop. Login on Mobile (or Incognito window) with same account.
    *   **Expected**: Mobile shows the same items.
*   **TC-A3: Logout Security**
    *   **Action**: Logout.
    *   **Expected**: Cart should clear (or revert to an empty guest cart). Next user on same PC shouldn't see previous user's items.

## 3. Checkout Flow
*   **TC-C1: Navigation**
    *   **Action**: Click "Proceed to Checkout" from Cart.
    *   **Expected**: Navigates to `/checkout`. If not logged in, redirects to `/login` then back to `/checkout`.
*   **TC-C2: Form Validation**
    *   **Action**: Try to submit without Address.
    *   **Expected**: HTML5 validation prevents submission.
*   **TC-C3: Order Creation**
    *   **Action**: Submit valid form.
    *   **Expected**: Redirects to `/checkout/success/[ORDER_ID]`. 
    *   **Database Check**: 
        *   `orders` collection has new document.
        *   `products` collection has reduced stock for purchased items.
        *   `carts` collection for user is empty.

## 4. UI/UX
*   **TC-U1**: Badge Count matches total items.
*   **TC-U2**: "Add to Cart" on Product Detail shows "Adding..." loading state briefly.
*   **TC-U3**: Toast notification appears on success.
