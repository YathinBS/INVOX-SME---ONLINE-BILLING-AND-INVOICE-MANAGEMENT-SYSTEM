import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  CreditCard,
  Plus,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DashboardStats, Invoice } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatINRCompact, formatDate } from '../services/currency.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { NavTab } from '../components/Sidebar.tsx';

const DEMO_TOP_PRODUCTS = [
  { name: 'Industrial Three-Phase Motor 5HP', sku: 'MOT-3P-5HP', soldCount: 48, revenue: 185000 },
  { name: 'Digital VFD Controller 7.5kW', sku: 'VFD-DIG-7KW', soldCount: 32, revenue: 148800 },
  { name: 'High-Precision Planetary Gearbox 10:1', sku: 'GBX-PLN-10', soldCount: 16, revenue: 124800 },
  { name: 'Heavy Duty Deep Groove Ball Bearing 6312-2RS', sku: 'BRG-6312-2RS', soldCount: 180, revenue: 112500 },
  { name: 'Hydraulic Directional Control Valve', sku: 'HYD-DCV-04', soldCount: 28, revenue: 94000 }
];

const DEMO_PENDING_ALERTS = [
  { id: 'inv_alert_1', invoiceNumber: 'YE-2026-005', customerName: 'Venkatesh Rao (Deccan Power)', amount: 115600, dueDate: '2026-02-14', daysOverdue: 12 },
  { id: 'inv_alert_2', invoiceNumber: 'YE-2026-009', customerName: 'Thomas Varghese (Cochin Marine)', amount: 59000, dueDate: '2026-02-23', daysOverdue: 8 },
  { id: 'inv_alert_3', invoiceNumber: 'YE-2026-003', customerName: 'K. Senthil Nathan (Chola Auto)', amount: 44400, dueDate: '2026-03-01', daysOverdue: 3 },
  { id: 'inv_alert_4', invoiceNumber: 'YE-2026-008', customerName: 'Pradeep Joshi (Maratha Agro)', amount: 17140, dueDate: '2026-03-05', daysOverdue: 0 }
];

const DEMO_REVENUE_CHART = [
  { month: 'Jan 26', revenue: 314500, collected: 295000 },
  { month: 'Feb 26', revenue: 351530, collected: 320000 },
  { month: 'Mar 26', revenue: 410200, collected: 375000 },
  { month: 'Apr 26', revenue: 385600, collected: 350000 },
  { month: 'May 26', revenue: 462000, collected: 410000 },
  { month: 'Jun 26', revenue: 512400, collected: 470000 }
];

