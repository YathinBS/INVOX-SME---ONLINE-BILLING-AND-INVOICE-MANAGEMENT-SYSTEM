import React, { useState } from 'react';
import { X, CreditCard, Check, AlertCircle } from 'lucide-react';
import { Invoice, PaymentMethod } from '../types/index.ts';
import { formatINR } from '../services/currency.ts';
import { api } from '../services/api.ts';
import { useToast } from './Toast.tsx';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  onClose,
  onSuccess
}) => {
  if (!invoice) return null;

  const { success, error } = useToast();
  const [amount, setAmount] = useState(invoice.balanceAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      error('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (numAmount > invoice.balanceAmount + 0.05) {
      error(`Amount cannot exceed outstanding balance of ${formatINR(invoice.balanceAmount)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.payments.record({
        invoiceId: invoice.id,
        amount: numAmount,
        paymentMethod,
        referenceNumber,
        paymentDate,
        notes
      });
      success(res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Record Payment</h3>
              <p className="text-xs text-slate-500">Invoice {invoice.invoiceNumber} · {invoice.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 grid grid-cols-3 text-center text-xs">
          <div>
            <div className="text-slate-500 text-[11px]">Invoice Total</div>
            <div className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.grandTotal)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Already Paid</div>
            <div className="font-semibold text-emerald-600 tabular-nums">{formatINR(invoice.paidAmount)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Balance Due</div>
            <div className="font-bold text-rose-600 tabular-nums">{formatINR(invoice.balanceAmount)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
              <button
                type="button"
                onClick={() => setAmount(invoice.balanceAmount.toString())}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Pay Full Balance
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              required
              max={invoice.balanceAmount}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction / Reference Number (UTR / Ref ID)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR-982103848 or UPI-492049"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Cleared via current account"
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
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
