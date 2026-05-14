# 📦 Stock Management System

A modern, full-stack stock and inventory management system built with Next.js, Node.js, and PostgreSQL. Designed to help businesses manage inventory, categories, sub-categories, sales, payments, billing, and reporting efficiently with real-time stock updates.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 5.22.0 |
| Auth | JWT (Role-based) |
| PDF | PDFKit |
| Barcode | @ericblade/quagga2, JsBarcode |
| Charts | Chart.js + react-chartjs-2 |
| Export | jsPDF + jspdf-autotable |
| Validation | express-validator |
| Logging | Winston |

---

## 📁 Project Structure

```
stock-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (9 models)
│   │   └── seed.ts                    # Seed data (users, categories, products)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── subcategory.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── payment.controller.ts      ← NEW
│   │   │   ├── product.controller.ts
│   │   │   ├── report.controller.ts
│   │   │   ├── sale.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts         # JWT + role guard
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── category.routes.ts
│   │   │   ├── subcategory.routes.ts
│   │   │   ├── payment.routes.ts          ← NEW
│   │   │   ├── product.routes.ts
│   │   │   ├── sale.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   └── utils/
│   │       ├── invoice.ts                 # PDFKit invoice (includes payment info)
│   │       ├── logger.ts
│   │       └── prisma.ts
│   ├── .env
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/             # KPI dashboard
│       │   │   ├── inventory/             # Product management + barcode + export
│       │   │   ├── categories/            # Category + sub-category management
│       │   │   ├── sales/                 # Sales & POS + payment method column
│       │   │   ├── reports/               # Analytics + export (CSV/PDF)
│       │   │   └── users/                 # User management
│       │   └── login/
│       ├── components/
│       │   ├── dashboard/                 # SalesChart, TopProducts, LowStockAlert, RecentSales
│       │   ├── inventory/
│       │   │   ├── ProductModal.tsx        # Add/edit product (with sub-category)
│       │   │   ├── CategoryModal.tsx
│       │   │   ├── SubCategoryModal.tsx
│       │   │   ├── BarcodeModal.tsx        # Generate, print, download barcodes
│       │   │   └── StockMovementModal.tsx
│       │   ├── layout/                    # Sidebar, Header
│       │   ├── reports/                   # SalesReportChart
│       │   ├── sales/
│       │   │   ├── NewSaleModal.tsx        # POS cart + payment method selector
│       │   │   ├── BarcodeScanner.tsx
│       │   │   └── SaleDetailModal.tsx     # Invoice view + payment details
│       │   ├── ui/                        # LoadingSpinner, Pagination, ConfirmDialog
│       │   └── users/                     # UserModal
│       ├── lib/
│       │   ├── api.ts                     # Axios API client (all endpoints)
│       │   ├── export.ts                  # CSV + PDF export utilities
│       │   └── utils.ts
│       └── store/
│           └── auth.store.ts
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env — set your DATABASE_URL and JWT_SECRET

npm install
npx prisma db push
npx prisma generate
npx prisma db seed
npm run dev
```

> Backend runs on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

> Frontend runs on **http://localhost:3000**

### 3. Prisma Studio (optional)

```bash
cd backend
npm run prisma:studio
```

> **Windows note:** Stop the backend before running `npx prisma generate` — the Prisma `.dll` engine file is locked while the server is running.

---

## 🐳 Docker (Full Stack)

```bash
docker-compose up -d
docker exec stock_backend npx ts-node prisma/seed.ts
```

---

## 👤 Default Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@stockms.com | admin123 | Full access |
| Cashier | cashier@stockms.com | cashier123 | Sales + Inventory view |
| Inventory Manager | manager@stockms.com | manager123 | Inventory + Categories + Reports |

---

## 🎯 Features

### 📦 Inventory Management
- ✅ Add, edit, deactivate products (soft delete)
- ✅ Assign category and optional sub-category per product
- ✅ Real-time stock status — In Stock / Low Stock / Out of Stock
- ✅ Search and filter by name, SKU, barcode, category, status
- ✅ Stock movement history per product (IN / OUT / ADJUSTMENT logs)
- ✅ Low stock alerts with notification badge in header
- ✅ Minimum quantity threshold per product
- ✅ URL-based deep filtering (`/inventory?categoryId=xxx`)
- ✅ Export inventory to CSV or PDF

