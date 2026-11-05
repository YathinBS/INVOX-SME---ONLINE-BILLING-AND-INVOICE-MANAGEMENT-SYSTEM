import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { Customer } from '../../types/index.ts';

const router = Router();
router.use(authMiddleware);

// Get all customers for the business
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const search = (req.query.search as string || '').toLowerCase().trim();

  const db = getDatabase();
  let customers = db.customers.filter(c => c.businessId === businessId);

  if (search) {
    customers = customers.filter(
      c =>
        c.name.toLowerCase().includes(search) ||
        c.businessName.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.gstin && c.gstin.toLowerCase().includes(search)) ||
        c.city.toLowerCase().includes(search) ||
        c.customerId.toLowerCase().includes(search)
    );
  }

  // Calculate live financial summary for each customer from real invoices
  const customerSummary = customers.map(cust => {
    const custInvoices = db.invoices.filter(
      inv => inv.businessId === businessId && inv.customerId === cust.id
    );
    const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const balanceDue = custInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    return {
      ...cust,
      totalInvoiced,
      totalPaid,
      balanceDue,
      invoiceCount: custInvoices.length
    };
  });

  res.json({ success: true, customers: customerSummary });
});

// Get single customer with invoice history
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;

  const db = getDatabase();
  const customer = db.customers.find(c => c.id === id && c.businessId === businessId);

  if (!customer) {
    res.status(404).json({ success: false, message: 'Customer not found.' });
    return;
  }

  const invoices = db.invoices.filter(
    inv => inv.businessId === businessId && inv.customerId === customer.id
  );

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const balanceDue = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

  res.json({
    success: true,
    customer: {
      ...customer,
      totalInvoiced,
      totalPaid,
      balanceDue,
      invoiceCount: invoices.length
    },
    invoices
  });
});

// Add new customer
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const {
    name,
    businessName,
    email,
    phone,
    gstin,
    billingAddress,
    city,
    state,
    pinCode
  } = req.body;

  if (!name || !phone || !billingAddress || !city || !state) {
    res.status(400).json({
      success: false,
      message: 'Name, phone, billing address, city, and state are required fields.'
    });
    return;
  }

  const db = getDatabase();
  const existingCount = db.customers.filter(c => c.businessId === businessId).length;
  const customerSeq = String(existingCount + 1).padStart(3, '0');
  const customerId = `CUST-${customerSeq}`;

  const newCustomer: Customer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    customerId,
    name: name.trim(),
    businessName: (businessName || name).trim(),
    email: (email || '').trim().toLowerCase(),
    phone: phone.trim(),
    gstin: gstin ? gstin.trim().toUpperCase() : undefined,
    billingAddress: billingAddress.trim(),
    city: city.trim(),
    state: state.trim(),
    pinCode: (pinCode || '560001').trim(),
    createdAt: new Date().toISOString()
  };

  db.customers.unshift(newCustomer);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: 'Customer added successfully.',
    customer: newCustomer
  });
});

// Update customer
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const index = db.customers.findIndex(c => c.id === id && c.businessId === businessId);
  if (index === -1) {
    res.status(404).json({ success: false, message: 'Customer not found.' });
    return;
  }

  const current = db.customers[index];
  const updated: Customer = {
    ...current,
    name: req.body.name !== undefined ? req.body.name.trim() : current.name,
    businessName: req.body.businessName !== undefined ? req.body.businessName.trim() : current.businessName,
    email: req.body.email !== undefined ? req.body.email.trim().toLowerCase() : current.email,
    phone: req.body.phone !== undefined ? req.body.phone.trim() : current.phone,
    gstin: req.body.gstin !== undefined ? (req.body.gstin ? req.body.gstin.trim().toUpperCase() : undefined) : current.gstin,
    billingAddress: req.body.billingAddress !== undefined ? req.body.billingAddress.trim() : current.billingAddress,
    city: req.body.city !== undefined ? req.body.city.trim() : current.city,
    state: req.body.state !== undefined ? req.body.state.trim() : current.state,
    pinCode: req.body.pinCode !== undefined ? req.body.pinCode.trim() : current.pinCode
  };

  db.customers[index] = updated;

  // Also update customer name on existing invoices if changed
  db.invoices.forEach(inv => {
    if (inv.customerId === id && inv.businessId === businessId) {
      inv.customerName = updated.name;
      inv.customerBusinessName = updated.businessName;
      inv.customerGstin = updated.gstin;
      inv.customerAddress = updated.billingAddress;
      inv.customerCity = updated.city;
      inv.customerState = updated.state;
      inv.customerPinCode = updated.pinCode;
      inv.customerPhone = updated.phone;
      inv.customerEmail = updated.email;
    }
  });

  saveDatabase(db);

  res.json({
    success: true,
    message: 'Customer updated successfully.',
    customer: updated
  });
});

// Delete customer
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const customerIndex = db.customers.findIndex(c => c.id === id && c.businessId === businessId);
  if (customerIndex === -1) {
    res.status(404).json({ success: false, message: 'Customer not found.' });
    return;
  }

  // Check if invoices exist
  const hasInvoices = db.invoices.some(inv => inv.customerId === id && inv.businessId === businessId);
  if (hasInvoices) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete customer because existing invoices are linked to this record.'
    });
    return;
  }

  db.customers.splice(customerIndex, 1);
  saveDatabase(db);

  res.json({ success: true, message: 'Customer deleted successfully.' });
});

export default router;
