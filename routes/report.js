const express = require('express');
const reportController = require('../controllers/reportController');
const router = express.Router();

/**
 * @route GET /api/reports
 * @description Generate a full system report, optionally filtered by date range
 * @queryParam {string} [start_date] - Start date for filtering
 * @queryParam {string} [end_date] - End date for filtering
 */
router.get('/', reportController.generateReport);

module.exports = router;
