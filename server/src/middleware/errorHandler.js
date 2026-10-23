const config = require('../config');

/**
 * Centralized error-handling middleware.
 * Prevents stack trace leakages in non-development environments while maintaining
 * standard JSON error structures.
 */
function errorHandler(err, req, res, next) {
  const isZod = err.name === 'ZodError' || Array.isArray(err.issues);
  const statusCode = err.statusCode || err.status || (isZod ? 400 : 500);
  const isDevelopment = config.env === 'development';

  // Sanitize message to prevent credential logging
  let safeMessage = typeof err.message === 'string'
    ? err.message
        .replace(/sk-[a-zA-Z0-9_\-]{20,}/gi, 'sk-[REDACTED]')
        .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, 'Bearer [REDACTED]')
        .replace(/AI_API_KEY=[^\s&"']+/gi, 'AI_API_KEY=[REDACTED]')
    : 'Internal Server Error';

  if (isZod && err.issues) {
    safeMessage = err.issues.map(i => i.message).join('; ');
  }

  const response = {
    error: {
      message: safeMessage,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  };

  if (err.details) {
    response.error.details = err.details;
  }

  if (isDevelopment && err.stack) {
    // Sanitize stack trace before outputting in development mode
    response.error.stack = err.stack
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/gi, 'sk-[REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, 'Bearer [REDACTED]');
  }

  // Avoid logging in test mode unless desired; sanitize log output
  if (config.env !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}: ${safeMessage}`);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
