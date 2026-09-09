const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - list all with filtering, search, pagination
router.get('/', productController.getProducts);

// GET /api/products/code/:code - lookup by barcode or SKU for instant scanner match
router.get('/code/:code', productController.findByBarcodeOrSku);

// GET & POST /api/products/seed - seed demo/dummy products and categories
router.get('/seed', productController.seedDemoProducts);
router.post('/seed', productController.seedDemoProducts);

// GET /api/products/:id - single product
router.get('/:id', productController.getProductById);

// POST /api/products - create product
router.post('/', productController.createProduct);

// PUT /api/products/:id - update product
router.put('/:id', productController.updateProduct);

// POST /api/products/:id/adjust-stock - manual stock adjustment
router.post('/:id/adjust-stock', productController.adjustStock);

// GET /api/products/:id/stock-history - stock audit log
router.get('/:id/stock-history', productController.getStockHistory);

// DELETE /api/products/:id - soft delete product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
