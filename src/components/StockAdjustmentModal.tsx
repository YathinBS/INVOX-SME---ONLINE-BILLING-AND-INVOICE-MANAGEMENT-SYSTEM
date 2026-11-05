import React, { useState } from 'react';
import { X, Boxes, PlusCircle, ArrowUpDown } from 'lucide-react';
import { Product } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from './Toast.tsx';

interface StockAdjustmentModalProps {
  products: Product[];
  selectedProduct?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  products,
  selectedProduct,
  onClose,
  onSuccess
}) => {
  const { success, error } = useToast();
  const [productId, setProductId] = useState(selectedProduct?.id || products[0]?.id || '');
  const [changeType, setChangeType] = useState<'RESTOCK' | 'MANUAL_ADJUSTMENT'>('RESTOCK');
  const [quantity, setQuantity] = useState('10');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentProduct = products.find(p => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(quantity);

    if (isNaN(numQty) || numQty === 0) {
      error('Please enter a valid non-zero quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.inventory.adjust({
        productId,
        changeType,
        quantity: numQty,
        referenceId,
        notes
      });
      success(res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Inventory Stock Adjustment</h3>
              <p className="text-xs text-slate-500">Record incoming stock batch or manual inventory balance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.availableStock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {currentProduct && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Current Stock in Warehouse:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {currentProduct.availableStock} {currentProduct.unit}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type *</label>
              <select
                value={changeType}
                onChange={e => setChangeType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="RESTOCK">Restock (Add Incoming Stock +)</option>
                <option value="MANUAL_ADJUSTMENT">Manual Adjustment (Audit / Correction)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity {changeType === 'RESTOCK' ? '(Units to Add)' : '(Positive or Negative)'} *
              </label>
              <input
                type="number"
                step="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="e.g. 10 or -2"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference Document ID (e.g. Supplier PO / Inward Gate Pass)
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="e.g. PO-FEB-0042 or AUDIT-2026"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Reason for Adjustment</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Factory delivery received from supplier"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Update Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
