import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Payment, Invoice } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatDate } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { NavTab } from '../components/Sidebar.tsx';

interface PaymentsViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onNavigate }) => {
  const { error } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');

  // Quick record payment modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        api.payments.getAll({ method: methodFilter, search }),
        api.invoices.getAll()
      ]);
      setPayments(payRes.payments);
      setUnpaidInvoices(invRes.invoices.filter(i => i.balanceAmount > 0));
    } catch (err: any) {
      error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [methodFilter, search]);

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleOpenRecordPayment = () => {
    if (unpaidInvoices.length === 0) {
      error('No outstanding invoices available to settle.');
      return;
    }
    setSelectedInvoice(unpaidInvoices[0]);
    setIsRecordModalOpen(true);
  };

  const paymentMethods = [
    { id: '', label: 'All Methods' },
    { id: 'UPI', label: 'UPI' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { id: 'CARD', label: 'Cards' },
    { id: 'CASH', label: 'Cash' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Payment Settlements &amp; Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of customer remittances, transaction UTR references, and invoice reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh Payments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenRecordPayment}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Total Remittance Collected</div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">{formatINR(totalCollected)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Recorded payment transactions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Total Payment Entries</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{payments.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Settlement receipts logged</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Unsettled Outstanding Invoices</div>
          <div className="text-xl font-bold text-rose-600 tabular-nums">{unpaidInvoices.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting client payment</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {paymentMethods.map(m => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                methodFilter === m.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer, reference UTR..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Receipt Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference / UTR ID</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-mono">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.customerName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {p.referenceNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 tabular-nums text-sm">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Select Invoice to Settle</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Outstanding Invoice</label>
              <select
                onChange={e => {
                  const inv = unpaidInvoices.find(i => i.id === e.target.value);
                  if (inv) setSelectedInvoice(inv);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {unpaidInvoices.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — {i.customerName} (Due: {formatINR(i.balanceAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="px-3.5 py-1.5 text-xs bg-slate-100 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRecordModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-semibold"
              >
                Proceed to Payment Form
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && !isRecordModalOpen && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
