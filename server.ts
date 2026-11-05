import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './src/server/routes/auth.routes.ts';
import customerRoutes from './src/server/routes/customer.routes.ts';
import productRoutes from './src/server/routes/product.routes.ts';
import inventoryRoutes from './src/server/routes/inventory.routes.ts';
import invoiceRoutes from './src/server/routes/invoice.routes.ts';
import paymentRoutes from './src/server/routes/payment.routes.ts';
import reportRoutes from './src/server/routes/report.routes.ts';
import businessRoutes from './src/server/routes/business.routes.ts';
import { getDatabase } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB & Seed if needed
  getDatabase();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/business', businessRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Invox SME Billing System', timestamp: new Date().toISOString() });
  });

  // Project source code ZIP download endpoint
  app.get(['/api/download-zip', '/download-zip'], (req, res) => {
    const zipPath = path.resolve(__dirname, 'public', 'invox-sme-project.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="invox-sme-billing-system.zip"');
      return res.sendFile(zipPath);
    }
    res.status(404).json({ error: 'Zip file not generated yet' });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Static file serving in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Invox Server] Running on http://0.0.0.0:${PORT} (${isProduction ? 'Production' : 'Development'})`);
  });
}

startServer().catch(err => {
  console.error('[Invox Server] Failed to start:', err);
  process.exit(1);
});
