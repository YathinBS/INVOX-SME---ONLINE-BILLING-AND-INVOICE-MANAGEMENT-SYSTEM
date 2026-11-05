import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { InventoryTransaction } from '../../types/index.ts';

const router = Router();
router.use(authMiddleware);

// Get inventory overview
router.get('/status', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const db = getDatabase();

  const products = db.products.filter(p => p.businessId === businessId);
  const lowStock = products.filter(p => p.availableStock <= p.minStockAlert);
  const totalItemsInStock = products.reduce((acc, p) => acc + p.availableStock, 0);
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + p.availableStock * (p.purchasePrice || p.sellingPrice * 0.7),
    0
  );

  res.json({
    success: true,
    summary: {
      totalProducts: products.length,
      totalUnits: totalItemsInStock,
      lowStockCount: lowStock.length,
      inventoryAssetValue: totalInventoryValue
    },
    products,
    lowStock
  });
});

// Get stock movement history / ledger
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const productId = req.query.productId as string;
  const limit = Number(req.query.limit) || 100;

  const db = getDatabase();
  let txs = db.inventoryTransactions.filter(t => t.businessId === businessId);

  if (productId) {
    txs = txs.filter(t => t.productId === productId);
  }

  // Sort by date descending
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, transactions: txs.slice(0, limit) });
});

// Adjust stock or Restock
router.post('/adjust', (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user!.businessId;
  const { productId, changeType, quantity, referenceId = '', notes = '' } = req.body;

  if (!productId || !changeType || quantity === undefined) {
    res.status(400).json({ success: false, message: 'Product ID, change type, and quantity are required.' });
    return;
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty === 0) {
    res.status(400).json({ success: false, message: 'Valid non-zero quantity is required.' });
    return;
  }

  const db = getDatabase();
  const product = db.products.find(p => p.id === productId && p.businessId === businessId);

  if (!product) {
    res.status(404).json({ success: false, message: 'Product not found.' });
    return;
  }

  const previousStock = product.availableStock;
  const delta = changeType === 'RESTOCK' ? Math.abs(numQty) : (changeType === 'MANUAL_ADJUSTMENT' ? numQty : -Math.abs(numQty));
  const newStock = previousStock + delta;

  if (newStock < 0) {
    res.status(400).json({
      success: false,
      message: `Cannot reduce stock below zero. Available stock is ${previousStock}.`
    });
    return;
  }

  product.availableStock = newStock;

  const transaction: InventoryTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    changeType,
    quantityChange: delta,
    previousStock,
    newStock,
    referenceId,
    notes,
    date: new Date().toISOString()
  };

  db.inventoryTransactions.unshift(transaction);
  saveDatabase(db);

  res.json({
    success: true,
    message: `Stock updated successfully. New balance: ${newStock} ${product.unit}`,
    product,
    transaction
  });
});

export default router;
