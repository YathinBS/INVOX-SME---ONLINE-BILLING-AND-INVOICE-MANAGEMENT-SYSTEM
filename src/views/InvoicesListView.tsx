import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Printer,
  CreditCard,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Invoice, Business, PaymentStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatDate } from '../services/currency.ts';
import { downloadInvoicePDF } from '../services/pdfGenerator.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal.tsx';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { useToast } from '../components/Toast.tsx';
import { NavTab } from '../components/Sidebar.tsx';

interface InvoicesListViewProps {
  business: Business | null;
  onNavigate: (tab: NavTab) => void;
  selectedInvoiceToView?: Invoice | null;
  onClearSelectedInvoice?: () => void;
}

export const InvoicesListView: React.FC<InvoicesListViewProps> = ({
  business,
  onNavigate,
  selectedInvoiceToView,
  onClearSelectedInvoice
}) => {
  const { success, error } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(selectedInvoiceToView || null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search
      });
      setInvoices(res.invoices);
    } catch (err: any) {
      error(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, search]);

  useEffect(() => {
    if (selectedInvoiceToView) {
      setPreviewingInvoice(selectedInvoiceToView);
    }
  }, [selectedInvoiceToView]);

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    try {
      const res = await api.invoices.delete(invoiceToDelete.id);
      success(res.message);
      setInvoiceToDelete(null);
      loadInvoices();
    } catch (err: any) {
      error(err.message || 'Failed to delete invoice');
      setInvoiceToDelete(null);
    }
  };

  const handleDownload = (inv: Invoice) => {
    if (!business) return;
    downloadInvoicePDF(inv, business);
    success(`Downloaded ${inv.invoiceNumber}.pdf`);
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Invoices' },
    { id: 'PAID', label: 'Paid' },
    { id: 'UNPAID', label: 'Unpaid' },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { id: 'OVERDUE', label: 'Overdue' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">All Tax Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, download PDF, print, record customer payments, or cancel billings
          </p>
        </div>
        <button
          onClick={() => onNavigate('create-invoice')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice number, client name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    No invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500">{inv.customerBusinessName || inv.customerCity}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium tabular-nums">
                      {formatINR(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      {inv.balanceAmount > 0 ? (
                        <span className="text-rose-600">{formatINR(inv.balanceAmount)}</span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.balanceAmount > 0 && (
                          <button
                            onClick={() => setPayingInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewingInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Preview & Print"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(inv)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete / Cancel Invoice (Restores Stock)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {previewingInvoice && business && (
        <InvoicePreviewModal
          invoice={previewingInvoice}
          business={business}
          onClose={() => {
            setPreviewingInvoice(null);
            if (onClearSelectedInvoice) onClearSelectedInvoice();
          }}
          onRecordPayment={inv => {
            setPreviewingInvoice(null);
            setPayingInvoice(inv);
          }}
        />
      )}

      {/* Payment Modal */}
      {payingInvoice && (
        <PaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSuccess={loadInvoices}
        />
      )}

      {/* Delete / Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        title="Cancel & Delete Invoice"
        message={`Are you sure you want to delete invoice '${invoiceToDelete?.invoiceNumber}'? Deducted product inventory will be automatically restored to warehouse stock.`}
        confirmLabel="Confirm Delete & Restore Stock"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  );
};
