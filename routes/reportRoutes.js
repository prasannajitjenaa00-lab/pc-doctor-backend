const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/sales', reportController.getSalesReport);
router.get('/repairs', reportController.getRepairReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/export/inventory-excel', reportController.exportInventoryExcel);
router.get('/export/sales-excel', reportController.exportSalesExcel);

module.exports = router;
