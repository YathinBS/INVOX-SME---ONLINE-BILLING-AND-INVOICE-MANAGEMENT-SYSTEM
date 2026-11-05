import {
  User,
  Business,
  Customer,
  Product,
  Invoice,
  Payment,
  InventoryTransaction,
  DashboardStats,
  SalesReport
} from '../types/index.ts';
import { isSupabaseConfigured, getSupabaseClient } from './supabaseClient.ts';
import { supabaseService } from './supabaseService.ts';

const TOKEN_KEY = 'invox_auth_token';
const BIZ_ID_KEY = 'invox_biz_id';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public getActiveBusinessId(): string {
    return localStorage.getItem(BIZ_ID_KEY) || 'biz_yathin_01';
  }

  public setActiveBusinessId(id: string) {
    localStorage.setItem(BIZ_ID_KEY, id);
  }

  public isUsingSupabase(): boolean {
    return isSupabaseConfigured();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // ============================================================================
  // AUTH
  // ============================================================================
  auth = {
    login: async (credentials: { email: string; password: string }) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.auth.signIn(credentials.email, credentials.password);
          this.setToken(res.token);
          this.setActiveBusinessId(res.business.id);
          return { success: true, ...res };
        } catch (supabaseErr: any) {
          console.warn('Supabase auth failed, falling back to local verification:', supabaseErr.message);
          // If user does not exist in Supabase auth yet, fall through to local
        }
      }

      const res = await this.request<{ success: boolean; token: string; user: User; business: Business }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify(credentials) }
      );
      this.setActiveBusinessId(res.business.id);
      return res;
    },

    demoLogin: async () => {
      const res = await this.request<{ success: boolean; token: string; user: User; business: Business }>(
        '/api/auth/demo-login',
        { method: 'POST' }
      );
      this.setActiveBusinessId(res.business.id);
      return res;
    },

    register: async (payload: {
      name: string;
      email: string;
      password: string;
      businessName: string;
      state?: string;
      city?: string;
      phone?: string;
      gstin?: string;
    }) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.auth.signUp(payload);
          this.setToken(res.token);
          this.setActiveBusinessId(res.business.id);
          return { success: true, ...res };
        } catch (supErr: any) {
          console.warn('Supabase sign up error, trying local registration:', supErr.message);
        }
      }

      const res = await this.request<{ success: boolean; token: string; user: User; business: Business }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      this.setActiveBusinessId(res.business.id);
      return res;
    },

    forgotPassword: async (email: string) => {
      if (this.isUsingSupabase()) {
        try {
          await supabaseService.auth.resetPassword(email);
          return {
            success: true,
            message: 'Password reset link sent to your email by Supabase Auth.',
            email
          };
        } catch (supErr) {
          // Fall back to server OTP
        }
      }

      return this.request<{ success: boolean; message: string; otp?: string; email?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
    },

    resetPassword: (payload: { email: string; otp: string; newPassword: string }) =>
      this.request<{ success: boolean; message: string }>(
        '/api/auth/reset-password',
        { method: 'POST', body: JSON.stringify(payload) }
      ),

    getMe: async () => {
      if (this.isUsingSupabase()) {
        try {
          const info = await supabaseService.auth.getCurrentUserAndBusiness();
          if (info) {
            this.setActiveBusinessId(info.business.id);
            return { success: true, user: info.user, business: info.business };
          }
        } catch {
          // fallback to local
        }
      }

      const res = await this.request<{ success: boolean; user: User; business: Business }>('/api/auth/me');
      if (res?.business?.id) {
        this.setActiveBusinessId(res.business.id);
      }
      return res;
    },

    logout: async () => {
      if (this.isUsingSupabase()) {
        try {
          await supabaseService.auth.signOut();
        } catch {
          // ignore
        }
      }
      this.setToken(null);
    }
  };

  // ============================================================================
  // CUSTOMERS
  // ============================================================================
  customers = {
    getAll: async (params?: { search?: string }) => {
      if (this.isUsingSupabase()) {
        try {
          const customers = await supabaseService.customers.getAll(this.getActiveBusinessId(), params?.search);
          if (customers.length > 0 || params?.search) {
            return { success: true, customers };
          }
        } catch (err: any) {
          console.warn('Supabase customers query failed, using local:', err.message);
        }
      }

      const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
      return this.request<{ success: boolean; customers: Customer[] }>(`/api/customers${q}`);
    },

    getById: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.customers.getById(id);
          return { success: true, ...res };
        } catch (err: any) {
          console.warn('Supabase customer getById failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; customer: Customer; invoices: Invoice[] }>(`/api/customers/${id}`);
    },

    create: async (data: Partial<Customer>) => {
      if (this.isUsingSupabase()) {
        try {
          const customer = await supabaseService.customers.create(this.getActiveBusinessId(), data);
          return { success: true, message: 'Customer created in Supabase PostgreSQL', customer };
        } catch (err: any) {
          console.warn('Supabase customer creation failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; customer: Customer }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (id: string, data: Partial<Customer>) => {
      if (this.isUsingSupabase()) {
        try {
          const customer = await supabaseService.customers.update(id, data);
          return { success: true, message: 'Customer updated in Supabase', customer };
        } catch (err: any) {
          console.warn('Supabase customer update failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; customer: Customer }>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          await supabaseService.customers.delete(id);
          return { success: true, message: 'Customer deleted from Supabase' };
        } catch (err: any) {
          console.warn('Supabase customer delete failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string }>(`/api/customers/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  products = {
    getAll: async (params?: { search?: string; category?: string; lowStock?: boolean }) => {
      if (this.isUsingSupabase()) {
        try {
          const products = await supabaseService.products.getAll(this.getActiveBusinessId(), params);
          if (products.length > 0 || params?.search || params?.category || params?.lowStock) {
            return { success: true, products };
          }
        } catch (err: any) {
          console.warn('Supabase products query failed, using local:', err.message);
        }
      }

      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.category) query.append('category', params.category);
      if (params?.lowStock) query.append('lowStock', 'true');
      const q = query.toString() ? `?${query.toString()}` : '';
      return this.request<{ success: boolean; products: Product[] }>(`/api/products${q}`);
    },

    getById: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.products.getById(id);
          return { success: true, ...res };
        } catch (err: any) {
          console.warn('Supabase product getById failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; product: Product; movements: InventoryTransaction[] }>(`/api/products/${id}`);
    },

    create: async (data: Partial<Product>) => {
      if (this.isUsingSupabase()) {
        try {
          const product = await supabaseService.products.create(this.getActiveBusinessId(), data);
          return { success: true, message: 'Product created in Supabase PostgreSQL', product };
        } catch (err: any) {
          console.warn('Supabase product create failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; product: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (id: string, data: Partial<Product> & { adjustmentReason?: string }) => {
      if (this.isUsingSupabase()) {
        try {
          const product = await supabaseService.products.update(id, data);
          return { success: true, message: 'Product updated in Supabase', product };
        } catch (err: any) {
          console.warn('Supabase product update failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; product: Product }>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          await supabaseService.products.delete(id);
          return { success: true, message: 'Product deleted from Supabase' };
        } catch (err: any) {
          console.warn('Supabase product delete failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string }>(`/api/products/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ============================================================================
  // INVENTORY
  // ============================================================================
  inventory = {
    getStatus: async () => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.inventory.getStatus(this.getActiveBusinessId());
          if (res.products && res.products.length > 0) {
            return { success: true, ...res };
          }
        } catch (err: any) {
          console.warn('Supabase inventory status query failed, using local:', err.message);
        }
      }

      return this.request<{
        success: boolean;
        summary: {
          totalProducts: number;
          totalUnits: number;
          lowStockCount: number;
          inventoryAssetValue: number;
        };
        products: Product[];
        lowStock: Product[];
      }>('/api/inventory/status');
    },

    getTransactions: async (params?: { productId?: string; limit?: number }) => {
      if (this.isUsingSupabase()) {
        try {
          const transactions = await supabaseService.inventory.getTransactions(this.getActiveBusinessId(), params);
          return { success: true, transactions };
        } catch (err: any) {
          console.warn('Supabase inventory transactions query failed, using local:', err.message);
        }
      }

      const query = new URLSearchParams();
      if (params?.productId) query.append('productId', params.productId);
      if (params?.limit) query.append('limit', String(params.limit));
      const q = query.toString() ? `?${query.toString()}` : '';
      return this.request<{ success: boolean; transactions: InventoryTransaction[] }>(
        `/api/inventory/transactions${q}`
      );
    },

    adjust: async (data: {
      productId: string;
      changeType: 'RESTOCK' | 'MANUAL_ADJUSTMENT';
      quantity: number;
      referenceId?: string;
      notes?: string;
    }) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.inventory.adjust(this.getActiveBusinessId(), data);
          return {
            success: true,
            message: 'Stock adjusted and logged in Supabase',
            product: res.product,
            transaction: res.transaction
          };
        } catch (err: any) {
          console.warn('Supabase inventory adjustment failed, using local:', err.message);
        }
      }

      return this.request<{
        success: boolean;
        message: string;
        product: Product;
        transaction: InventoryTransaction;
      }>('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // ============================================================================
  // INVOICES
  // ============================================================================
  invoices = {
    getAll: async (params?: { status?: string; search?: string; customerId?: string }) => {
      if (this.isUsingSupabase()) {
        try {
          const invoices = await supabaseService.invoices.getAll(this.getActiveBusinessId(), params);
          if (invoices.length > 0 || params?.status || params?.search || params?.customerId) {
            return { success: true, invoices };
          }
        } catch (err: any) {
          console.warn('Supabase invoices query failed, using local:', err.message);
        }
      }

      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.search) query.append('search', params.search);
      if (params?.customerId) query.append('customerId', params.customerId);
      const q = query.toString() ? `?${query.toString()}` : '';
      return this.request<{ success: boolean; invoices: Invoice[] }>(`/api/invoices${q}`);
    },

    getById: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.invoices.getById(id);
          return { success: true, ...res };
        } catch (err: any) {
          console.warn('Supabase invoice getById failed, using local:', err.message);
        }
      }

      return this.request<{
        success: boolean;
        invoice: Invoice;
        business: Business;
        payments: Payment[];
      }>(`/api/invoices/${id}`);
    },

    getNextNumber: async () => {
      if (this.isUsingSupabase()) {
        try {
          const nextNumber = await supabaseService.invoices.getNextNumber(this.getActiveBusinessId());
          return { success: true, nextNumber };
        } catch (err: any) {
          console.warn('Supabase invoice getNextNumber failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; nextNumber: string }>('/api/invoices/next-number');
    },

    create: async (data: {
      invoiceNumber?: string;
      customerId: string;
      invoiceDate: string;
      dueDate?: string;
      items: any[];
      notes?: string;
      termsAndConditions?: string;
    }) => {
      if (this.isUsingSupabase()) {
        try {
          const invoice = await supabaseService.invoices.create(this.getActiveBusinessId(), data);
          return { success: true, message: 'Invoice generated and saved in Supabase PostgreSQL', invoice };
        } catch (err: any) {
          console.warn('Supabase invoice creation failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; invoice: Invoice }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (id: string, data: Partial<Invoice>) => {
      if (this.isUsingSupabase()) {
        try {
          const invoice = await supabaseService.invoices.update(id, data);
          return { success: true, message: 'Invoice updated in Supabase', invoice };
        } catch (err: any) {
          console.warn('Supabase invoice update failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; invoice: Invoice }>(`/api/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    delete: async (id: string) => {
      if (this.isUsingSupabase()) {
        try {
          await supabaseService.invoices.delete(id);
          return { success: true, message: 'Invoice deleted from Supabase' };
        } catch (err: any) {
          console.warn('Supabase invoice delete failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string }>(`/api/invoices/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  payments = {
    getAll: async (params?: { method?: string; search?: string; invoiceId?: string }) => {
      if (this.isUsingSupabase()) {
        try {
          const payments = await supabaseService.payments.getAll(this.getActiveBusinessId(), params);
          if (payments.length > 0 || params?.method || params?.search || params?.invoiceId) {
            return { success: true, payments };
          }
        } catch (err: any) {
          console.warn('Supabase payments query failed, using local:', err.message);
        }
      }

      const query = new URLSearchParams();
      if (params?.method) query.append('method', params.method);
      if (params?.search) query.append('search', params.search);
      if (params?.invoiceId) query.append('invoiceId', params.invoiceId);
      const q = query.toString() ? `?${query.toString()}` : '';
      return this.request<{ success: boolean; payments: Payment[] }>(`/api/payments${q}`);
    },

    record: async (data: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      paymentDate?: string;
      notes?: string;
    }) => {
      if (this.isUsingSupabase()) {
        try {
          const res = await supabaseService.payments.record(this.getActiveBusinessId(), data);
          return {
            success: true,
            message: 'Payment recorded and invoice balance updated in Supabase',
            payment: res.payment,
            invoice: res.invoice
          };
        } catch (err: any) {
          console.warn('Supabase payment recording failed, using local:', err.message);
        }
      }

      return this.request<{
        success: boolean;
        message: string;
        payment: Payment;
        invoice: Invoice;
      }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // ============================================================================
  // REPORTS
  // ============================================================================
  reports = {
    getDashboard: async () => {
      if (this.isUsingSupabase()) {
        try {
          const stats = await supabaseService.reports.getDashboard(this.getActiveBusinessId());
          return { success: true, stats };
        } catch (err: any) {
          console.warn('Supabase dashboard stats query failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; stats: DashboardStats }>('/api/reports/dashboard');
    },

    getSales: async (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      if (this.isUsingSupabase()) {
        try {
          const report = await supabaseService.reports.getSales(this.getActiveBusinessId(), period);
          return { success: true, report };
        } catch (err: any) {
          console.warn('Supabase sales report query failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; report: SalesReport }>(`/api/reports/sales?period=${period}`);
    }
  };

  // ============================================================================
  // BUSINESS SETTINGS & SYNC
  // ============================================================================
  business = {
    get: async () => {
      if (this.isUsingSupabase()) {
        try {
          const business = await supabaseService.business.get(this.getActiveBusinessId());
          return { success: true, business };
        } catch (err: any) {
          console.warn('Supabase business get failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; business: Business }>('/api/business');
    },

    update: async (data: Partial<Business>) => {
      if (this.isUsingSupabase()) {
        try {
          const business = await supabaseService.business.update(this.getActiveBusinessId(), data);
          return { success: true, message: 'Business settings updated in Supabase', business };
        } catch (err: any) {
          console.warn('Supabase business update failed, using local:', err.message);
        }
      }

      return this.request<{ success: boolean; message: string; business: Business }>('/api/business', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    resetDemo: () =>
      this.request<{ success: boolean; message: string; business: Business }>(
        '/api/business/reset-demo',
        { method: 'POST' }
      ),

    // Migrate all local JSON records into Supabase PostgreSQL
    syncAllToSupabase: async () => {
      const c = getSupabaseClient();
      if (!c) throw new Error('Supabase client is not connected.');

      // 1. Fetch all local entities
      const [bizRes, custRes, prodRes, invRes, pymtRes] = await Promise.all([
        fetch('/api/business', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } }).then(r => r.json()),
        fetch('/api/customers', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } }).then(r => r.json()),
        fetch('/api/products', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } }).then(r => r.json()),
        fetch('/api/invoices', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } }).then(r => r.json()),
        fetch('/api/payments', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } }).then(r => r.json())
      ]);

      const biz = bizRes.business;
      const bizId = 'a0000000-0000-0000-0000-000000000001';

      // Insert or update business
      if (biz) {
        await c.from('businesses').upsert({
          id: bizId,
          name: biz.name,
          email: biz.email,
          phone: biz.phone,
          address: biz.address,
          city: biz.city,
          state: biz.state,
          state_code: biz.stateCode,
          pin_code: biz.pinCode,
          gstin: biz.gstin,
          invoice_prefix: biz.invoicePrefix,
          default_payment_terms: biz.defaultPaymentTerms,
          bank_details: biz.bankDetails,
          upi_id: biz.upiId,
          currency: biz.currency || 'INR'
        });
      }

      // Sync customers
      let customersCount = 0;
      const customerIdMap: Record<string, string> = {};

      if (custRes.customers && Array.isArray(custRes.customers)) {
        for (const cust of custRes.customers) {
          const { data: inserted, error: custErr } = await c.from('customers').upsert({
            business_id: bizId,
            customer_id: cust.customerId,
            name: cust.name,
            business_name: cust.businessName,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            billing_address: cust.billingAddress,
            city: cust.city,
            state: cust.state,
            pin_code: cust.pinCode
          }, { onConflict: 'customer_id' }).select().single();

          if (custErr) {
            console.warn('Customer sync note:', custErr.message);
          } else if (inserted) {
            customerIdMap[cust.id] = inserted.id;
            customersCount++;
          }
        }
      }

      // Sync products
      let productsCount = 0;
      const productIdMap: Record<string, string> = {};

      if (prodRes.products && Array.isArray(prodRes.products)) {
        for (const prod of prodRes.products) {
          const { data: inserted, error: prodErr } = await c.from('products').upsert({
            business_id: bizId,
            product_id: prod.productId,
            name: prod.name,
            sku: prod.sku,
            category: prod.category,
            description: prod.description,
            selling_price: prod.sellingPrice || 0,
            purchase_price: prod.purchasePrice || 0,
            gst_rate: prod.gstPercentage || 18,
            stock_quantity: prod.availableStock || 0,
            unit: prod.unit || 'Pieces',
            min_stock_alert: prod.minStockAlert || 10
          }, { onConflict: 'sku' }).select().single();

          if (prodErr) {
            console.warn('Product sync note:', prodErr.message);
          } else if (inserted) {
            productIdMap[prod.id] = inserted.id;
            productsCount++;
          }
        }
      }

      return {
        success: true,
        message: `Successfully synchronized ${customersCount} customers and ${productsCount} products to Supabase PostgreSQL!`
      };
    }
  };
}

export const api = new ApiService();
