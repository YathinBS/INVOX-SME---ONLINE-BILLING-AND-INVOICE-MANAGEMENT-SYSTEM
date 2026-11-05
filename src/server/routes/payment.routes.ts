import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { Payment, PaymentMethod } from '../../types/index.ts';

const router = Router();
router.use(authMiddleware);

// Helper function to format 2-decimal numbers
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// GET all payments
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const method = (req.query.method as string || '').toUpperCase();
  const search = (req.query.search as string || '').toLowerCase().trim();
  const invoiceId = req.query.invoiceId as string;

  const db = getDatabase();
  let payments = db.payments.filter(p => p.businessId === businessId);

  if (invoiceId) {
    payments = payments.filter(p => p.invoiceId === invoiceId);
  }

  if (method && method !== 'ALL') {
    payments = payments.filter(p => p.paymentMethod === method);
  }

  if (search) {
    payments = payments.filter(
      p =>
        p.invoiceNumber.toLowerCase().includes(search) ||
        p.customerName.toLowerCase().includes(search) ||
        p.referenceNumber.toLowerCase().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
    );
  }

  // Sort by payment date descending
  payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  res.json({ success: true, payments });
});

// POST Record a payment for an invoice
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const {
    invoiceId,
    amount,
    paymentMethod,
    referenceNumber = '',
    paymentDate = new Date().toISOString().split('T')[0],
    notes = ''
  } = req.body;

  if (!invoiceId || amount === undefined || !paymentMethod) {
    res.status(400).json({
      success: false,
      message: 'Invoice ID, payment amount, and payment method are required.'
    });
    return;
  }

  const payAmount = round2(Number(amount));
  if (isNaN(payAmount) || payAmount <= 0) {
    res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    return;
  }

  const validMethods: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'];
  if (!validMethods.includes(paymentMethod as PaymentMethod)) {
    res.status(400).json({
      success: false,
      message: `Invalid payment method. Allowed: ${validMethods.join(', ')}`
    });
    return;
  }

  const db = getDatabase();
  const invoice = db.invoices.find(i => i.id === invoiceId && i.businessId === businessId);

  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found.' });
    return;
  }

  if (invoice.balanceAmount <= 0) {
    res.status(400).json({
      success: false,
      message: `Invoice ${invoice.invoiceNumber} is already fully settled.`
    });
    return;
  }

  if (payAmount > invoice.balanceAmount + 0.05) {
    res.status(400).json({
      success: false,
      message: `Payment amount (₹${payAmount}) exceeds the outstanding balance (₹${invoice.balanceAmount}).`
    });
    return;
  }

  const refNumber = referenceNumber.trim() || `TXN-${Date.now().toString().slice(-6)}`;

  const paymentRecord: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: payAmount,
    paymentMethod: paymentMethod as PaymentMethod,
    referenceNumber: refNumber,
    paymentDate,
    notes: notes.trim(),
    createdAt: new Date().toISOString()
  };

  // Update invoice financial fields (DO NOT alter inventory stock!)
  const newPaidAmount = round2(invoice.paidAmount + payAmount);
  const newBalance = round2(Math.max(0, invoice.grandTotal - newPaidAmount));

  invoice.paidAmount = newPaidAmount;
  invoice.balanceAmount = newBalance;

  if (newBalance <= 0) {
    invoice.paymentStatus = 'PAID';
  } else {
    invoice.paymentStatus = 'PARTIALLY_PAID';
  }
  invoice.updatedAt = new Date().toISOString();

  db.payments.unshift(paymentRecord);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: `Payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully for invoice ${invoice.invoiceNumber}.`,
    payment: paymentRecord,
    invoice
  });
});

export default router;
