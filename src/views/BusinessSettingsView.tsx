import React, { useState, useEffect } from 'react';
import {
  Building2,
  Check,
  Save,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  Database,
  CheckCircle2,
  Copy,
  RefreshCw,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import { Business, INDIAN_STATES } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import {
  getSupabaseCredentials,
  isSupabaseConfigured,
  configureSupabase,
  testSupabaseConnection,
  clearSupabaseConfig
} from '../services/supabaseClient.ts';

interface BusinessSettingsViewProps {
  business: Business | null;
  onBusinessUpdated: (updated: Business) => void;
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  business,
  onBusinessUpdated
}) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        city: business.city,
        state: business.state,
        pinCode: business.pinCode,
        gstin: business.gstin,
        invoicePrefix: business.invoicePrefix,
        defaultPaymentTerms: business.defaultPaymentTerms,
        upiId: business.upiId,
        bankDetails: { ...business.bankDetails }
      });
    }

    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseKey(creds.anonKey);
    setIsConfigured(isSupabaseConfigured());
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.business.update(formData);
      success(res.message);
      onBusinessUpdated(res.business);
    } catch (err: any) {
      error(err.message || 'Failed to update business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      const res = await api.business.resetDemo();
      success(res.message);
      onBusinessUpdated(res.business);
      setShowResetConfirm(false);
      window.location.reload();
    } catch (err: any) {
      error(err.message || 'Failed to reset demo database');
      setShowResetConfirm(false);
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    const res = configureSupabase(supabaseUrl, supabaseKey);
    if (res.success) {
      success(res.message);
      setIsConfigured(isSupabaseConfigured());
    } else {
      error(res.message);
    }
  };

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    try {
      const res = await testSupabaseConnection();
      if (res.success) {
        success(res.message);
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncingData(true);
    try {
      const res = await api.business.syncAllToSupabase();
      success(res.message);
    } catch (err: any) {
      error(err.message || 'Failed to sync local data to Supabase');
    } finally {
      setSyncingData(false);
    }
  };

  const handleClearSupabase = () => {
    clearSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsConfigured(false);
    success('Supabase configuration reset to local mode.');
  };

  const sqlCode = `-- ==============================================================================
-- INVOX SME - PostgreSQL Database Schema & Migration for Supabase
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to: SQL Editor -> New Query
-- 3. Paste this ENTIRE script and click "RUN" (green button)
-- 4. Open Table Editor -> Customers / Products to see all your records instantly!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if recreating to ensure clean state
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;

-- 1. BUSINESSES TABLE
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    state TEXT NOT NULL DEFAULT 'Karnataka',
    state_code TEXT NOT NULL DEFAULT '29',
    pin_code TEXT DEFAULT '560058',
    gstin TEXT,
    invoice_prefix TEXT DEFAULT 'YE-2026-',
    default_payment_terms TEXT DEFAULT 'Payment due within 15 days of invoice. 18% p.a. interest applicable on delayed settlement.',
    bank_details JSONB DEFAULT '{"bankName": "HDFC Bank Ltd", "accountNumber": "50200012345678", "ifscCode": "HDFC0001234", "branchName": "Peenya Industrial Branch, Bengaluru", "accountHolderName": "YATHIN ENTERPRISES"}'::jsonb,
    upi_id TEXT DEFAULT 'yathinenterprises@hdfcbank',
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CUSTOMERS TABLE
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    business_name TEXT,
    email TEXT,
    phone TEXT,
    gstin TEXT,
    billing_address TEXT,
    city TEXT,
    state TEXT NOT NULL DEFAULT 'Karnataka',
    pin_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCTS TABLE
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'Pieces',
    min_stock_alert NUMERIC(10, 2) DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. INVOICES TABLE
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + 15),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID',
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INVOICE ITEMS TABLE
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    taxable_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PAYMENTS TABLE
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_number TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. INVENTORY TRANSACTIONS TABLE
CREATE TABLE public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    previous_stock NUMERIC(10, 2) NOT NULL,
    new_stock NUMERIC(10, 2) NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on businesses" ON public.businesses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoice_items" ON public.invoice_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payments" ON public.payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_transactions" ON public.inventory_transactions FOR ALL TO public USING (true) WITH CHECK (true);

-- SEED 1 BUSINESS, 10 CUSTOMERS, 15 PRODUCTS
INSERT INTO public.businesses (id, name, email, phone, address, city, state, state_code, pin_code, gstin, invoice_prefix, upi_id)
VALUES ('a0000000-0000-0000-0000-000000000001', 'YATHIN ENTERPRISES', 'contact@yathinenterprises.in', '+91 98765 43210', '#42/A, Peenya Industrial Area', 'Bengaluru', 'Karnataka', '29', '560058', '29AABCY1234F1Z5', 'YE-2026-', 'yathinenterprises@hdfcbank');

INSERT INTO public.customers (id, business_id, customer_id, name, business_name, email, phone, gstin, billing_address, city, state, pin_code) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CUST-001', 'Rajesh Kumar', 'Apex Precision Tools Pvt Ltd', 'rajesh@apextools.co.in', '+91 98450 11223', '29AABCA1234F1ZP', 'Plot 18, Phase 1, Electronic City', 'Bengaluru', 'Karnataka', '560100'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CUST-002', 'Amitabh Sharma', 'Sahyadri Engineering Works', 'accounts@sahyadriengg.com', '+91 98220 44556', '27AAACS5678G1ZQ', 'Sector 7, MIDC, Bhosari', 'Pune', 'Maharashtra', '411026'),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'CUST-003', 'K. Senthil Nathan', 'Chola Automations & Controls', 'senthil@cholaauto.in', '+91 94440 33445', '33AABCC9012H1ZR', '45, Guindy Industrial Estate', 'Chennai', 'Tamil Nadu', '600032'),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CUST-004', 'Priya Narayanan', 'Innovatech Systems LLP', 'finance@innovatech.org', '+91 98800 66778', '29AAACI3456J1ZS', '7th Cross, Indiranagar', 'Bengaluru', 'Karnataka', '560038'),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'CUST-005', 'Venkatesh Rao', 'Deccan Power Equipments', 'vrao@deccanpower.co.in', '+91 94900 88990', '36AABCD7890K1ZT', 'IDA Balanagar', 'Hyderabad', 'Telangana', '500037'),
('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'CUST-006', 'Mohit Goel', 'Capital Machinery & Spares', 'mgoel@capitalmach.com', '+91 98110 22334', '07AAACG1122L1ZU', 'Okhla Industrial Area Phase II', 'New Delhi', 'Delhi', '110020'),
('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'CUST-007', 'Suresh Bhat', 'Mangalore Coastal Tech Ltd', 'sbhat@coastaltech.net', '+91 94801 55667', '29AAACM2233M1ZV', 'Baikampady Industrial Area', 'Mangaluru', 'Karnataka', '575011'),
('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'CUST-008', 'Pradeep Joshi', 'Maratha Agro Industries', 'pjoshi@marathaagro.in', '+91 98900 77889', '27AAACM3344N1ZW', 'MIDC Ambad', 'Nashik', 'Maharashtra', '422010'),
('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'CUST-009', 'Rameshwaram Reddy', 'Rayalaseema Fabrications', 'rreddy@rayalafab.com', '+91 94402 11223', '37AAACR4455P1ZX', 'Auto Nagar', 'Vijayawada', 'Andhra Pradesh', '520007'),
('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'CUST-010', 'Sunil Patel', 'Gujarat Precision Bearings', 'spatel@gujaratbearings.com', '+91 98250 33221', '24AAACG5566Q1ZY', 'Makarpura GIDC', 'Vadodara', 'Gujarat', '390010');

INSERT INTO public.products (id, business_id, product_id, name, sku, category, description, selling_price, purchase_price, gst_rate, stock_quantity, unit, min_stock_alert) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'PRD-101', 'Industrial Three-Phase Motor 5HP', 'MOT-3P-5HP', 'Motors & Drives', 'Heavy duty 5HP induction motor', 18500.00, 14200.00, 18.00, 24, 'NOS', 5),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PRD-102', 'Digital VFD Controller 7.5kW', 'VFD-DIG-7KW', 'Automation & Controls', 'Variable frequency drive', 24800.00, 19500.00, 18.00, 16, 'NOS', 4),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'PRD-103', 'Hydraulic Directional Control Valve', 'HYD-DCV-04', 'Hydraulics', '4-way solenoid valve', 9400.00, 7100.00, 18.00, 32, 'NOS', 8),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'PRD-104', 'Heavy Duty Deep Groove Ball Bearing 6312-2RS', 'BRG-6312-2RS', 'Mechanical Hardware', 'Precision chrome steel bearing', 1250.00, 890.00, 18.00, 180, 'Pieces', 30),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'PRD-105', 'Solid Carbide End Mill Cutter 12mm', 'CUT-EM-12MM', 'Tooling & Cutters', '4-flute solid carbide cutter', 1850.00, 1320.00, 18.00, 65, 'Pieces', 15),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'PRD-106', 'High-Pressure Pneumatic Cylinder 50x200', 'PNE-CYL-50X200', 'Pneumatics', 'Double-acting cylinder', 4200.00, 3100.00, 18.00, 42, 'NOS', 10),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'PRD-107', 'Digital Vernier Caliper 0-200mm IP67', 'MET-CAL-200', 'Inspection & Metrology', 'Stainless steel digital caliper', 3450.00, 2600.00, 18.00, 28, 'Pieces', 5),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'PRD-108', 'Industrial Planetary Gearbox 1:10 Ratio', 'GBX-PLN-10', 'Mechanical Hardware', 'Low backlash gear reducer', 15600.00, 12100.00, 18.00, 12, 'NOS', 3),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'PRD-109', 'Programmable Logic Controller CPU (14 I/O)', 'PLC-CPU-14IO', 'Automation & Controls', 'Compact programmable controller', 14200.00, 10800.00, 18.00, 19, 'NOS', 5),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'PRD-110', 'Synthetic High-Temp Gear Lubricant 20L', 'OIL-SYN-20L', 'Consumables & Fluids', 'ISO VG 320 synthetic oil', 8600.00, 6800.00, 18.00, 35, 'Buckets', 8),
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'PRD-111', 'Industrial Solenoid Valve 24V DC 1/2 Inch', 'VLV-SOL-24V-05', 'Pneumatics', '2-port normally closed valve', 2100.00, 1550.00, 18.00, 78, 'Pieces', 15),
('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'PRD-112', 'Linear Motion Guide Rail & Carriage 25mm', 'LM-RAIL-25MM', 'Mechanical Hardware', 'Guide rail set 1000mm length', 6800.00, 5200.00, 18.00, 22, 'Sets', 6),
('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'PRD-113', 'Temperature Transmitter RTD PT100 (4-20mA)', 'SEN-TMP-PT100', 'Sensors & Transducers', 'Configurable temperature transmitter', 2750.00, 1950.00, 18.00, 4, 'Pieces', 10),
('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'PRD-114', 'Laser Photoelectric Proximity Sensor M18', 'SEN-LSR-M18', 'Sensors & Transducers', '10m detection range', 3800.00, 2850.00, 18.00, 3, 'Pieces', 8),
('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'PRD-115', 'Industrial Flexible Jaw Coupling D65', 'CPL-JAW-D65', 'Mechanical Hardware', 'Flexible jaw coupling', 1650.00, 1150.00, 18.00, 55, 'Pieces', 12);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    success('SQL migration script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-slate-900">
            Business &amp; Enterprise Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal company details, GSTIN, invoice sequence prefix, bank accounts, and Supabase cloud database
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/download-zip"
            download="invox-sme-billing-system.zip"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer font-['Outfit']"
            title="Download full project source code archive (.zip)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Project ZIP</span>
          </a>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Database</span>
          </button>
        </div>
      </div>

      {/* Supabase PostgreSQL Cloud Database Integration Section */}
      <div className="bg-gradient-to-br from-emerald-900/5 via-slate-50 to-teal-900/5 p-6 rounded-xl border border-emerald-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-['Outfit'] font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Supabase PostgreSQL Integration</span>
                {isConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active / Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Local Fallback Mode
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Connect your live Supabase project to persist customers, products, invoices, and payments in PostgreSQL.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View SQL Schema</span>
          </button>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                Publishable Anon Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={e => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer font-['Outfit']"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Credentials</span>
              </button>

              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={testingConnection || !supabaseUrl || !supabaseKey}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClearSupabase}
                  className="px-3 py-2 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer"
                >
                  Clear Config
                </button>
              )}
            </div>

            {isConfigured && (
              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={syncingData}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{syncingData ? 'Uploading Records...' : 'Upload Demo Records to Supabase'}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="font-['Outfit'] font-bold text-sm text-slate-900">Legal Enterprise Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Business Name *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">GSTIN (15 Digits)</label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="29AABCY1234F1Z5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Email Address</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Phone Number</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Registered Address</label>
            <textarea
              rows={2}
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">State *</label>
              <select
                value={formData.state || 'Karnataka'}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">PIN Code</label>
              <input
                type="text"
                value={formData.pinCode || ''}
                onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Invoice Preferences */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="font-['Outfit'] font-bold text-sm text-slate-900">Invoice Series &amp; Payment Terms</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Invoice Number Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix || ''}
                onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none"
                placeholder="YE-2026-"
              />
              <p className="text-[11px] text-slate-400 mt-1">e.g. YE-2026- will generate YE-2026-001, YE-2026-002</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">UPI ID for Quick QR Payment</label>
              <input
                type="text"
                value={formData.upiId || ''}
                onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none"
                placeholder="yathinenterprises@hdfcbank"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Default Terms &amp; Conditions</label>
            <textarea
              rows={2}
              value={formData.defaultPaymentTerms || ''}
              onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h2 className="font-['Outfit'] font-bold text-sm text-slate-900">Settlement Bank Account Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Bank Name</label>
              <input
                type="text"
                value={formData.bankDetails?.bankName || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails!, bankName: e.target.value }
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Account Number</label>
              <input
                type="text"
                value={formData.bankDetails?.accountNumber || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails!, accountNumber: e.target.value }
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">IFSC Code</label>
              <input
                type="text"
                value={formData.bankDetails?.ifscCode || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails!, ifscCode: e.target.value.toUpperCase() }
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">Branch Name</label>
              <input
                type="text"
                value={formData.bankDetails?.branchName || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails!, branchName: e.target.value }
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer font-['Outfit']"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Settings...' : 'Save Business Settings'}</span>
          </button>
        </div>
      </form>

      {/* SQL Migration Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-['Outfit'] font-bold text-sm text-slate-900">
                    Supabase SQL Schema &amp; Migration Script
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Execute in Supabase Dashboard &gt; SQL Editor to provision all 8 tables and RLS security policies
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 text-slate-200 overflow-y-auto flex-1 font-mono text-xs leading-relaxed select-all">
              <pre className="whitespace-pre">{sqlCode}</pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium font-['Outfit']"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Entire SQL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Entire Database to Pristine Demo State?"
        message="This will restore all 10 customers, 15 products, 10 invoices, payments, and inventory audit transactions to their original demonstration state. Perfect for college viva presentations!"
        confirmLabel="Reset Everything to Demo"
        isDestructive={true}
        onConfirm={handleResetDemoData}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
