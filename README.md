# 📦 Stock Management System

A modern, multi-tenant, full-stack stock and inventory management system built with Next.js, Node.js, and PostgreSQL. Each client (tenant) gets its own isolated database while sharing a single codebase. Supports client-specific features via feature flags.

**Current Tenants:**
- 🟣 **Scoopmandu** — Premium Ice Cream & Desserts (includes Refrigerator Tracking)
- 🔵 **RKT Tradings** — Wholesale & Retail Trading

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (one DB per tenant) |
| ORM | Prisma 5.22.0 |
| Auth | JWT (Role-based, per-tenant) |
| Multi-Tenancy | Header-based (`x-tenant-id`) with per-tenant Prisma clients |
| Currency | NPR (Nepali Rupees — Rs.) |
| PDF | PDFKit |
| Barcode | @ericblade/quagga2, JsBarcode |
| Charts | Chart.js + react-chartjs-2 |
| Export | jsPDF + jspdf-autotable |
| Validation | express-validator |
| Logging | Winston |

---

## 🏗️ Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌─────────────────┐                                        │
│  │ Tenant Selector  │ → User picks "Scoopmandu"             │
│  └────────┬────────┘                                        │
│           │ stores tenantId in localStorage                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │ Login Page       │ → Branded with tenant colors + PAN/VAT│
│  └────────┬────────┘                                        │
│           │ every API call sends: x-tenant-id: scoopmandu   │
│           ▼                                                  │
├───────────────────────────────────────────────────────────────
│  Backend (single Express server)                             │
│  ┌─────────────────┐                                        │
│  │ Tenant Middleware│ → Resolves tenant from header          │
│  └────────┬────────┘                                        │
│           │ attaches correct PrismaClient to request         │
│           ▼                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ scoopmandu_db   │    │ rkt_tradings_db │                │
│  │ (PostgreSQL)    │    │ (PostgreSQL)    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
stock-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Shared schema (13 models)
│   │   └── seed.ts                    # Tenant-aware seed (detects DB name)
│   ├── scripts/
│   │   └── setup-tenants.ts           # Push schema to all tenant DBs
│   ├── src/
│   │   ├── config/
│   │   │   └── tenants.ts             # ★ Tenant registry (DB URLs, features, branding, PAN)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── subcategory.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── refrigerator.controller.ts  ← Scoopmandu only
│   │   │   ├── report.controller.ts
│   │   │   ├── sale.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── tenant.middleware.ts    # ★ Resolves tenant, attaches PrismaClient
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── routes/
│   │   │   └── refrigerator.routes.ts  # Feature-gated (403 for non-Scoopmandu)
│   │   └── utils/
│   │       ├── prisma.ts              # Multi-tenant PrismaClient manager
│   │       ├── request.ts             # db(req) helper
│   │       ├── invoice.ts             # PDF with tenant branding + PAN/VAT
│   │       └── logger.ts
│   ├── .env
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── select-tenant/         # ★ Tenant selector page
│       │   ├── login/                 # Branded per tenant + PAN/VAT
│       │   └── (dashboard)/
│       │       ├── dashboard/
│       │       ├── inventory/
│       │       ├── categories/
│       │       ├── sales/             # Product grid POS (all items visible)
│       │       ├── reports/
│       │       ├── refrigerators/     # ★ Scoopmandu only (5 sub-pages)
│       │       └── users/
│       ├── components/
│       │   ├── refrigerators/         # RefrigeratorModal, ShopModal, AssignModal
│       │   ├── sales/
│       │   │   └── NewSaleModal.tsx   # Product grid + cart + payment
│       │   └── ...
│       ├── lib/
│       │   ├── api.ts                 # Sends x-tenant-id header
│       │   ├── export.ts             # CSV/PDF (Rs. currency)
│       │   └── utils.ts             # formatCurrency → Rs.
│       └── store/
│           ├── auth.store.ts
│           └── tenant.store.ts
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Create Tenant Databases

