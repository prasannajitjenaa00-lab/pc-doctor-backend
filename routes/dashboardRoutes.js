const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard - Combined statistics, KPI cards, charts & recent lists
router.get('/', dashboardController.getDashboardStats);

module.exports = router;
