const express = require('express');
const healthRoutes = require('./health.routes');
const testRunRoutes = require('./testRun.routes');
const agentRoutes = require('./agent.routes');
const testCaseRoutes = require('./testCase.routes');
const metricsRoutes = require('./metrics.routes');
const documentRoutes = require('./document.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/test-runs', testRunRoutes);
router.use('/agents', agentRoutes);
router.use('/test-cases', testCaseRoutes);
router.use('/metrics', metricsRoutes);
router.use('/documents', documentRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
