# Mithila Chitrakala — Fullstack Local Setup (Node.js)

Mithila ChitraKala Store was originally a frontend-only static E-Commerce site. I added a Node.js backend (Express) that serves the static files and exposes simple JSON APIs for products, partner stores, and order submission.

What I added

- `package.json` — project manifest with dependencies and scripts
- `server/index.js` — Express server that serves static files and provides API endpoints:
  - `GET /api/products` — returns products from `server/db/products.json`
  - `GET /api/products/:slug` — returns single product by slug or id
  - `GET /api/partners` — returns partner stores from `server/db/partner-store.json`
  - `POST /api/orders` — accepts orders and persists them to `server/db/orders.json`
- `server/db/orders.json` — new file used to store orders
- Modified `script.js` to call the API endpoints (with fallbacks to local JSON/localStorage when server is not available)

Run locally (Windows PowerShell)

1. Install dependencies:

   npm install

2. Start the server (production):

   npm start

   The server will listen on http://localhost:3000 by default.

3. Development with automatic restart (requires `nodemon`):

   npm run dev

Notes

- The server serves static files from the project root, so you can open the site at http://localhost:3000/
- Orders posted to `/api/orders` are appended to `server/db/orders.json` (file-based persistence).
- If the backend is unavailable, the frontend falls back to reading `server/db/*.json` directly (this keeps development flexible).

Security

- This is a minimal local demo server. Do not run it in production without adding authentication, validation and proper rate-limiting.

Next steps I can help with

- Add simple admin page to view orders
- Add pagination or search for products
- Add image upload for partners/products (requires more server-side work)
