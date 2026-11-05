import React, { useState, useEffect } from 'react';
import {
  FilePlus2,
  Plus,
  Trash2,
  Check,
  Building2,
  User,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';
import { Customer, Product, Business, Invoice, InvoiceItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, numberToIndianWords } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal.tsx';
import { NavTab } from '../components/Sidebar.tsx';

interface CreateInvoiceViewProps {
  business: Business | null;
  onNavigate: (tab: NavTab) => void;
  onInvoiceCreated: (invoice: Invoice) => void;
  preselectedCustomerId?: string | null;
}

interface DraftLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
}

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  business,
  onNavigate,
  onInvoiceCreated,
  preselectedCustomerId
}) => {
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Invoice form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Thank you for choosing YATHIN ENTERPRISES. Goods dispatched in prime condition.');
  const [terms, setTerms] = useState(
    business?.defaultPaymentTerms ||
      'Payment due within 15 days of invoice date. 18% p.a. interest applicable on overdue bills.'
  );

  // Line items state
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);

  // Preview modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Load initial data
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [custRes, prodRes, numRes] = await Promise.all([
          api.customers.getAll(),
          api.products.getAll(),
          api.invoices.getNextNumber()
        ]);
        setCustomers(custRes.customers);
        setProducts(prodRes.products);
        setInvoiceNumber(numRes.nextNumber);

        // Preselect customer if provided
        const defaultCustId = preselectedCustomerId || custRes.customers[0]?.id || '';
        setSelectedCustomerId(defaultCustId);

        // Add initial line item if products exist
        if (prodRes.products.length > 0) {
          const firstProd = prodRes.products[0];
          setLineItems([
            {
              productId: firstProd.id,
              quantity: 1,
              unitPrice: firstProd.sellingPrice,
              discountPercentage: 0,
              discountAmount: 0
            }
          ]);
        }
      } catch (err: any) {
        error(err.message || 'Failed to initialize invoice form');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [preselectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Determine Inter-State vs Intra-State
  const isInterState =
    business && selectedCustomer
      ? business.state.trim().toLowerCase() !== selectedCustomer.state.trim().toLowerCase()
      : false;

  // Add line item
  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setLineItems(prev => [
      ...prev,
      {
        productId: defaultProduct.id,
        quantity: 1,
        unitPrice: defaultProduct.sellingPrice,
        discountPercentage: 0,
        discountAmount: 0
      }
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      error('Invoice must contain at least one product.');
      return;
    }
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const handleUpdateLineItem = (index: number, updates: Partial<DraftLineItem>) => {
    setLineItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], ...updates };

      // If product changed, update default unitPrice
      if (updates.productId && updates.productId !== copy[index].productId) {
        const prod = products.find(p => p.id === updates.productId);
        if (prod) {
          item.unitPrice = prod.sellingPrice;
        }
      }

      // Sync discount
      const gross = item.quantity * item.unitPrice;
      if (updates.discountPercentage !== undefined) {
        item.discountAmount = (gross * updates.discountPercentage) / 100;
      } else if (updates.discountAmount !== undefined && gross > 0) {
        item.discountPercentage = (updates.discountAmount / gross) * 100;
      }

      copy[index] = item;
      return copy;
    });
  };

  // Real-time calculations
  const calculatedItems = lineItems.map((item, idx) => {
    const prod = products.find(p => p.id === item.productId);
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    const discount = item.discountAmount || 0;
    const taxable = Math.max(0, gross - discount);
    const gstRate = prod?.gstPercentage || 18;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstRate = gstRate;
      igstAmount = (taxable * igstRate) / 100;
    } else {
      cgstRate = gstRate / 2;
      cgstAmount = (taxable * cgstRate) / 100;
      sgstRate = gstRate / 2;
      sgstAmount = (taxable * sgstRate) / 100;
    }

    const total = taxable + cgstAmount + sgstAmount + igstAmount;

    return {
      id: `preview_${idx}`,
      productId: item.productId,
      productName: prod?.name || 'Unknown Product',
      sku: prod?.sku || '',
      hsnCode: prod?.hsnCode || '',
      quantity: item.quantity,
      unit: prod?.unit || 'NOS',
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
      discountAmount: discount,
      taxableAmount: taxable,
      gstPercentage: gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount: total
    };
  });

  const subtotal = calculatedItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const discountTotal = calculatedItems.reduce((acc, i) => acc + i.discountAmount, 0);
  const taxableAmount = calculatedItems.reduce((acc, i) => acc + i.taxableAmount, 0);
  const cgstTotal = calculatedItems.reduce((acc, i) => acc + i.cgstAmount, 0);
  const sgstTotal = calculatedItems.reduce((acc, i) => acc + i.sgstAmount, 0);
  const igstTotal = calculatedItems.reduce((acc, i) => acc + i.igstAmount, 0);
  const totalTax = cgstTotal + sgstTotal + igstTotal;
  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = Math.round((rawGrandTotal + Number.EPSILON) * 100) / 100;
  const roundOff = Math.round((grandTotal - rawGrandTotal + Number.EPSILON) * 100) / 100;

  // Validation
  const validateInvoice = (): boolean => {
    if (!selectedCustomer) {
      error('Please select a customer for this invoice.');
      return false;
    }

    if (lineItems.length === 0) {
      error('Please add at least one line item.');
      return false;
    }

    // Stock check
    for (const item of lineItems) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) continue;
      if (item.quantity <= 0) {
        error(`Quantity for product '${prod.name}' must be at least 1.`);
        return false;
      }
      if (item.quantity > prod.availableStock) {
        error(
          `Cannot invoice ${item.quantity} units of '${prod.name}'. Only ${prod.availableStock} ${prod.unit} available in stock.`
        );
        return false;
      }
    }

    return true;
  };

  // Build temporary invoice object for preview
  const handleOpenPreview = () => {
    if (!validateInvoice() || !selectedCustomer || !business) return;

    const draftInvoice: Invoice = {
      id: 'draft_preview',
      businessId: business.id,
      invoiceNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerBusinessName: selectedCustomer.businessName,
      customerGstin: selectedCustomer.gstin,
      customerAddress: selectedCustomer.billingAddress,
      customerCity: selectedCustomer.city,
      customerState: selectedCustomer.state,
      customerPinCode: selectedCustomer.pinCode,
      customerPhone: selectedCustomer.phone,
      customerEmail: selectedCustomer.email,
      invoiceDate,
      dueDate,
      isInterState,
      businessState: business.state,
      subtotal,
      discountTotal,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      roundOff,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      paymentStatus: 'UNPAID',
      notes,
      termsAndConditions: terms,
      items: calculatedItems as InvoiceItem[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPreviewInvoice(draftInvoice);
  };

  // Submit and save invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInvoice() || !selectedCustomer) return;

    setSubmitting(true);
    try {
      const payload = {
        invoiceNumber,
        customerId: selectedCustomer.id,
        invoiceDate,
        dueDate,
        items: lineItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountPercentage: item.discountPercentage
        })),
        notes,
        termsAndConditions: terms
      };

      const res = await api.invoices.create(payload);
      success(res.message);
      onInvoiceCreated(res.invoice);
    } catch (err: any) {
      error(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading billing catalogs and invoice sequencer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Create New Tax Invoice</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Intra/Inter-State GST calculations, automatic stock deduction, and immediate PDF export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Invoice</span>
          </button>
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Generating...' : 'Confirm & Generate Invoice'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* Top Info Bar: Invoice Meta & Supplier Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Invoice Number & Dates */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Customer Selector & Address Card */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Bill To Customer (Client) *</label>
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                + Add New Customer
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.businessName} ({c.city}, {c.state})
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">{selectedCustomer.businessName}</div>
                  <div className="text-slate-500 text-[11px]">
                    {selectedCustomer.billingAddress}, {selectedCustomer.city}, {selectedCustomer.state} -{' '}
                    {selectedCustomer.pinCode}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    GSTIN: <span className="font-mono">{selectedCustomer.gstin || 'Unregistered'}</span> · Phone: {selectedCustomer.phone}
                  </div>
                </div>

                {/* GST Place of Supply Badge */}
                <div className="shrink-0 text-right">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      isInterState
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <span>
                      {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Supplier: {business?.state} → Client: {selectedCustomer.state}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Line Items Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Line Items & Products ({lineItems.length})
            </span>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Product Description</th>
                  <th className="py-2.5 px-3 w-28 text-center">Qty / Stock</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Price (₹)</th>
                  <th className="py-2.5 px-3 w-24 text-right">Disc (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">
                    {isInterState ? 'IGST' : 'CGST + SGST'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  const calc = calculatedItems[idx];
                  const hasStockWarning = prod && item.quantity > prod.availableStock;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>

                      {/* Product Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={item.productId}
                          onChange={e => handleUpdateLineItem(idx, { productId: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku} · HSN: {p.hsnCode} · GST: {p.gstPercentage}%)
                            </option>
                          ))}
                        </select>
                        {prod && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                            <span>HSN: {prod.hsnCode}</span>
                            <span>·</span>
                            <span
                              className={`font-mono font-medium ${
                                hasStockWarning ? 'text-rose-600 font-bold' : 'text-slate-600'
                              }`}
                            >
                              Available: {prod.availableStock} {prod.unit}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e =>
                              handleUpdateLineItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                            }
                            className={`w-16 px-2 py-1 text-xs text-center border rounded-lg focus:outline-none font-mono ${
                              hasStockWarning
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-slate-300 bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-500">{prod?.unit}</span>
                        </div>
                        {hasStockWarning && (
                          <div className="text-[9px] text-rose-600 mt-0.5">Exceeds stock!</div>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e =>
                            handleUpdateLineItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 px-2 py-1 text-xs text-right border border-slate-300 rounded-lg focus:outline-none font-mono"
                        />
                      </td>

                      {/* Discount Amount */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.discountAmount}
                          onChange={e =>
                            handleUpdateLineItem(idx, { discountAmount: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-20 px-2 py-1 text-xs text-right border border-slate-300 rounded-lg focus:outline-none font-mono text-slate-600"
                        />
                      </td>

                      {/* Taxable Amount */}
                      <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                        {formatINR(calc?.taxableAmount || 0)}
                      </td>

                      {/* GST Amount */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                        {isInterState ? (
                          <div>{formatINR(calc?.igstAmount || 0)}</div>
                        ) : (
                          <div>{formatINR((calc?.cgstAmount || 0) + (calc?.sgstAmount || 0))}</div>
                        )}
                        <div className="text-[10px] text-slate-400">({prod?.gstPercentage || 18}%)</div>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(calc?.totalAmount || 0)}
                      </td>

                      {/* Remove Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculations Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Notes and Terms */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Total in words callout */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-0.5">
                Grand Total in Words
              </span>
              <span className="font-semibold text-blue-950 font-serif">
                {numberToIndianWords(grandTotal)}
              </span>
            </div>
          </div>

          {/* Tax Breakdown Summary Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
              Taxable Amount & GST Calculation Summary
            </h3>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Gross Items Subtotal:</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatINR(subtotal)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Trade Discount:</span>
              <span className="font-semibold text-slate-900 tabular-nums">(-) {formatINR(discountTotal)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Net Taxable Amount:</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatINR(taxableAmount)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-purple-700 font-medium">Integrated GST (IGST):</span>
                <span className="font-bold text-purple-700 tabular-nums">{formatINR(igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Central GST (CGST):</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">State GST (SGST):</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatINR(sgstTotal)}</span>
                </div>
              </>
            )}

            {roundOff !== 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Round Off Adjustment:</span>
                <span className="font-semibold text-slate-700 tabular-nums">{formatINR(roundOff)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm">
              <span className="font-bold text-slate-900">Final Grand Total:</span>
              <span className="font-bold text-slate-900 tabular-nums text-base">{formatINR(grandTotal)}</span>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Creating Invoice...' : 'Generate & Save Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Invoice Live Preview Modal */}
      {previewInvoice && business && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          business={business}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
};
