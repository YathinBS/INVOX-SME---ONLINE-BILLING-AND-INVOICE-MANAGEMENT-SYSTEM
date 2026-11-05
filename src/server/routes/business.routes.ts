import { Router, Response } from 'express';
import { getDatabase, saveDatabase, resetToSeed, getStateCode } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(authMiddleware);

// GET business settings
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const db = getDatabase();

  const business = db.businesses.find(b => b.id === businessId);
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found.' });
    return;
  }

  res.json({ success: true, business });
});

// UPDATE business settings
router.put('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const db = getDatabase();

  const index = db.businesses.findIndex(b => b.id === businessId);
  if (index === -1) {
    res.status(404).json({ success: false, message: 'Business not found.' });
    return;
  }

  const current = db.businesses[index];
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    pinCode,
    gstin,
    logoUrl,
    invoicePrefix,
    defaultPaymentTerms,
    bankDetails,
    upiId
  } = req.body;

  const updatedState = state !== undefined ? state.trim() : current.state;
  const stateCode = getStateCode(updatedState);

  const updated = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    email: email !== undefined ? email.trim().toLowerCase() : current.email,
    phone: phone !== undefined ? phone.trim() : current.phone,
    address: address !== undefined ? address.trim() : current.address,
    city: city !== undefined ? city.trim() : current.city,
    state: updatedState,
    stateCode,
    pinCode: pinCode !== undefined ? pinCode.trim() : current.pinCode,
    gstin: gstin !== undefined ? gstin.trim().toUpperCase() : current.gstin,
    logoUrl: logoUrl !== undefined ? logoUrl : current.logoUrl,
    invoicePrefix: invoicePrefix !== undefined ? invoicePrefix.trim().toUpperCase() : current.invoicePrefix,
    defaultPaymentTerms: defaultPaymentTerms !== undefined ? defaultPaymentTerms.trim() : current.defaultPaymentTerms,
    bankDetails: bankDetails !== undefined ? { ...current.bankDetails, ...bankDetails } : current.bankDetails,
    upiId: upiId !== undefined ? upiId.trim() : current.upiId
  };

  db.businesses[index] = updated;
  saveDatabase(db);

  res.json({
    success: true,
    message: 'Business settings updated successfully.',
    business: updated
  });
});

// RESET to demo seed data
router.post('/reset-demo', (req: AuthenticatedRequest, res: Response) => {
  const freshDb = resetToSeed();
  const demoBusiness = freshDb.businesses[0];

  res.json({
    success: true,
    message: 'Database successfully reset to initial demo state with 10 customers, 15 products, and 10 invoices.',
    business: demoBusiness
  });
});

export default router;
