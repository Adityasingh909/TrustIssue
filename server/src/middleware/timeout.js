/**
 * Request Timeout Middleware.
 * Prevents resource exhaustion from hanging sockets or slowloris connections.
 */

function requestTimeout(timeoutMs = 25000) {
  return (req, res, next) => {
    // Avoid timeout in test runner
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: {
            message: `Gateway Timeout: Request exceeded maximum threshold of ${timeoutMs}ms`,
            status: 504,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, timeoutMs);

    // Cancel timer when request completes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = requestTimeout;