### 🏷️ Category Management
- ✅ Dedicated Categories page with expandable list layout
- ✅ Add, edit, delete categories
- ✅ Per-category stock summary (in / low / out counts)
- ✅ "View in Inventory" deep-link per category
- ✅ Prevents deletion of categories that have products
- ✅ Audit logging on all changes

### 🗂️ Sub-Category Management
- ✅ Optional sub-categories linked to a parent category
- ✅ Add, edit, delete sub-categories inline from the Categories page
- ✅ Expandable category rows show sub-categories with product counts
- ✅ Sub-category dropdown in Product form — dynamically filtered by selected category
- ✅ Validates sub-category belongs to selected category on backend
- ✅ Cascade delete — deleting a category removes its sub-categories
- ✅ Name uniqueness enforced per category

### 💰 Sales Management
- ✅ Cart-based POS interface with live product search
- ✅ Automatic stock deduction on sale (DB transaction)
- ✅ Insufficient stock prevention with clear error messages
- ✅ Customer name and phone capture
- ✅ Order-level discount support
- ✅ Per-product tax rate calculation
- ✅ Cancel sale with automatic stock restoration
- ✅ Sales history with status filter, pagination, and payment method column
- ✅ Export sales to CSV or PDF

### 💳 Payment Module
- ✅ **Cash** — amount received input with live change calculation, blocks submit if underpaid
- ✅ **Cheque** — cheque number (required), bank name, account holder name fields; blue badge
- ✅ **PhonePay** — transaction ID (required); purple badge
- ✅ **eSewa** — transaction ID (required); teal badge
- ✅ Payment status tracking — Paid / Partial / Pending / Failed
- ✅ Payment details shown in invoice view and PDF (including bank name and account holder for cheque)
- ✅ Payment method badge in sales list table (green=Cash, blue=Cheque, purple=PhonePay, teal=eSewa)
- ✅ Payment summary API by method totals
- ✅ Payment stored in dedicated `Payment` table linked 1:1 to `Sale`

### 📷 Barcode Scanner
- ✅ Camera-based scanning (@ericblade/quagga2)
- ✅ Manual barcode entry fallback
- ✅ USB barcode scanner support
- ✅ Auto-add scanned product to cart
- ✅ Barcode generation from SKU (EAN-13 with check digit)
- ✅ Barcode display, print label, and SVG download per product
- ✅ Save generated barcode back to product record

### 🧾 Billing & Invoices
- ✅ Professional PDF invoice generation (PDFKit, A4 layout)
- ✅ Download invoice as PDF with auth-protected endpoint
- ✅ Print invoice — isolated print view (sidebar/header excluded)
- ✅ Invoice includes: product details, qty, unit price, tax %, totals, cashier, customer
- ✅ Payment details section in invoice (method, status, amount paid, change, reference)

### 📊 Dashboard & Reports
- ✅ Real-time KPI dashboard (auto-refreshes every 30s)
- ✅ Today's revenue, weekly revenue, monthly revenue
- ✅ Total products, low stock count, out of stock count
- ✅ 7-day sales trend line chart
- ✅ Top 5 products by revenue
- ✅ Recent 5 sales feed
- ✅ Low stock alerts panel
- ✅ Sales reports — daily / weekly / monthly / yearly
- ✅ Inventory valuation report (cost value, retail value, potential profit)
- ✅ Category-wise revenue breakdown (bar chart + table)
- ✅ Export reports to CSV or PDF

### 👥 User Management (Admin only)
- ✅ Create, edit, deactivate users
- ✅ Role-based access control — Admin / Cashier / Inventory Manager
- ✅ Audit logs for all stock, category, and sub-category changes

---

## 🔐 Role Permissions

