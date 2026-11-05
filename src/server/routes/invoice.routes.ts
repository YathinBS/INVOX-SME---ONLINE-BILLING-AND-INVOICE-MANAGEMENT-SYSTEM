import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { Invoice, InvoiceItem, InventoryTransaction, PaymentStatus } from '../../types/index.ts';

const router = Router();
router.use(authMiddleware);

// Helper function to format 2-decimal numbers
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Helper: Calculate whether a transaction is Inter-State
function isInterStateTransaction(businessState: string, customerState: string): boolean {
  if (!businessState || !customerState) return false;
  return businessState.trim().toLowerCase() !== customerState.trim().toLowerCase();
}

// Helper: generate next invoice number
function getNextInvoiceNumber(businessId: string): string {
  const db = getDatabase();
  const business = db.businesses.find(b => b.id === businessId);
  const prefix = business?.invoicePrefix || 'INV-2026-';
  const existingInvoices = db.invoices.filter(i => i.businessId === businessId);

  // Find max sequential number
  let maxSeq = 0;
  for (const inv of existingInvoices) {
    if (inv.invoiceNumber.startsWith(prefix)) {
      const numStr = inv.invoiceNumber.substring(prefix.length);
      const parsed = parseInt(numStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

// GET next available invoice number
router.get('/next-number', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const nextNumber = getNextInvoiceNumber(businessId);
  res.json({ success: true, nextNumber });
});

// GET all invoices with filters
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const status = (req.query.status as string || '').toUpperCase();
  const search = (req.query.search as string || '').toLowerCase().trim();
  const customerId = req.query.customerId as string;

  const db = getDatabase();
  let invoices = db.invoices.filter(i => i.businessId === businessId);

  // Check for auto-overdue updates based on current date
  const todayStr = new Date().toISOString().split('T')[0];
  let dbModified = false;
  invoices.forEach(inv => {
    if (inv.paymentStatus === 'UNPAID' && inv.dueDate < todayStr && inv.paidAmount === 0) {
      inv.paymentStatus = 'OVERDUE';
      dbModified = true;
    }
  });
  if (dbModified) {
    saveDatabase(db);
  }

  if (customerId) {
    invoices = invoices.filter(i => i.customerId === customerId);
  }

  if (status && status !== 'ALL') {
    invoices = invoices.filter(i => i.paymentStatus === status);
  }

  if (search) {
    invoices = invoices.filter(
      i =>
        i.invoiceNumber.toLowerCase().includes(search) ||
        i.customerName.toLowerCase().includes(search) ||
        (i.customerBusinessName && i.customerBusinessName.toLowerCase().includes(search)) ||
        (i.customerGstin && i.customerGstin.toLowerCase().includes(search)) ||
        i.customerCity.toLowerCase().includes(search)
    );
  }

  // Sort by invoice date descending, then creation descending
  invoices.sort((a, b) => {
    const dDiff = new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    if (dDiff !== 0) return dDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ success: true, invoices });
});

// GET single invoice by ID
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const invoice = db.invoices.find(i => (i.id === id || i.invoiceNumber === id) && i.businessId === businessId);
  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found.' });
    return;
  }

  const business = db.businesses.find(b => b.id === businessId);
  const payments = db.payments.filter(p => p.invoiceId === invoice.id && p.businessId === businessId);

  res.json({
    success: true,
    invoice,
    business,
    payments
  });
});

