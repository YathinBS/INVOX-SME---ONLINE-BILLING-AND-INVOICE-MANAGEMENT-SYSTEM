import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Building,
  Phone,
  Mail,
  MapPin,
  X,
  Check,
  FileText
} from 'lucide-react';
import { Customer, Invoice, INDIAN_STATES } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatINR, formatDate } from '../services/currency.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface CustomersViewProps {
  onViewInvoice?: (invoice: Invoice) => void;
  onCreateInvoiceForCustomer?: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onViewInvoice,
  onCreateInvoiceForCustomer
}) => {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<{ customer: Customer; invoices: Invoice[] } | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    gstin: '',
    billingAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560001'
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.getAll({ search });
      setCustomers(res.customers);
    } catch (err: any) {
      error(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      businessName: '',
      email: '',
      phone: '+91 ',
      gstin: '',
      billingAddress: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      businessName: c.businessName,
      email: c.email || '',
      phone: c.phone,
      gstin: c.gstin || '',
      billingAddress: c.billingAddress,
      city: c.city,
      state: c.state,
      pinCode: c.pinCode
    });
    setIsAddModalOpen(true);
  };

  const handleViewCustomer = async (c: Customer) => {
    try {
      const res = await api.customers.getById(c.id);
      setViewingCustomer({ customer: res.customer, invoices: res.invoices });
    } catch (err: any) {
      error(err.message || 'Failed to load customer details');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.billingAddress) {
      error('Customer name, phone, and billing address are required');
      return;
    }

    try {
      if (editingCustomer) {
        const res = await api.customers.update(editingCustomer.id, formData);
        success(res.message);
      } else {
        const res = await api.customers.create(formData);
        success(res.message);
      }
      setIsAddModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      error(err.message || 'Failed to save customer');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    try {
      const res = await api.customers.delete(customerToDelete.id);
      success(res.message);
      setCustomerToDelete(null);
      loadCustomers();
    } catch (err: any) {
      error(err.message || 'Failed to delete customer');
      setCustomerToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">Customer Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SME client records, GSTIN registration, billing addresses, and invoice ledgers
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, business, GSTIN, phone, or city..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-900">{customers.length}</span> clients
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Client & Business</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Location / State</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">{c.customerId}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.businessName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{c.phone}</div>
                      <div className="text-[11px] text-slate-500">{c.email || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{c.city}</div>
                      <div className="text-[11px] text-slate-500">{c.state}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.gstin ? (
                        <span className="text-slate-800 font-medium">{c.gstin}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unregistered</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                      {formatINR(c.totalInvoiced || 0)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {(c.balanceDue || 0) > 0 ? (
                        <span className="font-bold text-rose-600">{formatINR(c.balanceDue)}</span>
                      ) : (
                        <span className="font-medium text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewCustomer(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Invoices & Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCustomerToDelete(c)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Customer"
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

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business / Company Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Apex Precision Tools Pvt Ltd"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450 11223"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="accounts@client.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="29AABCA1234F1ZP"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Street Address *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.billingAddress}
                  onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                  placeholder="Plot 18, Phase 1, Electronic City"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <select
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.pinCode}
                    onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
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
                  <span>{editingCustomer ? 'Update Customer' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Details & Invoice History Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-blue-600 font-semibold uppercase">
                  {viewingCustomer.customer.customerId}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {viewingCustomer.customer.name}
                </h3>
                <p className="text-xs text-slate-500">{viewingCustomer.customer.businessName}</p>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-4 border-b border-slate-100 grid grid-cols-3 text-center text-xs">
              <div>
                <div className="text-slate-500 text-[11px]">Total Billed</div>
                <div className="font-bold text-slate-900 tabular-nums">
                  {formatINR(viewingCustomer.customer.totalInvoiced || 0)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">Total Paid</div>
                <div className="font-bold text-emerald-600 tabular-nums">
                  {formatINR(viewingCustomer.customer.totalPaid || 0)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">Balance Due</div>
                <div className="font-bold text-rose-600 tabular-nums">
                  {formatINR(viewingCustomer.customer.balanceDue || 0)}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">GSTIN Registration:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {viewingCustomer.customer.gstin || 'Unregistered Person'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Phone:</span>
                  <span className="text-slate-800 font-medium">{viewingCustomer.customer.phone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Billing Address:</span>
                  <span className="text-slate-800">
                    {viewingCustomer.customer.billingAddress}, {viewingCustomer.customer.city},{' '}
                    {viewingCustomer.customer.state} - {viewingCustomer.customer.pinCode}
                  </span>
                </div>
              </div>

              {/* Invoice History */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Customer Invoices ({viewingCustomer.invoices.length})
                  </h4>
                  {onCreateInvoiceForCustomer && (
                    <button
                      onClick={() => {
                        const id = viewingCustomer.customer.id;
                        setViewingCustomer(null);
                        onCreateInvoiceForCustomer(id);
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      + Create Invoice for this Customer
                    </button>
                  )}
                </div>

                {viewingCustomer.invoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="py-2 px-3">Invoice #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingCustomer.invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                              {formatINR(inv.grandTotal)}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[11px] font-semibold text-slate-700">
                                {inv.paymentStatus}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {onViewInvoice && (
                                <button
                                  onClick={() => {
                                    setViewingCustomer(null);
                                    onViewInvoice(inv);
                                  }}
                                  className="text-blue-600 hover:underline text-[11px] font-medium"
                                >
                                  View Invoice
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No invoices generated yet for this client.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        title="Delete Customer Record"
        message={`Are you sure you want to delete customer '${customerToDelete?.name}'? This action cannot be undone.`}
        confirmLabel="Delete Customer"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
};
