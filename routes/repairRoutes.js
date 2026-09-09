const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');

// GET /api/repairs/templates - get service checklist templates
router.get('/templates', repairController.getServiceTemplates);

// GET /api/repairs - list repair jobs
router.get('/', repairController.getRepairJobs);

// GET /api/repairs/:id - single repair job
router.get('/:id', repairController.getRepairJobById);

// GET /api/repairs/:id/token-pdf - customer intake token PDF
router.get('/:id/token-pdf', repairController.downloadTokenPDF);

// GET /api/repairs/:id/invoice-pdf - final repair invoice PDF
router.get('/:id/invoice-pdf', repairController.downloadInvoicePDF);

// POST /api/repairs - create repair intake ticket
router.post('/', repairController.createRepairJob);

// PATCH /api/repairs/:id/status - update status and append timeline
router.patch('/:id/status', repairController.updateStatus);

// PATCH /api/repairs/:id/checklist - toggle checklist task
router.patch('/:id/checklist', repairController.updateChecklist);

// POST /api/repairs/:id/parts - add part used (deduct inventory)
router.post('/:id/parts', repairController.addPartUsed);

// DELETE /api/repairs/:id/parts/:partId - remove part used (restore inventory)
router.delete('/:id/parts/:partId', repairController.removePartUsed);

// PATCH /api/repairs/:id/financials - update costs, payment, advance, settle
router.patch('/:id/financials', repairController.updateFinancials);

module.exports = router;
