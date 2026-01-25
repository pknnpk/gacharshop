# GacharShop Development Guide

**Status**: Phase 3.7 Completed (Mobile-First, Cart, Transactions)
**Last Updated**: January 2026

## 1. Architecture & Clean Stack

*   **Framework**: Next.js 14+ (App Router, Server Components first).
*   **Language**: TypeScript.
*   **Database**: MongoDB (Mongoose). **MUST BE A REPLICA SET** (Atlas default) to support Transactions.
*   **Styling**: Tailwind CSS (v4). 
    *   **Theme**: Custom "Gachar" palette (Red/Blue/Yellow) defined in `globals.css`.
*   **Auth**: NextAuth.js (Google & LINE).
*   **Infrastructure**: Google Cloud Run (Dockerized).

## 2. Infrastructure & Deployment

### Local Development
**CRITICAL**: Always start the dev server using the clean script. Windows zombie processes often lock DB connections or ports.
```powershell
npm run dev:clean
```
**Note**: Local development uses `.env`, while production deployment uses `env.yaml`.

### Production Deployment
The project uses Google Cloud Run.
**Deploy Command**:
```powershell
./deploy.ps1
```
*   Builds Docker Image.
*   Pushes to GCR.
*   Updates Cloud Run Service.
*   **Critical**: You MUST create `env.yaml` from `env.example.yaml` and populate it with secrets before deploying. `env.yaml` is gitignored.
*   **Note**: `NEXTAUTH_URL` in `env.yaml` must match the production URL.

## 3. Database Rules (Golden Rules)

### 3.1 ACID Transactions (Zero-Discrepancy)
**Requirement**: All operations involving Financials, Inventory, or Order Creation **MUST** use MongoDB Transactions.
**Goal**: Eliminate overselling and phantom orders.

**Implementation Pattern**:
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
    // 1. Deduct Stock (Atomic check)
    // 2. Create Order
    // 3. Create InventoryLog
    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

### 3.2 Inventory Audit (Traceability)
**Requirement**: **NEVER** simply update `product.stock` without logging it.
**Action**: Every stock change must generate an `InventoryLog` document.
*   **Fields**: `beforeBalance`, `afterBalance`, `referenceId` (Order ID), `reason`.

### 3.3 Order Lifecycle
**Requirement**: Orders must track their entire history, not just current status.
**Action**: Push to `Order.statusHistory` array for every state change.

## 4. Feature Implementations (Summary)

### Authentication
*   **Providers**: Google, LINE.
*   **Logic**: `app/api/auth/[...nextauth]/route.ts`. Handles merging accounts if email matches.
*   **Session**: Use `getServerSession` in API routes.

### Shopping Cart
*   **Dual Mode**: 
    *   **Guest**: `localStorage`.
    *   **Logged In**: MongoDB `Cart` collection.
*   **Migration**: Guest cart merges into User cart upon login.

### Mobile-First UI
*   **Bottom Navigation**: Sticky footer for mobile (Home, Mall, Notifications, Me).
*   **Responsive Header**: Adapts content based on screen size and active tab.

## 5. Testing
*   **Concurrency**: Use `scripts/test-concurrency.ts` to verify Transaction integrity.
*   **Flows**: Test Guest -> Login -> Checkout flow to ensure Cart persistence.
