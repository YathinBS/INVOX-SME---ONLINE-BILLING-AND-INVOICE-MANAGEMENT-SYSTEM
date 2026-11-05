import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  Building,
  User,
  CheckCircle2,
  X,
  Database,
  Download
} from 'lucide-react';
import { Business, Invoice } from '../types/index.ts';
import { NavTab } from './Sidebar.tsx';
import { formatINR } from '../services/currency.ts';
import { isSupabaseConfigured } from '../services/supabaseClient.ts';

interface TopNavbarProps {
  business: Business | null;
  onOpenMobileMenu: () => void;
  onNavigate: (tab: NavTab) => void;
  invoices: Invoice[];
  onSelectInvoice?: (invoice: Invoice) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  business,
  onOpenMobileMenu,
  onNavigate,
  invoices,
  onSelectInvoice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Overdue and unpaid invoices alerts
  const pendingInvoices = invoices.filter(i => i.balanceAmount > 0).slice(0, 5);

  // Search results
  const filteredInvoices = searchQuery.trim()
    ? invoices.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Hamburger & Business Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="font-['Outfit'] font-bold text-slate-900 text-sm tracking-tight">{business?.name || 'YATHIN ENTERPRISES'}</span>
            <span className="text-slate-300">/</span>
            <span className="font-['Outfit'] text-slate-600 font-medium">Billing &amp; Invoice Portal</span>
          </div>

          {/* Database Connection Status Badge */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            title="Click to view or test database connection"
            className="hidden md:inline-flex items-center transition-all cursor-pointer font-['Outfit']"
          >
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-2xs hover:bg-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Supabase Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold hover:bg-slate-200">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Local Mode (Connect Supabase)</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Center: Search Bar with Live Popover */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search invoice number, client..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search dropdown */}
        {showSearchResults && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in duration-100">
            <div className="p-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Matching Invoices ({filteredInvoices.length})
            </div>
            {filteredInvoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      if (onSelectInvoice) onSelectInvoice(inv);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{inv.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 tabular-nums">{formatINR(inv.grandTotal)}</div>
                      <div className="text-[10px] text-slate-400">{inv.paymentStatus}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching invoices found for "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Action, Alerts & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <a
          href="/api/download-zip"
          download="invox-sme-billing-system.zip"
          title="Download complete project source code (.zip)"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 font-['Outfit'] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Download ZIP</span>
        </a>

        <button
          onClick={() => onNavigate('create-invoice')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Invoice</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {pendingInvoices.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Pending Receivables Alerts</span>
                <span className="text-[10px] text-slate-500">{pendingInvoices.length} outstanding</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {pendingInvoices.map(inv => (
                  <div key={inv.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-rose-600 font-medium tabular-nums">{formatINR(inv.balanceAmount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Due from {inv.customerName} on {inv.dueDate}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('invoices');
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View all in All Invoices →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-700 hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
};
