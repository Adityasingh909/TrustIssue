const healthService = require('../services/health.service');

/**
 * Controller handling health-check inspection requests.
 */
async function getHealth(req, res, next) {
  try {
    const health = await healthService.getSystemHealth();
    return res.status(200).json(health);
  } catch (error) {
    return next(error);
  }
}

/**
 * Controller handling live AI model connectivity probe.
 * Sends a minimal, harmless ping to test connection and quota.
 */
async function getModelConnectivity(req, res, next) {
  try {
    const connectivity = await healthService.checkModelConnectivity();
    const httpStatus = connectivity.connected ? 200 : (connectivity.httpStatus || 503);
    return res.status(httpStatus).json(connectivity);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHealth,
  getModelConnectivity
};
