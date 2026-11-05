import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Users,
  Package,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { SalesReport } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatINRCompact, formatDate } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';

export const ReportsView: React.FC = () => {
  const { success, error } = useToast();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getSales(period);
      setReport(res.report);
    } catch (err: any) {
      error(err.message || 'Failed to fetch financial report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [period]);

  // Export to CSV helper
  const exportToCSV = (type: 'gst' | 'customers' | 'products') => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';

    if (type === 'gst') {
      csvContent += 'GST B2B TAX SUMMARY REPORT\r\n';
      csvContent += `Period: ${period.toUpperCase()} (${report.startDate} to ${report.endDate})\r\n\r\n`;
      csvContent += 'Metric,Amount (INR)\r\n';
      csvContent += `Gross Invoiced Sales,${report.totalSales}\r\n`;
      csvContent += `Net Taxable Value,${report.totalTaxable}\r\n`;
      csvContent += `Central GST (CGST),${report.totalCGST}\r\n`;
      csvContent += `State GST (SGST),${report.totalSGST}\r\n`;
      csvContent += `Integrated GST (IGST),${report.totalIGST}\r\n`;
      csvContent += `Total GST Collected,${report.totalTax}\r\n`;
    } else if (type === 'customers') {
      csvContent += 'CUSTOMER SALES & RECEIVABLES REPORT\r\n';
      csvContent += 'Customer Name,Invoices Count,Total Billed (INR),Balance Due (INR)\r\n';
      report.customerSales.forEach(c => {
        csvContent += `"${c.customerName}",${c.count},${c.total},${c.balance}\r\n`;
      });
    } else if (type === 'products') {
      csvContent += 'PRODUCT SALES & GROSS PROFIT MARGIN REPORT\r\n';
      csvContent += 'Product Name,SKU,Units Sold,Revenue (INR),Cost (INR),Gross Profit (INR),Margin %\r\n';
      report.productSales.forEach(p => {
        const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
        csvContent += `"${p.name}","${p.sku}",${p.unitsSold},${p.revenue},${p.cost},${p.profit},${margin}%\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Invox_${type}_report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported ${type.toUpperCase()} report as CSV.`);
  };

  if (loading && !report) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Compiling financial ledgers & tax schedules...</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Financial Reports &amp; GST Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            B2B tax liability summary, gross margins, customer revenue breakdown, and spreadsheet exports
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                period === p
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Tax & Revenue Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Total Sales ({period})</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{formatINR(report.totalSales)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{report.invoiceCount} invoices generated</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Net Taxable Value</div>
          <div className="text-xl font-bold text-blue-600 tabular-nums">{formatINR(report.totalTaxable)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Excluding trade discounts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Total GST Tax Collected</div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">{formatINR(report.totalTax)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Output tax payable to govt</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">IGST / Inter-State Share</div>
          <div className="text-xl font-bold text-purple-600 tabular-nums">{formatINR(report.totalIGST)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Out-of-state customer supplies</div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Sales & Tax Timeline ({period.toUpperCase()})</h2>
            <p className="text-xs text-slate-500">Gross revenue vs GST tax collection over time</p>
          </div>
          <button
            onClick={() => exportToCSV('gst')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GST Summary CSV</span>
          </button>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales (INR)"
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="tax"
                name="GST Tax (INR)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTax)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Split Tables: Customer Sales & Product Margins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Wise Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Sales & Outstanding</h3>
                <p className="text-xs text-slate-500">Highest grossing enterprise accounts</p>
              </div>
              <button
                onClick={() => exportToCSV('customers')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold pb-2">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-center">Bills</th>
                    <th className="pb-2 text-right">Invoiced</th>
                    <th className="pb-2 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.customerSales.slice(0, 7).map(c => (
                    <tr key={c.customerId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-medium text-slate-900">{c.customerName}</td>
                      <td className="py-2.5 text-center text-slate-500 font-mono">{c.count}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                        {formatINR(c.total)}
                      </td>
                      <td className="py-2.5 text-right font-bold tabular-nums">
                        {c.balance > 0 ? (
                          <span className="text-rose-600">{formatINR(c.balance)}</span>
                        ) : (
                          <span className="text-emerald-600">₹0.00</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Product Sales & Profit Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Product Sales & Gross Profit Margin</h3>
                <p className="text-xs text-slate-500">Revenue minus recorded purchase costs</p>
              </div>
              <button
                onClick={() => exportToCSV('products')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold pb-2">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-center">Sold</th>
                    <th className="pb-2 text-right">Revenue</th>
                    <th className="pb-2 text-right">Gross Profit</th>
                    <th className="pb-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.productSales.slice(0, 7).map(p => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(0) : '0';
                    return (
                      <tr key={p.productId} className="hover:bg-slate-50/70">
                        <td className="py-2.5">
                          <div className="font-medium text-slate-900 truncate max-w-[140px]">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                        </td>
                        <td className="py-2.5 text-center text-slate-600 font-mono">{p.unitsSold}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                          {formatINR(p.revenue)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                          {formatINR(p.profit)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
