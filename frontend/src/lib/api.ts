import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token + tenant ID to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const tenantId = useTenantStore.getState().tenantId;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['x-tenant-id'] = tenantId;
  return config;
});

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenantApi = {
  getAll: async () => {
    const res = await api.get('/tenants');
    return res.data;
  },
  getConfig: async () => {
    const res = await api.get('/tenant/config');
    return res.data;
  },
};

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productApi = {
  getAll: async (params?: any) => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },
  getByBarcode: async (barcode: string) => {
    const res = await api.get(`/products/barcode/${barcode}`);
    return res.data;
  },
  getLowStock: async () => {
    const res = await api.get('/products/low-stock');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/products', data);
    return res.data;
  },
  update: async ({ id, ...data }: any) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },
  getMovements: async (id: string, params?: any) => {
    const res = await api.get(`/products/${id}/movements`, { params });
    return res.data;
  },
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll: async () => {
    const res = await api.get('/categories');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/categories', data);
    return res.data;
  },
  update: async ({ id, ...data }: any) => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};

// ─── Sales ───────────────────────────────────────────────────────────────────
export const saleApi = {
  getAll: async (params?: any) => {
    const res = await api.get('/sales', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/sales/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/sales', data);
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await api.put(`/sales/${id}/cancel`);
    return res.data;
  },
  downloadInvoice: (id: string) => {
    const token = useAuthStore.getState().token;
    const tenantId = useTenantStore.getState().tenantId;
    const url = `${API_URL}/sales/${id}/invoice`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId || '',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to download invoice');
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `invoice-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        alert('Failed to download invoice. Please try again.');
      });
  },
};

// ─── SubCategories ───────────────────────────────────────────────────────────
export const subCategoryApi = {
  getAll: async (params?: { categoryId?: string }) => {
    const res = await api.get('/subcategories', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/subcategories/${id}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string; categoryId: string }) => {
    const res = await api.post('/subcategories', data);
    return res.data;
  },
  update: async ({ id, ...data }: any) => {
    const res = await api.put(`/subcategories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/subcategories/${id}`);
    return res.data;
  },
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentApi = {
  getBySale: async (saleId: string) => {
    const res = await api.get(`/payments/sale/${saleId}`);
    return res.data;
  },
  update: async (saleId: string, data: any) => {
    const res = await api.put(`/payments/sale/${saleId}`, data);
    return res.data;
  },
  getSummary: async () => {
    const res = await api.get('/payments/summary');
    return res.data;
  },
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportApi = {
  getSales: async (period?: string) => {
    const res = await api.get('/reports/sales', { params: { period } });
    return res.data;
  },
  getInventory: async () => {
    const res = await api.get('/reports/inventory');
    return res.data;
  },
  getAuditLogs: async (params?: any) => {
    const res = await api.get('/reports/audit-logs', { params });
    return res.data;
  },
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: async () => {
    const res = await api.get('/dashboard');
    return res.data;
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: async () => {
    const res = await api.get('/users');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/users', data);
    return res.data;
  },
  update: async ({ id, ...data }: any) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

// ─── Refrigerators (Scoopmandu) ──────────────────────────────────────────────
export const refrigeratorApi = {
  // Refrigerators
  getAll: async (params?: any) => {
    const res = await api.get('/refrigerators', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/refrigerators/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/refrigerators', data);
    return res.data;
  },
  update: async ({ id, ...data }: any) => {
    const res = await api.put(`/refrigerators/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/refrigerators/${id}`);
    return res.data;
  },

  // Shops
  getShops: async (params?: any) => {
    const res = await api.get('/refrigerators/shops/list', { params });
    return res.data;
  },
  createShop: async (data: any) => {
    const res = await api.post('/refrigerators/shops', data);
    return res.data;
  },
  updateShop: async ({ id, ...data }: any) => {
    const res = await api.put(`/refrigerators/shops/${id}`, data);
    return res.data;
  },
  deleteShop: async (id: string) => {
    const res = await api.delete(`/refrigerators/shops/${id}`);
    return res.data;
  },

  // Assignments
  getAssignments: async (params?: any) => {
    const res = await api.get('/refrigerators/assignments/list', { params });
    return res.data;
  },
  assign: async (data: any) => {
    const res = await api.post('/refrigerators/assignments/assign', data);
    return res.data;
  },
  transfer: async (data: any) => {
    const res = await api.post('/refrigerators/assignments/transfer', data);
    return res.data;
  },
  return: async (data: any) => {
    const res = await api.post('/refrigerators/assignments/return', data);
    return res.data;
  },

  // Dashboard
  getDashboard: async () => {
    const res = await api.get('/refrigerators/dashboard');
    return res.data;
  },

  // Logs
  getLogs: async (params?: any) => {
    const res = await api.get('/refrigerators/logs', { params });
    return res.data;
  },
};
