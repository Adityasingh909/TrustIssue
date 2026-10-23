/**
 * In-Memory Sliding Window Rate Limiting Middleware.
 * Protects TrustIssues API against resource exhaustion, DoS, and automated brute-force inference spam.
 */

class RateLimiter {
  constructor() {
    this.requests = new Map(); // ip -> Array<timestamps>
    // Periodically clean up stale client IPs every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const active = timestamps.filter(ts => now - ts < 60000);
      if (active.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, active);
      }
    }
  }

  reset() {
    this.requests.clear();
  }

  /**
   * Express middleware factory for route-specific rate limits.
   * @param {Object} options
   * @param {number} [options.windowMs=60000] - Window duration in ms
   * @param {number} [options.max=120] - Max requests permitted in window
   * @param {string} [options.message='Too many requests'] - Error message
   */
  limit(options = {}) {
    const windowMs = options.windowMs || 60000;
    const max = options.max || 120;
    const message = options.message || 'Rate limit exceeded: Please wait before submitting more requests.';

    return (req, res, next) => {
      // In test environment, allow bypassing unless specifically testing rate limiter
      if (process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']) {
        return next();
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const key = `${clientIp}:${req.baseUrl || req.path}`;
      const now = Date.now();

      const timestamps = this.requests.get(key) || [];
      const windowStart = now - windowMs;
      const recentTimestamps = timestamps.filter(ts => ts > windowStart);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - recentTimestamps.length - 1));

      if (recentTimestamps.length >= max) {
        const oldest = recentTimestamps[0];
        const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);

        return res.status(429).json({
          error: {
            message,
            status: 429,
            retryAfterSeconds,
            timestamp: new Date().toISOString()
          }
        });
      }

      recentTimestamps.push(now);
      this.requests.set(key, recentTimestamps);
      next();
    };
  }
}

const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
