# Verification Guide: Phase 3.7 (Mobile First & Theme)

This phase introduces a new mobile-first design, sticky bottom navigation, and the "Gachar" theme colors.

## 1. Theme Colors
*   **Check**: Verify the new color palette is active.
    *   **Primary (Red)**: Active tab icons, badges.
    *   **Secondary (Blue)**: Headers, links.
    *   **Accent (Yellow)**: Highlights.

## 2. Mobile Layout (Use Mobile View in DevTools)
*   **Bottom Navigation**:
    *   Verify the sticky bar appears at the bottom.
    *   Verify 4 Tabs: `Home`, `Mall`, `Notifications`, `Me`.
    *   Clicking tabs should navigate correctly:
        *   **Home** -> `/`
        *   **Mall** -> `/products`
        *   **Notifications** -> `/notifications` (See mock data?)
        *   **Me** -> `/profile`
*   **Header**:
    *   "GacharShop" text should be **HIDDEN**.
    *   Only Search and Cart icons should be visible.
    *   Hamburger menu should be **GONE**.

## 3. Desktop Layout (Use Full Screen)
*   **Bottom Navigation**: Should be **HIDDEN**.
*   **Header**: Should show full "GacharShop" logo and standard nav links (`Home`, `Shop`, `Categories`, `About`).

## 4. "Me" Tab (Profile)
*   Go to **Me** tab.
*   Verify User Info is shown (or "Guest User").
*   Check the "My Purchases" and "Account Settings" UI.
*   **Test Logout**: Click "Log Out" -> Should redirect to Home (or Login).

## 5. Notifications Tab
*   Go to **Notifications** tab.
*   Verify the list of mock notifications (Promo, Order, System) is displayed.
