const express = require('express');
const metricsController = require('../controllers/metrics.controller');

const router = express.Router();

router.get('/summary', (req, res, next) => metricsController.getSummary(req, res, next));

module.exports = router;
