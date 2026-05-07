# 📦 Stock Management System

A modern, full-stack stock and inventory management system built with Next.js, Node.js, and PostgreSQL. Designed to help businesses manage inventory, categories, sub-categories, sales, billing, and reporting efficiently with real-time stock updates.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | JWT (Role-based) |
| PDF | PDFKit |
| Barcode | @ericblade/quagga2 |
| Charts | Chart.js + react-chartjs-2 |
| Validation | express-validator |
| Logging | Winston |

---

## 📁 Project Structure

```
stock-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (8 models)
│   │   └── seed.ts                    # Seed data (users, categories, products)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── subcategory.controller.ts  ← NEW
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── report.controller.ts
│   │   │   ├── sale.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # JWT + role guard
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── category.routes.ts
│   │   │   ├── subcategory.routes.ts  ← NEW
│   │   │   ├── product.routes.ts
│   │   │   ├── sale.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   └── utils/
│   │       ├── invoice.ts             # PDFKit invoice generator
│   │       ├── logger.ts              # Winston logger
│   │       └── prisma.ts              # Prisma client singleton
│   ├── prisma.config.ts               # Prisma 7 datasource config
│   ├── .env                           # Environment variables
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/         # KPI dashboard
│       │   │   ├── inventory/         # Product management
│       │   │   ├── categories/        # Category + sub-category management
│       │   │   ├── sales/             # Sales & POS
│       │   │   ├── reports/           # Analytics & reports
│       │   │   └── users/             # User management
│       │   └── login/
│       ├── components/
│       │   ├── dashboard/             # SalesChart, TopProducts, LowStockAlert, RecentSales
│       │   ├── inventory/
│       │   │   ├── ProductModal.tsx       # Add/edit product (with sub-category)
│       │   │   ├── CategoryModal.tsx      # Add/edit category
│       │   │   ├── SubCategoryModal.tsx   ← NEW
│       │   │   └── StockMovementModal.tsx
│       │   ├── layout/                # Sidebar, Header
│       │   ├── reports/               # SalesReportChart
│       │   ├── sales/                 # NewSaleModal, BarcodeScanner, SaleDetailModal
│       │   ├── ui/                    # LoadingSpinner, Pagination, ConfirmDialog
│       │   └── users/                 # UserModal
│       ├── lib/
│       │   ├── api.ts                 # Axios API client (all endpoints)
│       │   └── utils.ts               # Formatters, badge helpers
│       └── store/
│           └── auth.store.ts          # Zustand auth state
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

# Install dependencies
npm install

# Create database tables
npx prisma db push

# Regenerate Prisma client
npx prisma generate

# Seed with sample data
npx prisma db seed

# Start dev server
npm run dev
```

> Backend runs on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.local.example .env.local

# Install dependencies
npm install

# Start dev server
npm run dev
```

> Frontend runs on **http://localhost:3000**

### 3. Prisma Studio (optional — visual DB browser)

```bash
cd backend
npm run prisma:studio
```

---

## 🐳 Docker (Full Stack)

```bash
# Start all services (PostgreSQL + backend + frontend)
docker-compose up -d

# Seed the database
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
- ✅ Minimum quantity threshold per product for alerts
- ✅ URL-based deep filtering (e.g. `/inventory?categoryId=xxx`)
- ✅ "Categories" shortcut button in inventory header

### 🏷️ Category Management
- ✅ Dedicated Categories page with expandable list layout
- ✅ Add, edit, delete categories with confirmation
- ✅ Per-category stock summary (in stock / low / out of stock counts)
- ✅ "View in Inventory" deep-link per category
- ✅ Prevents deletion of categories that have products
- ✅ Audit logging on all category changes

### 🗂️ Sub-Category Management ← NEW
- ✅ Sub-categories are optional and belong to a parent category
- ✅ Add, edit, delete sub-categories inline from the Categories page
- ✅ Expandable category rows show all sub-categories with product counts
- ✅ Sub-category dropdown in Product form — dynamically filtered by selected category
- ✅ Clears sub-category selection when category changes
- ✅ Validates sub-category belongs to the selected category on backend
- ✅ Cascade delete — deleting a category removes its sub-categories
- ✅ Blocks deletion of sub-categories that have products
- ✅ Audit logging on all sub-category changes
- ✅ Name uniqueness enforced per category (same name allowed in different categories)

