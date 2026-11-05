-- ==============================================================================
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
    bank_details JSONB DEFAULT '{
        "bankName": "HDFC Bank Ltd",
        "accountNumber": "50200012345678",
        "ifscCode": "HDFC0001234",
        "branchName": "Peenya Industrial Branch, Bengaluru",
        "accountHolderName": "YATHIN ENTERPRISES"
    }'::jsonb,
    upi_id TEXT DEFAULT 'yathinenterprises@hdfcbank',
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE (Linked with auth.users)
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

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- We enable RLS and set policies that allow full access for the client anon key
-- AND authenticated dashboard sessions so records are immediately visible in Table Editor!

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

-- ==============================================================================
-- 10. SEED DATA: 1 BUSINESS, 10 CUSTOMERS, 15 PRODUCTS, 10 INVOICES
-- ==============================================================================

-- 1. Insert Yathin Enterprises
INSERT INTO public.businesses (
    id, name, email, phone, address, city, state, state_code, pin_code, gstin, invoice_prefix, upi_id
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'YATHIN ENTERPRISES',
    'contact@yathinenterprises.in',
    '+91 98765 43210',
    '#42/A, 2nd Cross, Peenya Industrial Area 2nd Stage',
    'Bengaluru',
    'Karnataka',
    '29',
    '560058',
    '29AABCY1234F1Z5',
    'YE-2026-',
    'yathinenterprises@hdfcbank'
);

