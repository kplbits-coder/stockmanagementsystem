import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Detect which tenant we're seeding based on DATABASE_URL.
 * Falls back to 'generic' if can't determine.
 */
function detectTenant(): string {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('scoopmandu')) return 'scoopmandu';
  if (url.includes('rkt_tradings') || url.includes('rkt')) return 'rkt-tradings';
  return 'generic';
}

async function main() {
  const tenant = detectTenant();
  console.log(`🌱 Seeding database for: ${tenant.toUpperCase()}`);
  console.log(`   DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}\n`);

  // ─── Users (same structure, different names per tenant) ────────────────────
  const users = {
    'scoopmandu': {
      admin: { name: 'Scoopmandu Admin', email: 'admin@scoopmandu.com' },
      cashier: { name: 'Scoopmandu Cashier', email: 'cashier@scoopmandu.com' },
      manager: { name: 'Scoopmandu Manager', email: 'manager@scoopmandu.com' },
    },
    'rkt-tradings': {
      admin: { name: 'RKT Admin', email: 'admin@rkttradings.com' },
      cashier: { name: 'RKT Cashier', email: 'cashier@rkttradings.com' },
      manager: { name: 'RKT Manager', email: 'manager@rkttradings.com' },
    },
    'generic': {
      admin: { name: 'Admin User', email: 'admin@stockms.com' },
      cashier: { name: 'Cashier User', email: 'cashier@stockms.com' },
      manager: { name: 'Inventory Manager', email: 'manager@stockms.com' },
    },
  };

  const u = users[tenant as keyof typeof users] || users['generic'];

  await prisma.user.upsert({
    where: { email: u.admin.email },
    update: {},
    create: { name: u.admin.name, email: u.admin.email, password: await bcrypt.hash('admin123', 10), role: Role.ADMIN },
  });
  await prisma.user.upsert({
    where: { email: u.cashier.email },
    update: {},
    create: { name: u.cashier.name, email: u.cashier.email, password: await bcrypt.hash('cashier123', 10), role: Role.CASHIER },
  });
  await prisma.user.upsert({
    where: { email: u.manager.email },
    update: {},
    create: { name: u.manager.name, email: u.manager.email, password: await bcrypt.hash('manager123', 10), role: Role.INVENTORY_MANAGER },
  });

  // ─── Categories & Products (tenant-specific) ──────────────────────────────

  if (tenant === 'scoopmandu') {
    await seedScoopmandu();
  } else if (tenant === 'rkt-tradings') {
    await seedRKT();
  } else {
    await seedGeneric();
  }

  console.log('\n✅ Seed completed!');
  console.log(`👤 Admin: ${u.admin.email} / admin123`);
  console.log(`👤 Cashier: ${u.cashier.email} / cashier123`);
  console.log(`👤 Manager: ${u.manager.email} / manager123`);
}

