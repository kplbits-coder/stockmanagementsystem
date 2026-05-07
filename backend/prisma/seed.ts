import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stockms.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@stockms.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@stockms.com' },
    update: {},
    create: {
      name: 'Cashier User',
      email: 'cashier@stockms.com',
      password: await bcrypt.hash('cashier123', 10),
      role: Role.CASHIER,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@stockms.com' },
    update: {},
    create: {
      name: 'Inventory Manager',
      email: 'manager@stockms.com',
      password: await bcrypt.hash('manager123', 10),
      role: Role.INVENTORY_MANAGER,
    },
  });

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics', description: 'Electronic devices and accessories' },
    }),
    prisma.category.upsert({
      where: { name: 'Clothing' },
      update: {},
      create: { name: 'Clothing', description: 'Apparel and fashion items' },
    }),
    prisma.category.upsert({
      where: { name: 'Food & Beverages' },
      update: {},
      create: { name: 'Food & Beverages', description: 'Food and drink products' },
    }),
    prisma.category.upsert({
      where: { name: 'Stationery' },
      update: {},
      create: { name: 'Stationery', description: 'Office and school supplies' },
    }),
  ]);

  // Create sample products
  const products = [
    {
      name: 'Laptop Pro 15"',
      sku: 'ELEC-001',
      barcode: '1234567890001',
      categoryId: categories[0].id,
      price: 999.99,
      costPrice: 750.00,
      quantity: 25,
      minQuantity: 5,
      unit: 'pcs',
      taxRate: 18,
    },
    {
      name: 'Wireless Mouse',
      sku: 'ELEC-002',
      barcode: '1234567890002',
      categoryId: categories[0].id,
      price: 29.99,
      costPrice: 15.00,
      quantity: 8,
      minQuantity: 10,
      unit: 'pcs',
      taxRate: 18,
    },
    {
      name: 'USB-C Hub',
      sku: 'ELEC-003',
      barcode: '1234567890003',
      categoryId: categories[0].id,
      price: 49.99,
      costPrice: 25.00,
      quantity: 0,
      minQuantity: 5,
      unit: 'pcs',
      taxRate: 18,
    },
    {
      name: 'Cotton T-Shirt',
      sku: 'CLTH-001',
      barcode: '1234567890004',
      categoryId: categories[1].id,
      price: 19.99,
      costPrice: 8.00,
      quantity: 100,
      minQuantity: 20,
      unit: 'pcs',
      taxRate: 5,
    },
    {
      name: 'Mineral Water 1L',
      sku: 'FOOD-001',
      barcode: '1234567890005',
      categoryId: categories[2].id,
      price: 1.50,
      costPrice: 0.50,
      quantity: 500,
      minQuantity: 50,
      unit: 'bottles',
      taxRate: 0,
    },
    {
      name: 'A4 Notebook',
      sku: 'STAT-001',
      barcode: '1234567890006',
      categoryId: categories[3].id,
      price: 4.99,
      costPrice: 2.00,
      quantity: 200,
      minQuantity: 30,
      unit: 'pcs',
      taxRate: 5,
    },
  ];

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
      create: {
        ...product,
        price: product.price,
        costPrice: product.costPrice,
        taxRate: product.taxRate,
        status: status as any,
      },
    });
  }

  console.log('✅ Seed completed!');
  console.log('👤 Admin: admin@stockms.com / admin123');
  console.log('👤 Cashier: cashier@stockms.com / cashier123');
  console.log('👤 Manager: manager@stockms.com / manager123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
