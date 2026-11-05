import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  History,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search
} from 'lucide-react';
import { Product, InventoryTransaction } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatDate } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal.tsx';

export const InventoryView: React.FC = () => {
  const { error } = useToast();
  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [loading, setLoading] = useState(true);

  // Data states
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalUnits: 0,
    lowStockCount: 0,
    inventoryAssetValue: 0
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [statusRes, txRes] = await Promise.all([
        api.inventory.getStatus(),
        api.inventory.getTransactions({ limit: 100 })
      ]);
      setSummary(statusRes.summary);
      setProducts(statusRes.products);
      setTransactions(txRes.transactions);
    } catch (err: any) {
      error(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    t =>
      t.productName.toLowerCase().includes(search.toLowerCase()) ||
      t.sku.toLowerCase().includes(search.toLowerCase()) ||
      (t.referenceId && t.referenceId.toLowerCase().includes(search.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Inventory &amp; Stock Tracking</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated stock deduction on invoice generation, replenishment batches, and audit trail
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadInventory}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh Stock"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsAdjustModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Stock Adjustment / Restock</span>
          </button>
        </div>
      </div>

      {/* 4 Inventory Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Products</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{summary.totalProducts}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active warehouse items</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Stock Units</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{summary.totalUnits}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Physical items on shelf</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 tabular-nums">
            {summary.lowStockCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Below reorder threshold</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Estimated Asset Value</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            {formatINR(summary.inventoryAssetValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Based on purchase cost</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Interactive Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('levels')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'levels'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Warehouse Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Movement Ledger ({transactions.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              activeTab === 'levels'
                ? 'Filter stock by product, SKU...'
                : 'Search ledger by invoice #, product...'
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tab 1: Current Stock Levels */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4">Inventory Status</th>
                  <th className="py-3 px-4 text-right">Unit Value</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isLow = p.availableStock <= p.minStockAlert;
                  const itemValue = p.availableStock * (p.purchasePrice || p.sellingPrice * 0.7);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">{p.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.category}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums text-sm">
                        {p.availableStock} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                        {p.minStockAlert} {p.unit}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                        {formatINR(p.purchasePrice || p.sellingPrice * 0.7)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                        {formatINR(itemValue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movement Ledger (Audit Log) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Change (Units)</th>
                  <th className="py-3 px-4 text-right">Previous Stock</th>
                  <th className="py-3 px-4 text-right">New Balance</th>
                  <th className="py-3 px-4">Reference Document</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(t => {
                  const isPositive = t.quantityChange > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.productName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{t.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-700">
                          {t.changeType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${t.quantityChange}` : t.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                        {t.previousStock}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {t.newStock}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">
                        {t.referenceId || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {t.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <StockAdjustmentModal
          products={products}
          selectedProduct={selectedProduct}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={loadInventory}
        />
      )}
    </div>
  );
};
