export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
export type StockChangeType = 'INVOICE_SALE' | 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'INVOICE_CANCEL';

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  gstin: string;
  logoUrl?: string;
  invoicePrefix: string;
  defaultPaymentTerms: string;
  bankDetails: BankDetails;
  upiId: string;
  currency: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT';
  businessId: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  customerId: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  gstin?: string;
  billingAddress: string;
  city: string;
  state: string;
  pinCode: string;
  createdAt: string;
  totalInvoiced?: number;
  totalPaid?: number;
  balanceDue?: number;
}

export interface Product {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  sku: string;
  hsnCode: string;
  category: string;
  description: string;
  sellingPrice: number;
  purchasePrice: number;
  gstPercentage: number;
  availableStock: number;
  minStockAlert: number;
  unit: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercentage: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerBusinessName?: string;
  customerGstin?: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPinCode: string;
  customerPhone: string;
  customerEmail: string;
  
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  
  isInterState: boolean;
  businessState: string;
  
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  
  notes?: string;
  termsAndConditions?: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  sku: string;
  changeType: StockChangeType;
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceId?: string; // invoice number or reason
  notes?: string;
  date: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoicesCount: number;
  pendingPaymentAmount: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  overdueInvoicesCount: number;
  revenueChart: { month: string; revenue: number; collected: number }[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  topProducts: { name: string; sku: string; soldCount: number; revenue: number }[];
  pendingAlerts: { id: string; invoiceNumber: string; customerName: string; amount: number; dueDate: string; daysOverdue: number }[];
}

export interface SalesReport {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  totalSales: number;
  totalTaxable: number;
  totalTax: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  invoiceCount: number;
  salesData: { label: string; invoices: number; sales: number; tax: number }[];
  customerSales: { customerId: string; customerName: string; count: number; total: number; balance: number }[];
  productSales: { productId: string; name: string; sku: string; unitsSold: number; revenue: number; cost: number; profit: number }[];
}

export const INDIAN_STATES: { name: string; code: string }[] = [
  { name: 'Karnataka', code: '29' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Delhi', code: '07' },
  { name: 'Gujarat', code: '24' },
  { name: 'Kerala', code: '32' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Rajasthan', code: '08' },
  { name: 'West Bengal', code: '19' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Haryana', code: '06' },
  { name: 'Punjab', code: '03' },
  { name: 'Goa', code: '30' }
];

export function getStateCode(stateName: string): string {
  const match = INDIAN_STATES.find(
    s => s.name.toLowerCase() === (stateName || '').trim().toLowerCase()
  );
  return match ? match.code : '99';
}

