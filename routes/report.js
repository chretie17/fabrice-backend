const express = require('express');
const reportController = require('../controllers/reportController');
const router = express.Router();

/**
 * @route GET /api/reports/generate
 * @description Generate a report for a specific category, optionally filtered by date range
 * @queryParam {string} category - Report category (academic, performance, analytics, etc.)
 * @queryParam {string} [start_date] - Start date for filtering
 * @queryParam {string} [end_date] - End date for filtering
 * @queryParam {string} [type] - Type of report (full or date_range)
 */
router.get('/generate', reportController.generateReport);

/**
 * @route GET /api/reports/categories
 * @description Get all available report categories
 */
router.get('/categories', reportController.getReportCategories);

module.exports = router;