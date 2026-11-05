import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  FilePlus2,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Business } from '../types/index.ts';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'create-invoice'
  | 'invoices'
  | 'payments'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  business: Business | null;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  business,
  onLogout,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'create-invoice', label: 'Create Invoice', icon: FilePlus2 },
    { id: 'invoices', label: 'All Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Business Settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-['Outfit'] text-sm font-bold text-white truncate tracking-tight">
              {business?.name || 'YATHIN ENTERPRISES'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">GST Active · {business?.gstin || '29AABCY1234F1Z5'}</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
              </button>
            );
          })}
        </div>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-900/60">
          <div className="px-3 py-2 mb-1 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-blue-400">
              YS
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-200 truncate">Yathin S.</div>
              <div className="text-[10px] text-slate-400 truncate">demo@yathinenterprises.in</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