### 💰 Sales Management
- ✅ Cart-based POS interface with live product search
- ✅ Automatic stock deduction on sale (DB transaction)
- ✅ Insufficient stock prevention with clear error messages
- ✅ Customer name and phone capture
- ✅ Order-level discount support
- ✅ Per-product tax rate calculation
- ✅ Cancel sale with automatic stock restoration
- ✅ Sales history with status filter and pagination

### 📷 Barcode Scanner
- ✅ Camera-based scanning (@ericblade/quagga2)
- ✅ Manual barcode entry fallback
- ✅ USB barcode scanner support (scan into manual field)
- ✅ Auto-add scanned product to cart
- ✅ Graceful error handling (permission denied, no camera found)

### 🧾 Billing & Invoices
- ✅ Professional PDF invoice generation (PDFKit, A4 layout)
- ✅ Download invoice as PDF with auth-protected endpoint
- ✅ Print invoice — isolated print view (sidebar/header excluded)
- ✅ Invoice includes: product details, qty, unit price, tax %, totals, cashier, customer

### 📊 Dashboard & Reports
- ✅ Real-time KPI dashboard (auto-refreshes every 30s)
- ✅ Today's revenue, weekly revenue, monthly revenue with order counts
- ✅ Total products, low stock count, out of stock count
- ✅ 7-day sales trend line chart
- ✅ Top 5 products by revenue (progress bar visualization)
- ✅ Recent 5 sales feed
- ✅ Low stock alerts panel with link to inventory
- ✅ Sales reports — daily / weekly / monthly / yearly
- ✅ Inventory valuation report (cost value, retail value, potential profit)
- ✅ Category-wise revenue breakdown (bar chart + table)

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
| Categories | ✅ | ❌ | ✅ |
| Delete Categories | ✅ | ❌ | ❌ |
| Sub-Categories | ✅ | ❌ | ✅ |
| Delete Sub-Categories | ✅ | ❌ | ❌ |
| Create Sales | ✅ | ✅ | ❌ |
| Cancel Sales | ✅ | ❌ | ❌ |
| Reports | ✅ | ❌ | ✅ |
| User Management | ✅ | ❌ | ❌ |
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
| POST | `/api/products` | Create product (subCategoryId optional) |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Deactivate product (soft delete) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | All categories with sub-categories + stock summary |
| GET | `/api/categories/:id` | Single category with products and sub-categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category (blocks if has products) |

### Sub-Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subcategories` | All sub-categories (filter by `?categoryId=`) |
| GET | `/api/subcategories/:id` | Single sub-category with products |
| POST | `/api/subcategories` | Create sub-category (requires categoryId) |
| PUT | `/api/subcategories/:id` | Update sub-category |
| DELETE | `/api/subcategories/:id` | Delete sub-category (blocks if has products) |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | List with status/date filter, pagination |
| GET | `/api/sales/:id` | Single sale with items |
| POST | `/api/sales` | Create sale (deducts stock in transaction) |
| PUT | `/api/sales/:id/cancel` | Cancel sale (restores stock) |
| GET | `/api/sales/:id/invoice` | Download PDF invoice |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/sales?period=monthly` | Sales report (daily/weekly/monthly/yearly) |
| GET | `/api/reports/inventory` | Inventory valuation report |
| GET | `/api/reports/audit-logs` | Audit log history |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | KPIs, trend data, top products, low stock alerts |

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
SubCategory   — id, name, description, categoryId          ← NEW
Product       — id, name, sku, barcode, categoryId,
                subCategoryId (optional),                  ← NEW
                price, costPrice, quantity, minQuantity,
                unit, status, taxRate, isActive
Sale          — id, invoiceNo, customerName, customerPhone,
                userId, subtotal, taxAmount, discount, total, status
SaleItem      — id, saleId, productId, quantity, unitPrice,
                taxRate, discount, total
StockMovement — id, productId, type (IN/OUT/ADJUSTMENT),
                quantity, previousQty, newQty, reason, reference
AuditLog      — id, userId, action, entity, entityId, oldData, newData
```

**Key constraints:**
- `SubCategory.name` is unique per category (`@@unique([name, categoryId])`)
- Deleting a `Category` cascades to its `SubCategory` records
- `Product.subCategoryId` is optional — products don't require a sub-category

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
npm run prisma:studio     # Open Prisma Studio (visual DB browser)
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

Whenever `prisma/schema.prisma` is updated, run these commands in the backend folder:

```bash
npx prisma db push       # Apply schema changes to database
npx prisma generate      # Regenerate Prisma client types
```

> **Note:** Stop the backend dev server before running `prisma generate` on Windows — the Prisma query engine `.dll` file will be locked by the running process.
