const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

// GET /api/bills - list bills with filters
router.get('/', billController.getBills);

// GET /api/bills/:id - single bill details
router.get('/:id', billController.getBillById);

// GET /api/bills/:id/pdf - stream printable tax invoice PDF
router.get('/:id/pdf', billController.downloadInvoicePDF);

// POST /api/bills - POS checkout and bill generation
router.post('/', billController.createBill);

// POST /api/bills/:id/cancel - cancel bill and restore stock
router.post('/:id/cancel', billController.cancelBill);

module.exports = router;