-- 2. Insert 10 Customers
INSERT INTO public.customers (id, business_id, customer_id, name, business_name, email, phone, gstin, billing_address, city, state, pin_code) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CUST-001', 'Rajesh Kumar', 'Apex Precision Tools Pvt Ltd', 'rajesh@apextools.co.in', '+91 98450 11223', '29AABCA1234F1ZP', 'Plot 18, Phase 1, Electronic City', 'Bengaluru', 'Karnataka', '560100'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CUST-002', 'Amitabh Sharma', 'Sahyadri Engineering Works', 'accounts@sahyadriengg.com', '+91 98220 44556', '27AAACS5678G1ZQ', 'Sector 7, MIDC Industrial Area, Bhosari', 'Pune', 'Maharashtra', '411026'),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'CUST-003', 'K. Senthil Nathan', 'Chola Automations & Controls', 'senthil@cholaauto.in', '+91 94440 33445', '33AABCC9012H1ZR', '45, SIDCO Industrial Estate, Guindy', 'Chennai', 'Tamil Nadu', '600032'),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CUST-004', 'Priya Narayanan', 'Innovatech Systems LLP', 'finance@innovatech.org', '+91 98800 66778', '29AAACI3456J1ZS', '7th Cross, Indiranagar 1st Stage', 'Bengaluru', 'Karnataka', '560038'),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'CUST-005', 'Venkatesh Rao', 'Deccan Power Equipments', 'vrao@deccanpower.co.in', '+91 94900 88990', '36AABCD7890K1ZT', 'B-14, Industrial Development Area, Balanagar', 'Hyderabad', 'Telangana', '500037'),
('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'CUST-006', 'Mohit Goel', 'Capital Machinery & Spares', 'mgoel@capitalmach.com', '+91 98110 22334', '07AAACG1122L1ZU', 'A-22, Okhla Industrial Area Phase II', 'New Delhi', 'Delhi', '110020'),
('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'CUST-007', 'Suresh Bhat', 'Mangalore Coastal Tech Ltd', 'sbhat@coastaltech.net', '+91 94801 55667', '29AAACM2233M1ZV', 'Baikampady Industrial Area', 'Mangaluru', 'Karnataka', '575011'),
('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'CUST-008', 'Pradeep Joshi', 'Maratha Agro Industries', 'pjoshi@marathaagro.in', '+91 98900 77889', '27AAACM3344N1ZW', 'MIDC Ambad', 'Nashik', 'Maharashtra', '422010'),
('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'CUST-009', 'Rameshwaram Reddy', 'Rayalaseema Fabrications', 'rreddy@rayalafab.com', '+91 94402 11223', '37AAACR4455P1ZX', 'Industrial Estate, Auto Nagar', 'Vijayawada', 'Andhra Pradesh', '520007'),
('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'CUST-010', 'Sunil Patel', 'Gujarat Precision Bearings', 'spatel@gujaratbearings.com', '+91 98250 33221', '24AAACG5566Q1ZY', 'GIDC Industrial Estate, Makarpura', 'Vadodara', 'Gujarat', '390010');

-- 3. Insert 15 Products
INSERT INTO public.products (id, business_id, product_id, name, sku, category, description, selling_price, purchase_price, gst_rate, stock_quantity, unit, min_stock_alert) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'PRD-101', 'Industrial Three-Phase Motor 5HP', 'MOT-3P-5HP', 'Motors & Drives', 'Heavy duty 5HP 1440 RPM induction motor with IP55 protection', 18500.00, 14200.00, 18.00, 24, 'NOS', 5),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PRD-102', 'Digital VFD Controller 7.5kW', 'VFD-DIG-7KW', 'Automation & Controls', 'Variable frequency speed drive with RS485 Modbus RTU communication', 24800.00, 19500.00, 18.00, 16, 'NOS', 4),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'PRD-103', 'Hydraulic Directional Control Valve', 'HYD-DCV-04', 'Hydraulics', '4-way solenoid operated directional valve 315 bar pressure rating', 9400.00, 7100.00, 18.00, 32, 'NOS', 8),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'PRD-104', 'Heavy Duty Deep Groove Ball Bearing 6312-2RS', 'BRG-6312-2RS', 'Mechanical Hardware', 'Precision grade chrome steel bearing with dual rubber seals', 1250.00, 890.00, 18.00, 180, 'Pieces', 30),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'PRD-105', 'Solid Carbide End Mill Cutter 12mm', 'CUT-EM-12MM', 'Tooling & Cutters', '4-flute TiAlN coated solid carbide milling cutter for stainless steel', 1850.00, 1320.00, 18.00, 65, 'Pieces', 15),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'PRD-106', 'High-Pressure Pneumatic Cylinder 50x200', 'PNE-CYL-50X200', 'Pneumatics', 'Double-acting ISO standard pneumatic air cylinder with magnetic ring', 4200.00, 3100.00, 18.00, 42, 'NOS', 10),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'PRD-107', 'Digital Vernier Caliper 0-200mm IP67', 'MET-CAL-200', 'Inspection & Metrology', 'Stainless steel digital measuring caliper with LCD display', 3450.00, 2600.00, 18.00, 28, 'Pieces', 5),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'PRD-108', 'Industrial Planetary Gearbox 1:10 Ratio', 'GBX-PLN-10', 'Mechanical Hardware', 'Low backlash precision inline planetary gear reducer', 15600.00, 12100.00, 18.00, 12, 'NOS', 3),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'PRD-109', 'Programmable Logic Controller CPU (14 I/O)', 'PLC-CPU-14IO', 'Automation & Controls', 'Compact programmable controller with 8 digital inputs and 6 transistor outputs', 14200.00, 10800.00, 18.00, 19, 'NOS', 5),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'PRD-110', 'Synthetic High-Temp Gear Lubricant 20L', 'OIL-SYN-20L', 'Consumables & Fluids', 'ISO VG 320 fully synthetic EP industrial gear oil for enclosed drives', 8600.00, 6800.00, 18.00, 35, 'Buckets', 8),
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'PRD-111', 'Industrial Solenoid Valve 24V DC 1/2 Inch', 'VLV-SOL-24V-05', 'Pneumatics', '2-port normally closed brass body pilot solenoid valve', 2100.00, 1550.00, 18.00, 78, 'Pieces', 15),
('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'PRD-112', 'Linear Motion Guide Rail & Carriage 25mm', 'LM-RAIL-25MM', 'Mechanical Hardware', 'High rigidity recirculating ball linear guide rail set 1000mm length', 6800.00, 5200.00, 18.00, 22, 'Sets', 6),
('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'PRD-113', 'Temperature Transmitter RTD PT100 (4-20mA)', 'SEN-TMP-PT100', 'Sensors & Transducers', 'Head-mounted configurable 2-wire temperature sensor transmitter', 2750.00, 1950.00, 18.00, 4, 'Pieces', 10),
('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'PRD-114', 'Laser Photoelectric Proximity Sensor M18', 'SEN-LSR-M18', 'Sensors & Transducers', 'Polarized retroreflective laser beam sensor with 10m detection range', 3800.00, 2850.00, 18.00, 3, 'Pieces', 8),
('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'PRD-115', 'Industrial Flexible Jaw Coupling D65', 'CPL-JAW-D65', 'Mechanical Hardware', 'Curved jaw zero-backlash spider shaft coupling for servo and stepper motors', 1650.00, 1150.00, 18.00, 55, 'Pieces', 12);

-- 4. Sample Invoices
INSERT INTO public.invoices (
    id, business_id, customer_id, invoice_number, invoice_date, due_date,
    subtotal, discount, taxable_amount, cgst, sgst, igst, total_tax, grand_total, paid_amount, balance_amount, payment_status
) VALUES 
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'YE-2026-001', CURRENT_DATE - 20, CURRENT_DATE - 5, 86600.00, 2600.00, 84000.00, 7560.00, 7560.00, 0.00, 15120.00, 99120.00, 99120.00, 0.00, 'PAID'),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'YE-2026-002', CURRENT_DATE - 18, CURRENT_DATE - 3, 58400.00, 1400.00, 57000.00, 0.00, 0.00, 10260.00, 10260.00, 67260.00, 67260.00, 0.00, 'PAID'),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'YE-2026-003', CURRENT_DATE - 15, CURRENT_DATE, 71200.00, 1200.00, 70000.00, 0.00, 0.00, 12600.00, 12600.00, 82600.00, 50000.00, 32600.00, 'PARTIALLY_PAID'),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'YE-2026-004', CURRENT_DATE - 12, CURRENT_DATE + 3, 49600.00, 1600.00, 48000.00, 4320.00, 4320.00, 0.00, 8640.00, 56640.00, 56640.00, 0.00, 'PAID'),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'YE-2026-005', CURRENT_DATE - 10, CURRENT_DATE + 5, 114000.00, 4000.00, 110000.00, 0.00, 0.00, 19800.00, 19800.00, 129800.00, 0.00, 129800.00, 'UNPAID');

-- 5. Sample Payments
INSERT INTO public.payments (business_id, invoice_id, payment_number, amount, payment_method, reference_number, payment_date, notes) VALUES
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'PAY-2026-001', 99120.00, 'BANK_TRANSFER', 'HDFC-NEFT-908123', CURRENT_DATE - 10, 'Full settlement received via NEFT'),
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'PAY-2026-002', 67260.00, 'UPI', 'UPI-9841203941', CURRENT_DATE - 8, 'Settled through UPI payment'),
('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'PAY-2026-003', 50000.00, 'BANK_TRANSFER', 'ICICI-RTGS-554432', CURRENT_DATE - 5, 'Part payment received');