| Feature | Admin | Cashier | Inventory Manager |
|---------|-------|---------|-------------------|
| Dashboard | ✅ | ✅ | ✅ |
| View Inventory | ✅ | ✅ | ✅ |
| Add/Edit Products | ✅ | ❌ | ✅ |
| Delete Products | ✅ | ❌ | ❌ |
| Categories & Sub-Categories | ✅ | ❌ | ✅ |
| Delete Categories | ✅ | ❌ | ❌ |
| Create Sales | ✅ | ✅ | ❌ |
| Cancel Sales | ✅ | ❌ | ❌ |
| Update Payment | ✅ | ❌ | ❌ |
| Reports | ✅ | ❌ | ✅ |
| Payment Summary | ✅ | ❌ | ✅ || User Management | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List with search, filter, pagination |
| GET | `/api/products/low-stock` | Low & out-of-stock products |
| GET | `/api/products/barcode/:barcode` | Lookup by barcode |
| GET | `/api/products/:id` | Single product with movements |
| GET | `/api/products/:id/movements` | Stock movement history |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Deactivate product (soft delete) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | All categories with sub-categories + stock summary |
| GET | `/api/categories/:id` | Single category with products |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete (blocks if has products) |

### Sub-Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subcategories` | All sub-categories (`?categoryId=` filter) |
| GET | `/api/subcategories/:id` | Single sub-category with products |
| POST | `/api/subcategories` | Create sub-category |
| PUT | `/api/subcategories/:id` | Update sub-category |
| DELETE | `/api/subcategories/:id` | Delete (blocks if has products) |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | List with status/date filter, pagination |
| GET | `/api/sales/:id` | Single sale with items + payment |
| POST | `/api/sales` | Create sale + payment in one transaction |
| PUT | `/api/sales/:id/cancel` | Cancel sale (restores stock) |
| GET | `/api/sales/:id/invoice` | Download PDF invoice |

### Payments ← NEW
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/summary` | Revenue totals by payment method |
| GET | `/api/payments/sale/:saleId` | Get payment for a sale |
| PUT | `/api/payments/sale/:saleId` | Update payment details (Admin only) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/sales?period=monthly` | Sales report |
| GET | `/api/reports/inventory` | Inventory valuation report |
| GET | `/api/reports/audit-logs` | Audit log history |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | KPIs, trend data, top products, alerts |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | All users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user / role |
| DELETE | `/api/users/:id` | Deactivate user |

---

## 🗄️ Database Schema

```
User          — id, name, email, password, role, isActive
Category      — id, name, description
SubCategory   — id, name, description, categoryId
Product       — id, name, sku, barcode, categoryId, subCategoryId (optional),
                price, costPrice, quantity, minQuantity, unit, status, taxRate, isActive
Sale          — id, invoiceNo, customerName, customerPhone, userId,
                subtotal, taxAmount, discount, total, status
Payment       — id, saleId (unique), method (CASH/CHEQUE/PHONEPAY/ESEWA), status,
                amountPaid, changeAmount, referenceNo, bankName, accountName, notes, paidAt
SaleItem      — id, saleId, productId, quantity, unitPrice, taxRate, discount, total
StockMovement — id, productId, type (IN/OUT/ADJUSTMENT), quantity,
                previousQty, newQty, reason, reference
AuditLog      — id, userId, action, entity, entityId, oldData, newData
```

**Key constraints:**
- `Payment` is 1:1 with `Sale` — created atomically in the same transaction
- `SubCategory.name` is unique per category
- Deleting a `Category` cascades to its `SubCategory` records
- `Product.subCategoryId` is optional

---

## 🛠️ Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/stock_management_db?schema=public"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 📜 Available Scripts

### Backend
```bash
npm run dev               # Start dev server with hot reload
npm run build             # Compile TypeScript to dist/
npm start                 # Run compiled build
npm run prisma:generate   # Regenerate Prisma client
npm run prisma:studio     # Open Prisma Studio
npm run prisma:seed       # Run seed script
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
# Stop the backend server first (Windows — .dll file lock)
npx prisma db push       # Apply schema to database
npx prisma generate      # Regenerate Prisma client types
npm run dev              # Restart backend
```
