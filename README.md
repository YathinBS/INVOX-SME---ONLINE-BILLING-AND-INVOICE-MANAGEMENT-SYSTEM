# INVOX SME – Online Billing & Invoice Management System

A production-grade, enterprise-ready GST Billing, Invoicing, and Warehouse Inventory Management system tailored for Small and Medium Enterprises (SMEs).

---

## 🚀 Key Features

- **GST Compliant Invoicing**:
  - Automated Intra-State (CGST + SGST) and Inter-State (IGST) tax calculation based on GSTIN state codes.
  - HSN/SAC code tracking and itemized tax breakdowns.
  - Professional print-ready and downloadable PDF tax invoice generation.
- **Permanent Database with Supabase PostgreSQL**:
  - Full PostgreSQL schema migration with Row Level Security (RLS) policies.
  - Real-time customer, product, invoice, payment, and inventory transaction synchronization.
  - Built-in local fallback mode for offline and development continuity.
- **Customer Management**:
  - Complete customer database with GSTIN, billing addresses, phone, and contact details.
  - Real-time customer purchase history, total billed revenue, and outstanding receivables.
- **Product & Inventory Management**:
  - SKU, category, purchase price, selling price, and GST percentage configuration.
  - Automatic inventory deduction upon invoice generation.
  - Low-stock visual alerts and audit log of all stock movements.
- **Accounts Receivable & Payment Collection**:
  - Multi-method payment recording (Cash, UPI, Credit/Debit Card, NEFT/RTGS Bank Transfer).
  - Partial and full payment settlement tracking.
  - Automated invoice status updates (`PAID`, `PARTIALLY_PAID`, `UNPAID`, `OVERDUE`).
  - Pending dues and overdue payment alerts.
- **Executive Analytics Dashboard**:
  - Real-time revenue, total billing, cash collected, and outstanding receivables metrics.
  - Monthly Invoiced vs. Collected comparison bar charts using Recharts.
  - Top 5 performing industrial products by revenue and units sold.
  - Recent SME customer invoices and payment ledger.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Database**: Supabase PostgreSQL (or local fallback DB)
- **PDF Generation**: HTML5 Canvas & jsPDF print engine
- **Build Tool**: Vite

---

## 📁 Project Structure

```text
├── data/
│   └── db.json               # Seed demo database (customers, products, invoices, payments)
├── public/
│   └── invox-sme-project.zip # Packaged project source archive
├── src/
│   ├── components/           # TopNavbar, Sidebar, StatusBadge, ConfirmDialog, PaymentModal, etc.
│   ├── server/               # Express backend routes & authentication middleware
│   │   ├── routes/           # auth, customer, product, inventory, invoice, payment, report, business
│   │   ├── auth.ts           # JWT authentication & session handling
│   │   └── db.ts             # Local database manager
│   ├── services/             # Centralized API service, currency formatting, PDF generator, Supabase client
│   ├── types/                # Strict TypeScript interfaces & models
│   ├── views/                # Dashboard, Invoices, CreateInvoice, Customers, Products, Inventory, Reports, Settings
│   ├── App.tsx               # Main application controller & routing
│   └── main.tsx              # React DOM entry point
├── supabase/
│   └── schema.sql            # Complete PostgreSQL DDL, RLS policies, trigger functions & seed data
├── index.html                # HTML entry point
├── package.json              # Project dependencies & scripts
├── server.ts                 # Full-stack Node.js server entry point with Vite middleware
├── tsconfig.json             # TypeScript compiler configuration
└── vite.config.ts            # Vite build configuration
```

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v18 or newer)
- npm or bun

### 2. Installation
```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd invox-sme

# Install dependencies
npm install
```

### 3. Environment Variables (Optional for Supabase)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Supabase credentials (or configure them directly via the in-app **Settings** UI):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🗄️ Supabase PostgreSQL Setup

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** -> **New Query**.
3. Copy and paste the entire contents of `supabase/schema.sql`.
4. Click **Run**.
5. All 8 tables (`businesses`, `profiles`, `customers`, `products`, `invoices`, `invoice_items`, `payments`, `inventory_transactions`) will be created with Row Level Security (RLS) policies and pre-seeded demo records!

---

## 👤 Default Demo Credentials
- **Email**: `yathinyathi155@gmail.com` or `demo@yathinenterprises.in`
- **Password**: `Password@123`