// POST Create new invoice (with complete GST & stock deduction safeguards)
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const db = getDatabase();
  const business = db.businesses.find(b => b.id === businessId);

  if (!business) {
    res.status(400).json({ success: false, message: 'Business record not found.' });
    return;
  }

  const {
    invoiceNumber: customInvoiceNumber,
    customerId,
    invoiceDate = new Date().toISOString().split('T')[0],
    dueDate,
    items = [],
    notes = '',
    termsAndConditions = business.defaultPaymentTerms
  } = req.body;

  if (!customerId) {
    res.status(400).json({ success: false, message: 'Customer is required.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'At least one line item is required.' });
    return;
  }

  const customer = db.customers.find(c => c.id === customerId && c.businessId === businessId);
  if (!customer) {
    res.status(400).json({ success: false, message: 'Selected customer does not exist.' });
    return;
  }

  // Validate stock for all products first before making any changes!
  for (const item of items) {
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: `Invalid quantity for item ${item.productName || item.productId}.` });
      return;
    }

    const prod = db.products.find(p => p.id === item.productId && p.businessId === businessId);
    if (!prod) {
      res.status(400).json({ success: false, message: `Product ${item.productName || item.productId} not found.` });
      return;
    }

    if (prod.availableStock < qty) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock for '${prod.name}'. Requested: ${qty}, Available: ${prod.availableStock} ${prod.unit}.`
      });
      return;
    }
  }

  const invoiceNumber = customInvoiceNumber || getNextInvoiceNumber(businessId);
  const isInterState = isInterStateTransaction(business.state, customer.state);

  // Calculate items with GST breakdown
  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const processedItems: InvoiceItem[] = items.map((rawItem: any, index: number) => {
    const prod = db.products.find(p => p.id === rawItem.productId && p.businessId === businessId)!;
    const quantity = Number(rawItem.quantity);
    const unitPrice = Number(rawItem.unitPrice !== undefined ? rawItem.unitPrice : prod.sellingPrice);
    const discountPercentage = Number(rawItem.discountPercentage || 0);

    const lineGross = quantity * unitPrice;
    let lineDiscount = Number(rawItem.discountAmount || 0);
    if (discountPercentage > 0 && !lineDiscount) {
      lineDiscount = (lineGross * discountPercentage) / 100;
    }
    lineDiscount = round2(lineDiscount);
    const lineTaxable = round2(lineGross - lineDiscount);

    const gstRate = Number(rawItem.gstPercentage !== undefined ? rawItem.gstPercentage : prod.gstPercentage);

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isInterState) {
      // Inter-state: All tax is IGST
      igstRate = gstRate;
      igstAmount = round2((lineTaxable * igstRate) / 100);
    } else {
      // Intra-state: Half CGST, Half SGST
      cgstRate = gstRate / 2;
      cgstAmount = round2((lineTaxable * cgstRate) / 100);
      sgstRate = gstRate / 2;
      sgstAmount = round2((lineTaxable * sgstRate) / 100);
    }

    const lineTotal = round2(lineTaxable + cgstAmount + sgstAmount + igstAmount);

    subtotal += lineGross;
    discountTotal += lineDiscount;
    taxableAmount += lineTaxable;
    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      id: `item_${Date.now()}_${index}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      hsnCode: prod.hsnCode,
      quantity,
      unit: prod.unit,
      unitPrice,
      discountPercentage,
      discountAmount: lineDiscount,
      taxableAmount: lineTaxable,
      gstPercentage: gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount: lineTotal
    };
  });

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxableAmount = round2(taxableAmount);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = round2(rawGrandTotal);
  const roundOff = round2(grandTotal - rawGrandTotal);

  // Calculate default due date (15 days if not provided)
  let calculatedDueDate = dueDate;
  if (!calculatedDueDate) {
    const invDateObj = new Date(invoiceDate);
    invDateObj.setDate(invDateObj.getDate() + 15);
    calculatedDueDate = invDateObj.toISOString().split('T')[0];
  }

  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const newInvoice: Invoice = {
    id: invoiceId,
    businessId,
    invoiceNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerBusinessName: customer.businessName,
    customerGstin: customer.gstin,
    customerAddress: customer.billingAddress,
    customerCity: customer.city,
    customerState: customer.state,
    customerPinCode: customer.pinCode,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    invoiceDate,
    dueDate: calculatedDueDate,
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
    termsAndConditions,
    items: processedItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Deduct inventory and log transactions safely
  processedItems.forEach(item => {
    const prod = db.products.find(p => p.id === item.productId && p.businessId === businessId)!;
    const prevStock = prod.availableStock;
    prod.availableStock = prevStock - item.quantity;

    const tx: InventoryTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      changeType: 'INVOICE_SALE',
      quantityChange: -item.quantity,
      previousStock: prevStock,
      newStock: prod.availableStock,
      referenceId: newInvoice.invoiceNumber,
      notes: `Deducted for confirmed invoice ${newInvoice.invoiceNumber}`,
      date: new Date().toISOString()
    };
    db.inventoryTransactions.unshift(tx);
  });

  db.invoices.unshift(newInvoice);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: `Invoice ${newInvoice.invoiceNumber} generated successfully.`,
    invoice: newInvoice
  });
});

// PUT Edit existing invoice
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const invIndex = db.invoices.findIndex(i => i.id === id && i.businessId === businessId);
  if (invIndex === -1) {
    res.status(404).json({ success: false, message: 'Invoice not found.' });
    return;
  }

  const existingInvoice = db.invoices[invIndex];
  const { notes, termsAndConditions, dueDate, paymentStatus } = req.body;

  // If simple metadata update (not altering items)
  if (notes !== undefined) existingInvoice.notes = notes;
  if (termsAndConditions !== undefined) existingInvoice.termsAndConditions = termsAndConditions;
  if (dueDate !== undefined) existingInvoice.dueDate = dueDate;
  if (paymentStatus !== undefined) existingInvoice.paymentStatus = paymentStatus as PaymentStatus;

  existingInvoice.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    message: 'Invoice updated successfully.',
    invoice: existingInvoice
  });
});

// DELETE / Cancel invoice (with automatic stock rollback)
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const invIndex = db.invoices.findIndex(i => i.id === id && i.businessId === businessId);
  if (invIndex === -1) {
    res.status(404).json({ success: false, message: 'Invoice not found.' });
    return;
  }

  const invoice = db.invoices[invIndex];

  // Roll back deducted stock for all items
  invoice.items.forEach(item => {
    const prod = db.products.find(p => p.id === item.productId && p.businessId === businessId);
    if (prod) {
      const prevStock = prod.availableStock;
      prod.availableStock = prevStock + item.quantity;

      const rollbackTx: InventoryTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        businessId,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        changeType: 'INVOICE_CANCEL',
        quantityChange: item.quantity,
        previousStock: prevStock,
        newStock: prod.availableStock,
        referenceId: invoice.invoiceNumber,
        notes: `Stock restored upon cancellation/deletion of invoice ${invoice.invoiceNumber}`,
        date: new Date().toISOString()
      };
      db.inventoryTransactions.unshift(rollbackTx);
    }
  });

  // Remove associated payments if any
  db.payments = db.payments.filter(p => p.invoiceId !== invoice.id);

  // Remove invoice
  db.invoices.splice(invIndex, 1);
  saveDatabase(db);

  res.json({
    success: true,
    message: `Invoice ${invoice.invoiceNumber} deleted and inventory stock restored.`
  });
});

export default router;
