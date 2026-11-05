import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { TopNavbar } from './components/TopNavbar.tsx';
import { AuthView } from './views/AuthView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { CustomersView } from './views/CustomersView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { InventoryView } from './views/InventoryView.tsx';
import { CreateInvoiceView } from './views/CreateInvoiceView.tsx';
import { InvoicesListView } from './views/InvoicesListView.tsx';
import { PaymentsView } from './views/PaymentsView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { BusinessSettingsView } from './views/BusinessSettingsView.tsx';
import { InvoicePreviewModal } from './components/InvoicePreviewModal.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { api } from './services/api.ts';
import { User, Business, Invoice } from './types/index.ts';

function AppContent() {
  const { error } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cross-view state & modals
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);

  // Check existing session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.auth.getMe();
        setUser(res.user);
        setBusiness(res.business);
      } catch {
        setUser(null);
        setBusiness(null);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();

    // Listen for unauthorized events
    const handleUnauthorized = () => {
      setUser(null);
      setBusiness(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Fetch background invoice list for search and notifications
  const refreshInvoices = async () => {
    if (!user) return;
    try {
      const res = await api.invoices.getAll();
      setAllInvoices(res.invoices);
    } catch (err) {
      console.error('Failed to load global invoices:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshInvoices();
    }
  }, [user, currentTab]);

  const handleAuthSuccess = (data: { user: User; business: Business }) => {
    setUser(data.user);
    setBusiness(data.business);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setBusiness(null);
  };

  // When invoice created from CreateInvoiceView
  const handleInvoiceCreated = (invoice: Invoice) => {
    setAllInvoices(prev => [invoice, ...prev]);
    setSelectedInvoiceForModal(invoice);
    setCurrentTab('invoices');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading Invox SME Platform...</p>
        </div>
      </div>
    );
  }

  if (!user || !business) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          setPreselectedCustomerId(null);
        }}
        business={business}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <TopNavbar
          business={business}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={tab => {
            setCurrentTab(tab);
            setPreselectedCustomerId(null);
          }}
          invoices={allInvoices}
          onSelectInvoice={inv => {
            setSelectedInvoiceForModal(inv);
            setCurrentTab('invoices');
          }}
        />

        {/* View Content Port */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onViewInvoice={inv => {
                setSelectedInvoiceForModal(inv);
                setCurrentTab('invoices');
              }}
              onRecordPayment={inv => {
                setPayingInvoice(inv);
              }}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              onViewInvoice={inv => {
                setSelectedInvoiceForModal(inv);
                setCurrentTab('invoices');
              }}
              onCreateInvoiceForCustomer={customerId => {
                setPreselectedCustomerId(customerId);
                setCurrentTab('create-invoice');
              }}
            />
          )}

          {currentTab === 'products' && <ProductsView />}

          {currentTab === 'inventory' && <InventoryView />}

          {currentTab === 'create-invoice' && (
            <CreateInvoiceView
              business={business}
              onNavigate={setCurrentTab}
              onInvoiceCreated={handleInvoiceCreated}
              preselectedCustomerId={preselectedCustomerId}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesListView
              business={business}
              onNavigate={setCurrentTab}
              selectedInvoiceToView={selectedInvoiceForModal}
              onClearSelectedInvoice={() => setSelectedInvoiceForModal(null)}
            />
          )}

          {currentTab === 'payments' && <PaymentsView onNavigate={setCurrentTab} />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'settings' && (
            <BusinessSettingsView
              business={business}
              onBusinessUpdated={updated => setBusiness(updated)}
            />
          )}
        </main>
      </div>

      {/* Global Invoice Preview Modal */}
      {selectedInvoiceForModal && business && (
        <InvoicePreviewModal
          invoice={selectedInvoiceForModal}
          business={business}
          onClose={() => setSelectedInvoiceForModal(null)}
          onRecordPayment={inv => {
            setSelectedInvoiceForModal(null);
            setPayingInvoice(inv);
          }}
        />
      )}

      {/* Global Payment Modal */}
      {payingInvoice && (
        <PaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSuccess={() => {
            refreshInvoices();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