// ─── Scoopmandu: Ice Cream & Desserts ────────────────────────────────────────
async function seedScoopmandu() {
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Ice Cream' }, update: {}, create: { name: 'Ice Cream', description: 'Premium ice cream flavors' } }),
    prisma.category.upsert({ where: { name: 'Desserts' }, update: {}, create: { name: 'Desserts', description: 'Cakes, pastries, and sweets' } }),
    prisma.category.upsert({ where: { name: 'Beverages' }, update: {}, create: { name: 'Beverages', description: 'Shakes, smoothies, and drinks' } }),
    prisma.category.upsert({ where: { name: 'Toppings & Add-ons' }, update: {}, create: { name: 'Toppings & Add-ons', description: 'Sauces, sprinkles, and extras' } }),
  ]);

  const products = [
    { name: 'Vanilla Classic (500ml)', sku: 'IC-VAN-500', barcode: '8801001000001', categoryId: categories[0].id, price: 350, costPrice: 180, quantity: 50, minQuantity: 10, unit: 'tubs', taxRate: 13 },
    { name: 'Chocolate Fudge (500ml)', sku: 'IC-CHO-500', barcode: '8801001000002', categoryId: categories[0].id, price: 380, costPrice: 200, quantity: 45, minQuantity: 10, unit: 'tubs', taxRate: 13 },
    { name: 'Strawberry Delight (500ml)', sku: 'IC-STR-500', barcode: '8801001000003', categoryId: categories[0].id, price: 380, costPrice: 195, quantity: 30, minQuantity: 10, unit: 'tubs', taxRate: 13 },
    { name: 'Mango Sorbet (500ml)', sku: 'IC-MNG-500', barcode: '8801001000004', categoryId: categories[0].id, price: 400, costPrice: 210, quantity: 25, minQuantity: 8, unit: 'tubs', taxRate: 13 },
    { name: 'Butter Scotch (1L)', sku: 'IC-BUT-1L', barcode: '8801001000005', categoryId: categories[0].id, price: 650, costPrice: 350, quantity: 20, minQuantity: 5, unit: 'tubs', taxRate: 13 },
    { name: 'Chocolate Brownie Cake', sku: 'DS-BRW-001', barcode: '8801002000001', categoryId: categories[1].id, price: 550, costPrice: 280, quantity: 15, minQuantity: 5, unit: 'pcs', taxRate: 13 },
    { name: 'Cheesecake Slice', sku: 'DS-CHS-001', barcode: '8801002000002', categoryId: categories[1].id, price: 250, costPrice: 120, quantity: 20, minQuantity: 8, unit: 'pcs', taxRate: 13 },
    { name: 'Waffle Cone (Pack of 10)', sku: 'DS-WFL-010', barcode: '8801002000003', categoryId: categories[1].id, price: 180, costPrice: 80, quantity: 100, minQuantity: 20, unit: 'packs', taxRate: 13 },
    { name: 'Mango Milkshake', sku: 'BV-MNG-001', barcode: '8801003000001', categoryId: categories[2].id, price: 200, costPrice: 80, quantity: 0, minQuantity: 10, unit: 'cups', taxRate: 13 },
    { name: 'Oreo Shake', sku: 'BV-ORE-001', barcode: '8801003000002', categoryId: categories[2].id, price: 250, costPrice: 100, quantity: 40, minQuantity: 10, unit: 'cups', taxRate: 13 },
    { name: 'Chocolate Sauce (500g)', sku: 'TP-CHO-500', barcode: '8801004000001', categoryId: categories[3].id, price: 280, costPrice: 150, quantity: 30, minQuantity: 10, unit: 'bottles', taxRate: 13 },
    { name: 'Rainbow Sprinkles (200g)', sku: 'TP-SPR-200', barcode: '8801004000002', categoryId: categories[3].id, price: 120, costPrice: 50, quantity: 60, minQuantity: 15, unit: 'packs', taxRate: 13 },
  ];

  await seedProducts(products);
}