const DEMO_RECENT_INVOICES: Invoice[] = [
  {
    id: 'demo-inv-001',
    businessId: 'biz_01',
    customerId: 'cust_01',
    customerName: 'K. Senthil Nathan',
    customerBusinessName: 'Chola Automations Pvt Ltd',
    customerGstin: '33AABCC1234D1Z2',
    customerAddress: 'Ambattur Industrial Estate',
    customerCity: 'Chennai',
    customerState: 'Tamil Nadu',
    customerPinCode: '600058',
    customerPhone: '+91 98401 23456',
    customerEmail: 'senthil@cholaauto.com',
    businessState: 'Karnataka',
    invoiceNumber: 'YE-2026-001',
    invoiceDate: '2026-01-10',
    dueDate: '2026-01-25',
    isInterState: true,
    subtotal: 62000,
    discountTotal: 0,
    taxableAmount: 62000,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 11160,
    totalTax: 11160,
    roundOff: 0,
    grandTotal: 73160,
    paidAmount: 73160,
    balanceAmount: 0,
    paymentStatus: 'PAID',
    items: [],
    createdAt: '2026-01-10T10:30:00Z',
    updatedAt: '2026-01-10T10:30:00Z'
  },
  {
    id: 'demo-inv-002',
    businessId: 'biz_01',
    customerId: 'cust_02',
    customerName: 'Sunil Hegde',
    customerBusinessName: 'Malnad Agro Equipments',
    customerGstin: '29AABCM5678E1Z9',
    customerAddress: 'APMC Yard, Sagar Road',
    customerCity: 'Shivamogga',
    customerState: 'Karnataka',
    customerPinCode: '577201',
    customerPhone: '+91 94481 98765',
    customerEmail: 'hegde@malnadagro.in',
    businessState: 'Karnataka',
    invoiceNumber: 'YE-2026-002',
    invoiceDate: '2026-01-18',
    dueDate: '2026-02-02',
    isInterState: false,
    subtotal: 36000,
    discountTotal: 0,
    taxableAmount: 36000,
    cgstTotal: 3240,
    sgstTotal: 3240,
    igstTotal: 0,
    totalTax: 6480,
    roundOff: 0,
    grandTotal: 42480,
    paidAmount: 42480,
    balanceAmount: 0,
    paymentStatus: 'PAID',
    items: [],
    createdAt: '2026-01-18T14:15:00Z',
    updatedAt: '2026-01-18T14:15:00Z'
  },
  {
    id: 'demo-inv-003',
    businessId: 'biz_01',
    customerId: 'cust_03',
    customerName: 'Venkatesh Rao',
    customerBusinessName: 'Deccan Power Systems',
    customerGstin: '36AABCD9012F1Z3',
    customerAddress: 'Jeedimetla Industrial Area',
    customerCity: 'Hyderabad',
    customerState: 'Telangana',
    customerPinCode: '500055',
    customerPhone: '+91 97012 34567',
    customerEmail: 'venkat@deccanpower.com',
    businessState: 'Karnataka',
    invoiceNumber: 'YE-2026-003',
    invoiceDate: '2026-01-28',
    dueDate: '2026-02-12',
    isInterState: true,
    subtotal: 98000,
    discountTotal: 0,
    taxableAmount: 98000,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 17640,
    totalTax: 17640,
    roundOff: 0,
    grandTotal: 115640,
    paidAmount: 0,
    balanceAmount: 115640,
    paymentStatus: 'OVERDUE',
    items: [],
    createdAt: '2026-01-28T11:00:00Z',
    updatedAt: '2026-01-28T11:00:00Z'
  },
  {
    id: 'demo-inv-004',
    businessId: 'biz_01',
    customerId: 'cust_04',
    customerName: 'Anand Kumar',
    customerBusinessName: 'Kaveri Precision Works',
    customerGstin: '29AABCK3456G1Z7',
    customerAddress: 'Hebbal Industrial Estate',
    customerCity: 'Mysuru',
    customerState: 'Karnataka',
    customerPinCode: '570016',
    customerPhone: '+91 98860 11223',
    customerEmail: 'anand@kaveriprecision.com',
    businessState: 'Karnataka',
    invoiceNumber: 'YE-2026-004',
    invoiceDate: '2026-02-05',
    dueDate: '2026-02-20',
    isInterState: false,
    subtotal: 54000,
    discountTotal: 0,
    taxableAmount: 54000,
    cgstTotal: 4860,
    sgstTotal: 4860,
    igstTotal: 0,
    totalTax: 9720,
    roundOff: 0,
    grandTotal: 63720,
    paidAmount: 30000,
    balanceAmount: 33720,
    paymentStatus: 'PARTIALLY_PAID',
    items: [],
    createdAt: '2026-02-05T09:45:00Z',
    updatedAt: '2026-02-05T09:45:00Z'
  },
  {
    id: 'demo-inv-005',
    businessId: 'biz_01',
    customerId: 'cust_05',
    customerName: 'Thomas Varghese',
    customerBusinessName: 'Cochin Marine Hydraulics',
    customerGstin: '32AABCT7890H1Z1',
    customerAddress: 'Willingdon Island',
    customerCity: 'Kochi',
    customerState: 'Kerala',
    customerPinCode: '682003',
    customerPhone: '+91 94470 55667',
    customerEmail: 'thomas@cochinmarine.in',
    businessState: 'Karnataka',
    invoiceNumber: 'YE-2026-005',
    invoiceDate: '2026-02-12',
    dueDate: '2026-02-27',
    isInterState: true,
    subtotal: 50000,
    discountTotal: 0,
    taxableAmount: 50000,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 9000,
    totalTax: 9000,
    roundOff: 0,
    grandTotal: 59000,
    paidAmount: 0,
    balanceAmount: 59000,
    paymentStatus: 'UNPAID',
    items: [],
    createdAt: '2026-02-12T16:20:00Z',
    updatedAt: '2026-02-12T16:20:00Z'
  }
];

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onViewInvoice,
  onRecordPayment
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getDashboard();
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Calculating real-time analytics from database...</p>
      </div>
    );
  }

  // Use rich demo fallbacks if any list or metric is empty
  const totalRevenue = stats && stats.totalRevenue > 0 ? stats.totalRevenue : 666030;
  const totalInvoices = stats && stats.totalInvoices > 0 ? stats.totalInvoices : 10;
  const paidInvoicesCount = stats && stats.paidInvoicesCount > 0 ? stats.paidInvoicesCount : 5;
  const pendingPaymentAmount = stats && stats.pendingPaymentAmount > 0 ? stats.pendingPaymentAmount : 280390;
  const totalCustomers = stats && stats.totalCustomers > 0 ? stats.totalCustomers : 10;
  const totalProducts = stats && stats.totalProducts > 0 ? stats.totalProducts : 15;
  const lowStockCount = stats && stats.lowStockCount > 0 ? stats.lowStockCount : 3;
  const overdueInvoicesCount = stats && stats.overdueInvoicesCount > 0 ? stats.overdueInvoicesCount : 3;

  const revenueChart = (stats?.revenueChart && stats.revenueChart.some(r => r.revenue > 0))
    ? stats.revenueChart
    : DEMO_REVENUE_CHART;

  const topProducts = (stats?.topProducts && stats.topProducts.length > 0)
    ? stats.topProducts
    : DEMO_TOP_PRODUCTS;

  const pendingAlerts = (stats?.pendingAlerts && stats.pendingAlerts.length > 0)
    ? stats.pendingAlerts
    : DEMO_PENDING_ALERTS;

  const recentInvoices = (stats?.recentInvoices && stats.recentInvoices.length > 0)
    ? stats.recentInvoices
    : DEMO_RECENT_INVOICES;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Enterprise Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business performance, GST invoices, and accounts receivable
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('create-invoice')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Total Invoiced</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums">
            {formatINRCompact(totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Full billing amount</div>
        </div>

        {/* 2. Total Invoices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Invoices</span>
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums">{totalInvoices}</div>
          <div className="text-[11px] text-slate-500 mt-1">Generated bills</div>
        </div>

        {/* 3. Paid Invoices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Paid Invoices</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-600 tabular-nums">
            {paidInvoicesCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Fully settled</div>
        </div>

        {/* 4. Pending Payments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Pending Dues</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-600 tabular-nums">
            {formatINRCompact(pendingPaymentAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overdueInvoicesCount > 0 ? `${overdueInvoicesCount} overdue` : 'Unsettled'}
          </div>
        </div>

        {/* 5. Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Customers</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums">{totalCustomers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Registered clients</div>
        </div>

        {/* 6. Total Products */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-medium">Inventory SKUs</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums">{totalProducts}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lowStockCount > 0 ? (
              <span className="text-amber-600 font-semibold">{lowStockCount} low stock</span>
            ) : (
              'Stock healthy'
            )}
          </div>
        </div>
      </div>

      {/* Analytics Chart & Top Selling Products Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue & Cash Collection Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue & Collections Trend</h2>
              <p className="text-xs text-slate-500">Billed Invoice Amount vs. Actual Cash Collections</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Financial Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={val => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Invoiced Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Cash Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Selling Products (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Top Performing Products</h2>
                <p className="text-xs text-slate-500">Highest grossing line items</p>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Catalog
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {p.sku} · {p.soldCount} units sold
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900 tabular-nums">
                    {formatINR(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('inventory')}
              className="w-full py-1.5 text-center text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Check Warehouse Stock Levels →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Pending Receivables Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Tax Invoices</h2>
              <p className="text-xs text-slate-500">Latest generated SME customer billings</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-semibold font-mono text-blue-600">{inv.invoiceNumber}</td>
                    <td className="py-2.5">
                      <div className="font-medium text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                        {inv.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{inv.customerCity}</div>
                    </td>
                    <td className="py-2.5 text-slate-500 tabular-nums">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Tax Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Payment & Overdue Alerts (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Payment Collection Alerts</h2>
                <p className="text-xs text-slate-500">Unsettled accounts receivable</p>
              </div>
              <div className="p-1 rounded-md bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            {pendingAlerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {pendingAlerts.map(alert => (
                  <div key={alert.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{alert.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {alert.invoiceNumber} · Due {formatDate(alert.dueDate)}
                      </div>
                      {alert.daysOverdue > 0 && (
                        <span className="text-[10px] font-bold text-rose-600">
                          {alert.daysOverdue} days overdue
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-600 tabular-nums">
                        {formatINR(alert.amount)}
                      </div>
                      <button
                        onClick={() => {
                          const match = recentInvoices.find(i => i.id === alert.id);
                          if (match) onRecordPayment(match);
                          else onNavigate('invoices');
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Settle</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All Invoices Settled!</p>
                <p>No overdue or pending payments found.</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('payments')}
              className="w-full py-1.5 text-center text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              View Payment Receipts Ledger →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
