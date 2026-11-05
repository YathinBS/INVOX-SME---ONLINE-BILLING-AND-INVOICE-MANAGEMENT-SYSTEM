import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Check,
  X,
  Filter
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal.tsx';

export const ProductsView: React.FC = () => {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    hsnCode: '8481',
    category: 'Mechanical Hardware',
    description: '',
    sellingPrice: '',
    purchasePrice: '',
    gstPercentage: '18',
    availableStock: '10',
    minStockAlert: '5',
    unit: 'NOS'
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.getAll({
        search,
        category: categoryFilter,
        lowStock: lowStockOnly
      });
      setProducts(res.products);
    } catch (err: any) {
      error(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter, lowStockOnly]);

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      hsnCode: '8481',
      category: 'Mechanical Hardware',
      description: '',
      sellingPrice: '',
      purchasePrice: '',
      gstPercentage: '18',
      availableStock: '10',
      minStockAlert: '5',
      unit: 'NOS'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      hsnCode: p.hsnCode,
      category: p.category,
      description: p.description,
      sellingPrice: p.sellingPrice.toString(),
      purchasePrice: p.purchasePrice.toString(),
      gstPercentage: p.gstPercentage.toString(),
      availableStock: p.availableStock.toString(),
      minStockAlert: p.minStockAlert.toString(),
      unit: p.unit
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sellingPrice) {
      error('Product name and selling price are required');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        hsnCode: formData.hsnCode,
        category: formData.category,
        description: formData.description,
        sellingPrice: Number(formData.sellingPrice),
        purchasePrice: Number(formData.purchasePrice) || 0,
        gstPercentage: Number(formData.gstPercentage),
        availableStock: Number(formData.availableStock),
        minStockAlert: Number(formData.minStockAlert),
        unit: formData.unit
      };

      if (editingProduct) {
        const res = await api.products.update(editingProduct.id, payload);
        success(res.message);
      } else {
        const res = await api.products.create(payload);
        success(res.message);
      }
      setIsAddModalOpen(false);
      loadProducts();
    } catch (err: any) {
      error(err.message || 'Failed to save product');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      const res = await api.products.delete(productToDelete.id);
      success(res.message);
      setProductToDelete(null);
      loadProducts();
    } catch (err: any) {
      error(err.message || 'Failed to delete product');
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Product &amp; Pricing Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage goods, HSN classification, standard GST rates, and inventory purchase margins
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, HSN, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={e => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-amber-700">Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">SKU / Product ID</th>
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-4 text-center">HSN Code</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const isLow = p.availableStock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-blue-600">{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.productId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.category}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700 font-medium">
                        {p.hsnCode}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                        {formatINR(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {p.gstPercentage}%
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div
                          className={`font-bold flex items-center justify-end gap-1 ${
                            isLow ? 'text-amber-600' : 'text-slate-800'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <span>
                            {p.availableStock} {p.unit}
                          </span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] text-amber-600">
                            Min Alert: {p.minStockAlert} {p.unit}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAdjustingProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Restock or Adjust Inventory"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Industrial Three-Phase Motor 5HP"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="MOT-3P-5HP"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.hsnCode}
                    onChange={e => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="8501"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Motors & Drives"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="18500"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="14200"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Slab Rate (%) *</label>
                  <select
                    value={formData.gstPercentage}
                    onChange={e => setFormData({ ...formData, gstPercentage: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="0">0% (Nil Rated / Exempt)</option>
                    <option value="5">5% (Essential Goods)</option>
                    <option value="12">12% (Standard Low)</option>
                    <option value="18">18% (Standard Industrial)</option>
                    <option value="28">28% (Luxury / De-merit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available Stock *</label>
                  <input
                    type="number"
                    required
                    value={formData.availableStock}
                    onChange={e => setFormData({ ...formData, availableStock: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Stock Alert *</label>
                  <input
                    type="number"
                    required
                    value={formData.minStockAlert}
                    onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="DRUM">DRUM (Drums)</option>
                    <option value="CAN">CAN (Cans)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Technical Specs</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 5HP 1440 RPM heavy duty squirrel cage motor"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Update Product' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Adjust Modal */}
      {adjustingProduct && (
        <StockAdjustmentModal
          products={products}
          selectedProduct={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={loadProducts}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Delete Product from Catalog"
        message={`Are you sure you want to delete '${productToDelete?.name}'? Products that are part of recorded invoices cannot be removed.`}
        confirmLabel="Delete Product"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
