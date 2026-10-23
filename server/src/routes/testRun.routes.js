const express = require('express');
const testRunController = require('../controllers/testRun.controller');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/test-runs - Execute test run (rate limited to prevent inference resource exhaustion)
router.post(
  '/',
  rateLimiter.limit({
    windowMs: 60000,
    max: 40,
    message: 'Test execution rate limit reached (max 40 runs/minute). Please wait before launching additional evaluations.'
  }),
  (req, res, next) => testRunController.createTestRun(req, res, next)
);

// POST /api/test-runs/trials - Execute repeated trial evaluation batch (rate limited)
router.post(
  '/trials',
  rateLimiter.limit({
    windowMs: 60000,
    max: 15,
    message: 'Trial execution rate limit reached (max 15 trial batches/minute). Please wait before launching additional evaluation batches.'
  }),
  (req, res, next) => testRunController.executeTrials(req, res, next)
);

// GET /api/test-runs - List test runs
router.get('/', (req, res, next) => testRunController.listTestRuns(req, res, next));

// GET /api/test-runs/:id - Get test run by id
router.get('/:id', (req, res, next) => testRunController.getTestRunById(req, res, next));

module.exports = router;