// ─── RKT Tradings: Wholesale & Retail ────────────────────────────────────────
async function seedRKT() {
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics', description: 'Electronic devices and accessories' } }),
    prisma.category.upsert({ where: { name: 'Groceries' }, update: {}, create: { name: 'Groceries', description: 'Daily essentials and food items' } }),
    prisma.category.upsert({ where: { name: 'Hardware' }, update: {}, create: { name: 'Hardware', description: 'Tools, fittings, and construction materials' } }),
    prisma.category.upsert({ where: { name: 'Stationery' }, update: {}, create: { name: 'Stationery', description: 'Office and school supplies' } }),
    prisma.category.upsert({ where: { name: 'FMCG' }, update: {}, create: { name: 'FMCG', description: 'Fast-moving consumer goods' } }),
  ]);

  const products = [
    { name: 'Samsung Galaxy A15', sku: 'ELEC-SAM-A15', barcode: '8802001000001', categoryId: categories[0].id, price: 18999, costPrice: 15500, quantity: 12, minQuantity: 3, unit: 'pcs', taxRate: 13 },
    { name: 'Bluetooth Speaker JBL', sku: 'ELEC-JBL-001', barcode: '8802001000002', categoryId: categories[0].id, price: 4500, costPrice: 3200, quantity: 20, minQuantity: 5, unit: 'pcs', taxRate: 13 },
    { name: 'USB Cable Type-C (1m)', sku: 'ELEC-USB-C1M', barcode: '8802001000003', categoryId: categories[0].id, price: 350, costPrice: 150, quantity: 200, minQuantity: 50, unit: 'pcs', taxRate: 13 },
    { name: 'Basmati Rice (25kg)', sku: 'GRC-RIC-25K', barcode: '8802002000001', categoryId: categories[1].id, price: 2800, costPrice: 2200, quantity: 50, minQuantity: 10, unit: 'bags', taxRate: 0 },
    { name: 'Cooking Oil (5L)', sku: 'GRC-OIL-5L', barcode: '8802002000002', categoryId: categories[1].id, price: 1200, costPrice: 950, quantity: 80, minQuantity: 20, unit: 'bottles', taxRate: 0 },
    { name: 'Sugar (1kg)', sku: 'GRC-SUG-1K', barcode: '8802002000003', categoryId: categories[1].id, price: 95, costPrice: 72, quantity: 300, minQuantity: 50, unit: 'packs', taxRate: 0 },
    { name: 'Hammer (Steel)', sku: 'HW-HAM-001', barcode: '8802003000001', categoryId: categories[2].id, price: 450, costPrice: 280, quantity: 30, minQuantity: 10, unit: 'pcs', taxRate: 13 },
    { name: 'PVC Pipe 1 inch (10ft)', sku: 'HW-PVC-1IN', barcode: '8802003000002', categoryId: categories[2].id, price: 180, costPrice: 110, quantity: 100, minQuantity: 20, unit: 'pcs', taxRate: 13 },
    { name: 'Cement (50kg bag)', sku: 'HW-CEM-50K', barcode: '8802003000003', categoryId: categories[2].id, price: 850, costPrice: 720, quantity: 0, minQuantity: 10, unit: 'bags', taxRate: 13 },
    { name: 'A4 Paper Ream (500 sheets)', sku: 'STN-A4-500', barcode: '8802004000001', categoryId: categories[3].id, price: 550, costPrice: 400, quantity: 60, minQuantity: 15, unit: 'reams', taxRate: 13 },
    { name: 'Ballpoint Pen (Box of 50)', sku: 'STN-PEN-050', barcode: '8802004000002', categoryId: categories[3].id, price: 350, costPrice: 200, quantity: 40, minQuantity: 10, unit: 'boxes', taxRate: 13 },
    { name: 'Surf Excel (1kg)', sku: 'FMCG-SRF-1K', barcode: '8802005000001', categoryId: categories[4].id, price: 220, costPrice: 170, quantity: 150, minQuantity: 30, unit: 'packs', taxRate: 13 },
    { name: 'Colgate Toothpaste (200g)', sku: 'FMCG-CLG-200', barcode: '8802005000002', categoryId: categories[4].id, price: 150, costPrice: 110, quantity: 100, minQuantity: 25, unit: 'pcs', taxRate: 13 },
  ];

  await seedProducts(products);
}

// ─── Generic fallback ────────────────────────────────────────────────────────
async function seedGeneric() {
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics', description: 'Electronic devices' } }),
    prisma.category.upsert({ where: { name: 'General' }, update: {}, create: { name: 'General', description: 'General items' } }),
  ]);

  const products = [
    { name: 'Sample Product A', sku: 'GEN-001', barcode: '9900000000001', categoryId: categories[0].id, price: 100, costPrice: 60, quantity: 50, minQuantity: 10, unit: 'pcs', taxRate: 13 },
    { name: 'Sample Product B', sku: 'GEN-002', barcode: '9900000000002', categoryId: categories[1].id, price: 200, costPrice: 120, quantity: 30, minQuantity: 5, unit: 'pcs', taxRate: 13 },
  ];

  await seedProducts(products);
}

// ─── Helper ──────────────────────────────────────────────────────────────────
async function seedProducts(products: any[]) {
  for (const product of products) {
    const status =
      product.quantity === 0
        ? 'OUT_OF_STOCK'
        : product.quantity <= product.minQuantity
        ? 'LOW_STOCK'
        : 'IN_STOCK';

    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: { ...product, status: status as any },
    });
  }
  console.log(`   📦 ${products.length} products seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