```sql
psql -U postgres
CREATE DATABASE scoopmandu_db;
CREATE DATABASE rkt_tradings_db;
\q
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env — set your postgres password

npm install
npm run setup:tenants          # Push schema to both DBs
npx prisma generate

# Seed Scoopmandu
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/scoopmandu_db?schema=public"
npx prisma db seed

# Seed RKT Tradings
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rkt_tradings_db?schema=public"
npx prisma db seed

npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### 4. Use the App

1. Open http://localhost:3000
2. Select tenant (Scoopmandu or RKT Tradings)
3. Login with credentials shown on login page

---

## 👤 Credentials (per tenant)

| Tenant | Role | Email | Password |
|--------|------|-------|----------|
| Scoopmandu | Admin | admin@scoopmandu.com | admin123 |
| Scoopmandu | Cashier | cashier@scoopmandu.com | cashier123 |
| Scoopmandu | Manager | manager@scoopmandu.com | manager123 |
| RKT Tradings | Admin | admin@rkttradings.com | admin123 |
| RKT Tradings | Cashier | cashier@rkttradings.com | cashier123 |
| RKT Tradings | Manager | manager@rkttradings.com | manager123 |

---

## 🎯 Features

### 🏢 Multi-Tenant System
- ✅ Tenant selector page with branded cards
- ✅ Per-tenant isolated PostgreSQL database
- ✅ Header-based tenant resolution (`x-tenant-id`)
- ✅ Per-tenant branding (colors, company name, tagline, PAN/VAT)
- ✅ Per-tenant feature flags
- ✅ Switch organization from sidebar
- ✅ Auto-refresh tenant config on dashboard load

### 📦 Inventory Management
- ✅ Add, edit, deactivate products
- ✅ Category + optional sub-category
- ✅ Real-time stock status (In Stock / Low Stock / Out of Stock)
- ✅ Search and filter by name, SKU, barcode, category, status
- ✅ Stock movement history (IN / OUT / ADJUSTMENT)
- ✅ Low stock alerts with notification badge
- ✅ Barcode generation, print, SVG download
- ✅ Export to CSV or PDF

### 🏷️ Category & Sub-Category Management
- ✅ Expandable category list with inline sub-categories
- ✅ Full CRUD with audit logging
- ✅ Cascade delete, name uniqueness per category

### 💰 Sales Management (POS)
- ✅ **All products displayed in a clickable grid** — no search required
- ✅ Click product to add to cart, click again to increase quantity
- ✅ Products in cart highlighted with quantity badge
- ✅ Category filter + text search for quick filtering
- ✅ Automatic stock deduction (DB transaction)
- ✅ Insufficient stock prevention
- ✅ Customer info, discount, per-product tax
- ✅ Cancel sale with stock restoration
- ✅ Barcode scanner still available
- ✅ Export to CSV or PDF

### 💳 Payment Module
- ✅ **Cash** — amount received + live change calculation
- ✅ **Cheque** — cheque number, bank name, account holder name
- ✅ **PhonePay** — transaction ID
- ✅ **eSewa** — transaction ID
- ✅ Payment status (Paid / Partial / Pending / Failed)
- ✅ Payment details in invoice view and PDF
- ✅ Payment method badges in sales list

### 🧾 Billing & Invoices
- ✅ PDF invoice with tenant company name + PAN/VAT number
- ✅ Currency in Nepali Rupees (Rs.)
- ✅ Download + print (isolated print view)
- ✅ Payment details section

### 📊 Dashboard & Reports
- ✅ Real-time KPIs (auto-refresh 30s)
- ✅ Sales trend chart, top products, low stock alerts
- ✅ Sales reports (daily/weekly/monthly/yearly)
- ✅ Inventory valuation report
- ✅ Category-wise revenue breakdown
- ✅ All charts show Rs. currency
- ✅ Export to CSV or PDF

### 📷 Barcode Scanner
- ✅ Camera scanning + manual entry + USB scanner
- ✅ Barcode generation from SKU
- ✅ Print label, SVG download

### 🧊 Refrigerator Tracking (Scoopmandu Only)
- ✅ Refrigerator master management (code, brand, model, capacity, serial number, status)
- ✅ Shop/store management (name, code, address, contact, region)
- ✅ Assign refrigerator to shop
- ✅ Transfer refrigerator between shops
- ✅ Return/retrieve refrigerator
- ✅ Assignment history with full audit trail
- ✅ Refrigerator tracking dashboard (stats, shop-wise count, recent activity)
- ✅ Reports with CSV/PDF export
- ✅ Activity logs (Created, Assigned, Transferred, Returned, Status Changed)
- ✅ Feature-gated: hidden in UI + blocked at API level for non-Scoopmandu tenants
- ✅ Status tracking: Available / Assigned / Under Maintenance / Inactive

### 👥 User Management
- ✅ Role-based access (Admin / Cashier / Inventory Manager)
- ✅ Audit logs for all changes

---

## 🔐 Role Permissions

| Feature | Admin | Cashier | Inventory Manager |
|---------|-------|---------|-------------------|
| Dashboard | ✅ | ✅ | ✅ |
| View Inventory | ✅ | ✅ | ✅ |
| Add/Edit Products | ✅ | ❌ | ✅ |
| Delete Products | ✅ | ❌ | ❌ |
| Categories & Sub-Categories | ✅ | ❌ | ✅ |
| Create Sales | ✅ | ✅ | ❌ |
| Cancel Sales | ✅ | ❌ | ❌ |
| Reports & Export | ✅ | ❌ | ✅ |
| Refrigerators (Scoopmandu) | ✅ | ❌ | ✅ |
| User Management | ✅ | ❌ | ❌ |

---

## 🔌 API Endpoints

### Tenant (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants` | List all tenants |
| GET | `/api/tenant/config` | Current tenant config |

