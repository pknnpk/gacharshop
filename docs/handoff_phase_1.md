# Handoff Notes: Phase 1 Completion -> Phase 2 Start

## Current Status
**Phase 1 (Database & Authentication) is COMPLETE and VERIFIED.**
The application is deployed to Cloud Run and fully functional for authentication.

### Key Infrastructure & Config
*   **Cloud Run URL**: `https://gachar-shop-258615877330.asia-southeast1.run.app`
*   **Database (MongoDB Atlas)**:
    *   **Production**: `gacharshop_prod` (Used by Cloud Run)
    *   **Development**: `gacharshop_dev` (Used by Localhost)
*   **Authentication**:
    *   **Google**: Fully functional.
    *   **LINE**: Fully functional. Privacy Policy added.
    *   *Note*: User model allows missing emails (`sparse: true`) to support LINE users without email permission.

## Development Workflow (CRITICAL)
**ALWAYS start the server using:**
```bash
npm run dev:clean
```
*Why?* We found that standard `npm run dev` leaves zombie processes on Windows, causing stale environment variables (e.g., pointing to the wrong DB). The clean script forces a kill of old processes before starting.

## Next Steps: Phase 2
The next agent should begin **Phase 2: Product Catalog & UI**.

### Priority Tasks
1.  **Database Seeding**: Create `scripts/seed.ts` to populate `gacharshop_dev` (and eventually prod) with initial Categories and Products.
2.  **UI Implementation**:
    *   Build standard Layout (Header/Footer).
    *   Create Landing Page.
    *   Create Product Listing & Detail pages.

### Artifacts to Reference
*   [task.md](file:///C:/Users/66886/.gemini/antigravity/brain/cbc747c6-e67a-4f35-8996-0e0ef6bed782/task.md): Checklist is already pre-filled for Phase 2.
*   [lib/db.ts](file:///c:/Users/66886/Documents/Projects/gacharshop/lib/db.ts): Connection logic (runtime-only check for MONGODB_URI).
*   `models/*.ts`: All Mongoose schemas are already created and waiting to be used.
