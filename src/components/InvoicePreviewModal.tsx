import React from 'react';
import { X, Download, Printer, CreditCard, Building2, ShieldCheck } from 'lucide-react';
import { Invoice, Business } from '../types/index.ts';
import { formatINR, formatDate, numberToIndianWords } from '../services/currency.ts';
import { downloadInvoicePDF } from '../services/pdfGenerator.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  business: Business | null;
  onClose: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  business,
  onClose,
  onRecordPayment
}) => {
  if (!invoice || !business) return null;

  const isInterState = invoice.isInterState;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadInvoicePDF(invoice, business);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
              Tax Invoice Preview
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300 font-mono">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            {invoice.balanceAmount > 0 && onRecordPayment && (
              <button
                onClick={() => onRecordPayment(invoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 sm:p-10 text-slate-800 bg-white max-h-[85vh] overflow-y-auto">
          {/* Header Bar */}
          <div className="bg-slate-900 text-white text-center py-1.5 text-xs font-bold tracking-widest uppercase mb-6 rounded-xs">
            TAX INVOICE
          </div>

          {/* Business & Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{business.name}</h1>
              </div>
              <p className="text-xs text-slate-600">{business.address}</p>
              <p className="text-xs text-slate-600">
                {business.city}, {business.state} - {business.pinCode}
              </p>
              <p className="text-xs font-semibold text-slate-900 mt-1">
                GSTIN: <span className="font-mono">{business.gstin}</span>
              </p>
              <p className="text-xs text-slate-600">
                Phone: {business.phone} · Email: {business.email}
              </p>
            </div>

            <div className="sm:text-right space-y-1 text-xs">
              <div className="text-xl font-bold font-mono text-blue-600">{invoice.invoiceNumber}</div>
              <div className="flex sm:justify-end items-center gap-2">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={invoice.paymentStatus} />
              </div>
              <div>
                <span className="text-slate-500">Invoice Date: </span>
                <span className="font-medium text-slate-900">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Due Date: </span>
                <span className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Place of Supply: </span>
                <span className="font-medium text-slate-900">{invoice.customerState}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Supply Type: {isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
              </div>
            </div>
          </div>

          {/* Bill To Customer Section */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Billed To (Receiver Details)
              </div>
              <div className="font-bold text-sm text-slate-900">
                {invoice.customerBusinessName || invoice.customerName}
              </div>
              <div className="text-slate-600 mt-0.5">Attn: {invoice.customerName}</div>
              <div className="text-slate-600">{invoice.customerAddress}</div>
              <div className="text-slate-600">
                {invoice.customerCity}, {invoice.customerState} - {invoice.customerPinCode}
              </div>
              <div className="text-slate-600">Phone: {invoice.customerPhone || '-'}</div>
            </div>
            <div className="sm:text-right space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tax Registration
              </div>
              <div className="font-semibold text-slate-800">
                GSTIN: <span className="font-mono">{invoice.customerGstin || 'URP (Unregistered)'}</span>
              </div>
              <div className="text-slate-600">State: {invoice.customerState}</div>
              <div className="text-slate-600">Email: {invoice.customerEmail || '-'}</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Item & Description</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Disc</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  {isInterState ? (
                    <th className="py-2.5 px-3 text-right">IGST</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.hsnCode || '-'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatINR(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                      {item.discountAmount > 0 ? formatINR(item.discountAmount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                      {formatINR(item.taxableAmount)}
                    </td>
                    {isInterState ? (
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <div>{formatINR(item.igstAmount)}</div>
                        <div className="text-[10px] text-slate-400">({item.igstRate}%)</div>
                      </td>
                    ) : (
                      <>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <div>{formatINR(item.cgstAmount)}</div>
                          <div className="text-[10px] text-slate-400">({item.cgstRate}%)</div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <div>{formatINR(item.sgstAmount)}</div>
                          <div className="text-[10px] text-slate-400">({item.sgstRate}%)</div>
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums">
                      {formatINR(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-6 border-b border-slate-200">
            {/* Left: Words & Bank */}
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Total Amount in Words
                </div>
                <div className="font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {numberToIndianWords(invoice.grandTotal)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Bank Settlement Details (NEFT / RTGS / IMPS)
                </div>
                <div className="text-slate-800">
                  <span className="text-slate-500">Bank: </span>
                  <span className="font-medium">{business.bankDetails.bankName}</span>
                </div>
                <div className="text-slate-800 font-mono">
                  <span className="text-slate-500 font-sans">A/C No: </span>
                  <span className="font-medium">{business.bankDetails.accountNumber}</span>
                </div>
                <div className="text-slate-800 font-mono">
                  <span className="text-slate-500 font-sans">IFSC: </span>
                  <span className="font-medium">{business.bankDetails.ifscCode}</span> · {business.bankDetails.branchName}
                </div>
                <div className="text-slate-800">
                  <span className="text-slate-500">UPI ID: </span>
                  <span className="font-semibold text-blue-600 font-mono">{business.upiId}</span>
                </div>
              </div>
            </div>

            {/* Right: Tax Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Discount:</span>
                <span className="font-semibold text-slate-900 tabular-nums">(-) {formatINR(invoice.discountTotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.taxableAmount)}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Integrated GST (IGST):</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.igstTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Central GST (CGST):</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">State GST (SGST):</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.sgstTotal)}</span>
                  </div>
                </>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Round Off:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.roundOff)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm">
                <span className="font-bold text-slate-900">Grand Total:</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatINR(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600 text-xs">
                <span>Amount Paid:</span>
                <span className="font-medium text-emerald-700 tabular-nums">{formatINR(invoice.paidAmount)}</span>
              </div>

              <div className="flex justify-between py-1.5 bg-slate-100 px-2 rounded-lg font-bold text-xs">
                <span className="text-slate-900">Balance Due:</span>
                <span
                  className={`tabular-nums ${
                    invoice.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {formatINR(invoice.balanceAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Signatory */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Terms & Conditions
              </div>
              <p className="text-slate-600 leading-relaxed">
                {invoice.termsAndConditions || business.defaultPaymentTerms}
              </p>
            </div>
            <div className="sm:text-right flex flex-col justify-between items-end min-h-24">
              <div className="text-slate-800 font-bold">For {business.name}</div>
              <div className="border-t border-slate-300 pt-1 text-slate-500 text-[11px] w-48 text-center mt-8">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
