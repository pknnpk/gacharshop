---
description: How to start the development server
---
# Starting the Development Server

When you need to start the local development server (or restart it to apply config changes), **ALWAYS** use the following command instead of `npm run dev` directly. 

This ensures all previous "zombie" processes are killed, preventing port conflicts and stale environment variables.

// turbo
1. Run the clean start script
```powershell
npm run dev:clean
```
