const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const rateLimiter = require('../middleware/rateLimiter');

// Generate report from stored test runs (rate limited to prevent DB aggregation DoS)
router.post(
  '/generate',
  rateLimiter.limit({
    windowMs: 60000,
    max: 30,
    message: 'Report generation rate limit reached (max 30 reports/minute). Please wait before generating more reports.'
  }),
  (req, res, next) => reportController.generateReport(req, res, next)
);

// List all stored reports
router.get('/', (req, res, next) => reportController.listReports(req, res, next));

// Retrieve single report by ID
router.get('/:id', (req, res, next) => reportController.getReportById(req, res, next));

// Download report as markdown audit brief
router.get('/:id/markdown', (req, res, next) => reportController.exportReportMarkdown(req, res, next));

module.exports = router;
