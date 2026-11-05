import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { Product, InventoryTransaction } from '../../types/index.ts';

const router = Router();
router.use(authMiddleware);

// Get all products
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const search = (req.query.search as string || '').toLowerCase().trim();
  const category = (req.query.category as string || '').trim();
  const lowStockOnly = req.query.lowStock === 'true';

  const db = getDatabase();
  let products = db.products.filter(p => p.businessId === businessId);

  if (category) {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (lowStockOnly) {
    products = products.filter(p => p.availableStock <= p.minStockAlert);
  }

  if (search) {
    products = products.filter(
      p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.hsnCode.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  res.json({ success: true, products });
});

// Get single product
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const product = db.products.find(p => p.id === id && p.businessId === businessId);
  if (!product) {
    res.status(404).json({ success: false, message: 'Product not found.' });
    return;
  }

  // Get stock movement history for this product
  const movements = db.inventoryTransactions.filter(
    tx => tx.businessId === businessId && tx.productId === product.id
  );

  res.json({ success: true, product, movements });
});

// Create product
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const {
    name,
    sku,
    hsnCode = '8481',
    category = 'General',
    description = '',
    sellingPrice,
    purchasePrice = 0,
    gstPercentage = 18,
    availableStock = 0,
    minStockAlert = 5,
    unit = 'NOS'
  } = req.body;

  if (!name || sellingPrice === undefined) {
    res.status(400).json({ success: false, message: 'Product name and selling price are required.' });
    return;
  }

  const db = getDatabase();
  const count = db.products.filter(p => p.businessId === businessId).length;
  const productSeq = String(count + 1).padStart(3, '0');
  const productId = `PRD-${productSeq}`;
  const generatedSku = sku ? sku.trim().toUpperCase() : `SKU-${productSeq}`;

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    productId,
    name: name.trim(),
    sku: generatedSku,
    hsnCode: hsnCode.trim(),
    category: category.trim(),
    description: description.trim(),
    sellingPrice: Number(sellingPrice),
    purchasePrice: Number(purchasePrice) || 0,
    gstPercentage: Number(gstPercentage) || 18,
    availableStock: Number(availableStock) || 0,
    minStockAlert: Number(minStockAlert) || 5,
    unit: unit.trim().toUpperCase() || 'NOS',
    createdAt: new Date().toISOString()
  };

  db.products.unshift(newProduct);

  // If initial stock > 0, log an inventory transaction
  if (newProduct.availableStock > 0) {
    const initialTx: InventoryTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      productId: newProduct.id,
      productName: newProduct.name,
      sku: newProduct.sku,
      changeType: 'RESTOCK',
      quantityChange: newProduct.availableStock,
      previousStock: 0,
      newStock: newProduct.availableStock,
      referenceId: 'INITIAL_STOCK',
      notes: 'Initial inventory logged on product creation',
      date: new Date().toISOString()
    };
    db.inventoryTransactions.unshift(initialTx);
  }

  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: 'Product created successfully.',
    product: newProduct
  });
});

// Update product
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const index = db.products.findIndex(p => p.id === id && p.businessId === businessId);
  if (index === -1) {
    res.status(404).json({ success: false, message: 'Product not found.' });
    return;
  }

  const current = db.products[index];
  const oldStock = current.availableStock;
  const newStock = req.body.availableStock !== undefined ? Number(req.body.availableStock) : oldStock;

  const updated: Product = {
    ...current,
    name: req.body.name !== undefined ? req.body.name.trim() : current.name,
    sku: req.body.sku !== undefined ? req.body.sku.trim().toUpperCase() : current.sku,
    hsnCode: req.body.hsnCode !== undefined ? req.body.hsnCode.trim() : current.hsnCode,
    category: req.body.category !== undefined ? req.body.category.trim() : current.category,
    description: req.body.description !== undefined ? req.body.description.trim() : current.description,
    sellingPrice: req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : current.sellingPrice,
    purchasePrice: req.body.purchasePrice !== undefined ? Number(req.body.purchasePrice) : current.purchasePrice,
    gstPercentage: req.body.gstPercentage !== undefined ? Number(req.body.gstPercentage) : current.gstPercentage,
    availableStock: newStock,
    minStockAlert: req.body.minStockAlert !== undefined ? Number(req.body.minStockAlert) : current.minStockAlert,
    unit: req.body.unit !== undefined ? req.body.unit.trim().toUpperCase() : current.unit
  };

  db.products[index] = updated;

  // If stock was directly changed via update, record manual adjustment transaction
  if (newStock !== oldStock) {
    const diff = newStock - oldStock;
    const adjustTx: InventoryTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      productId: updated.id,
      productName: updated.name,
      sku: updated.sku,
      changeType: 'MANUAL_ADJUSTMENT',
      quantityChange: diff,
      previousStock: oldStock,
      newStock: newStock,
      referenceId: 'DIRECT_EDIT',
      notes: req.body.adjustmentReason || `Direct product edit stock adjustment (${diff > 0 ? '+' : ''}${diff})`,
      date: new Date().toISOString()
    };
    db.inventoryTransactions.unshift(adjustTx);
  }

  saveDatabase(db);

  res.json({
    success: true,
    message: 'Product updated successfully.',
    product: updated
  });
});

// Delete product
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { id } = req.params;
  const db = getDatabase();

  const index = db.products.findIndex(p => p.id === id && p.businessId === businessId);
  if (index === -1) {
    res.status(404).json({ success: false, message: 'Product not found.' });
    return;
  }

  // Check if product is in any invoice
  const usedInInvoices = db.invoices.some(
    inv => inv.businessId === businessId && inv.items.some(item => item.productId === id)
  );

  if (usedInInvoices) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete product because it is part of existing invoices.'
    });
    return;
  }

  db.products.splice(index, 1);
  saveDatabase(db);

  res.json({ success: true, message: 'Product deleted successfully.' });
});

export default router;
