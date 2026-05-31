import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import subcategoryRoutes from './routes/subcategory.routes';
import saleRoutes from './routes/sale.routes';
import paymentRoutes from './routes/payment.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import refrigeratorRoutes from './routes/refrigerator.routes';
import costAnalysisRoutes from './routes/cost-analysis.routes';
import { errorHandler } from './middleware/error.middleware';
import { resolveTenant, TenantRequest } from './middleware/tenant.middleware';
import { disconnectAll } from './utils/prisma';
import { getAllTenantIds, TENANTS } from './config/tenants';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check (no tenant needed)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tenant list (public — no tenant resolution needed)
app.get('/api/tenants', (_req, res) => {
  const tenants = getAllTenantIds().map((id) => ({
    id: TENANTS[id].id,
    displayName: TENANTS[id].displayName,
    branding: TENANTS[id].branding,
    features: TENANTS[id].features,
  }));
  res.json({ success: true, data: tenants });
});

// ─── Tenant resolution (all routes below require a valid tenant) ─────────────
app.use('/api', (req, res, next) => {
  // Skip tenant resolution for the public /api/tenants endpoint
  if (req.path === '/tenants') return next();
  resolveTenant(req, res, next);
});

// Tenant config endpoint (returns current tenant info)
app.get('/api/tenant/config', (req, res) => {
  const { tenantId, tenantConfig } = req as TenantRequest;
  res.json({
    success: true,
    data: {
      id: tenantId,
      displayName: tenantConfig.displayName,
      branding: tenantConfig.branding,
      features: tenantConfig.features,
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/refrigerators', refrigeratorRoutes);
app.use('/api/cost-analysis', costAnalysisRoutes);

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Disconnecting database clients...');
  await disconnectAll();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📋 Configured tenants: ${getAllTenantIds().join(', ')}`);
});

export default app;
