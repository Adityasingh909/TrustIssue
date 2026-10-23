const express = require('express');
const { getHealth, getModelConnectivity } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health - System and Database liveness
router.get('/', getHealth);

// GET /api/health/model - Live AI model connectivity test
router.get('/model', getModelConnectivity);

module.exports = router;