### Auth, Products, Categories, Sub-Categories, Sales, Payments, Reports, Dashboard, Users
> All standard CRUD endpoints — tenant resolved from `x-tenant-id` header.

### Refrigerators (Scoopmandu only — 403 for others)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/refrigerators` | List with filters |
| GET | `/api/refrigerators/dashboard` | Stats + shop-wise count |
| GET | `/api/refrigerators/logs` | Activity logs |
| GET | `/api/refrigerators/:id` | Single with history |
| POST | `/api/refrigerators` | Create |
| PUT | `/api/refrigerators/:id` | Update |
| DELETE | `/api/refrigerators/:id` | Deactivate |
| GET | `/api/refrigerators/shops/list` | All shops |
| POST | `/api/refrigerators/shops` | Create shop |
| PUT | `/api/refrigerators/shops/:id` | Update shop |
| DELETE | `/api/refrigerators/shops/:id` | Deactivate shop |
| GET | `/api/refrigerators/assignments/list` | Assignment history |
| POST | `/api/refrigerators/assignments/assign` | Assign to shop |
| POST | `/api/refrigerators/assignments/transfer` | Transfer between shops |
| POST | `/api/refrigerators/assignments/return` | Return from shop |

---

## 🗄️ Database Schema (per tenant)

```
User                    — id, name, email, password, role, isActive
Category                — id, name, description
SubCategory             — id, name, description, categoryId
Product                 — id, name, sku, barcode, categoryId, subCategoryId,
                          price, costPrice, quantity, minQuantity, unit, status, taxRate
Sale                    — id, invoiceNo, customerName, customerPhone, userId,
                          subtotal, taxAmount, discount, total, status
Payment                 — id, saleId, method (CASH/CHEQUE/PHONEPAY/ESEWA), status,
                          amountPaid, changeAmount, referenceNo, bankName, accountName
SaleItem                — id, saleId, productId, quantity, unitPrice, taxRate, discount, total
StockMovement           — id, productId, type, quantity, previousQty, newQty, reason
AuditLog                — id, userId, action, entity, entityId, oldData, newData

── Refrigerator Tracking (Scoopmandu) ──
Refrigerator            — id, code, name, brand, model, capacity, serialNumber, status
Shop                    — id, name, code, address, contactPerson, phone, region
RefrigeratorAssignment  — id, refrigeratorId, shopId, assignedDate, returnedDate, status
RefrigeratorLog         — id, refrigeratorId, action, previousShop, newShop, performedBy
```

---

## 🛠️ Environment Variables

### Backend (`backend/.env`)
```env
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

DATABASE_URL="postgresql://postgres:password@localhost:5432/stock_management_db?schema=public"
DATABASE_URL_SCOOPMANDU="postgresql://postgres:password@localhost:5432/scoopmandu_db?schema=public"
DATABASE_URL_RKT="postgresql://postgres:password@localhost:5432/rkt_tradings_db?schema=public"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 🔧 Adding a New Tenant

1. Add to `backend/src/config/tenants.ts`
2. Add `DATABASE_URL_NEWCLIENT` to `.env`
3. Create database: `CREATE DATABASE newclient_db;`
4. Run `npm run setup:tenants`
5. Seed: `$env:DATABASE_URL = "...newclient_db..."; npx prisma db seed`
6. Restart backend — new tenant appears automatically

---

## 🎛️ Feature Flags

```typescript
// backend/src/config/tenants.ts
features: {
  barcode: true,
  subCategories: true,
  reports: true,
  multiPayment: true,
  refrigeratorTracking: true,  // Scoopmandu only
}
```

Frontend checks: `tenant?.features?.refrigeratorTracking`
Backend blocks: 403 response if feature flag is false

---

## 📜 Available Scripts

### Backend
```bash
npm run dev               # Start dev server
npm run build             # Compile TypeScript
npm start                 # Run production build
npm run setup:tenants     # Push schema to all tenant DBs
npm run prisma:generate   # Regenerate Prisma client
npm run prisma:studio     # Visual DB browser
npm run prisma:seed       # Seed (uses DATABASE_URL)
```

### Frontend
```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

---

## 🔄 After Schema Changes

```bash
# Stop backend first (Windows .dll lock)
npx prisma generate
npm run setup:tenants     # Push to ALL tenant DBs
npm run dev
```
