const config = require('../config');
const { checkDatabaseConnection } = require('../utils/prisma');
const { RemoteLLMAdapter } = require('./remoteLLMAdapter');

class HealthService {
  /**
   * Retrieves operational system and database health status.
   */
  async getSystemHealth() {
    const memory = process.memoryUsage();
    const dbCheck = await checkDatabaseConnection();

    return {
      status: dbCheck.ok ? 'healthy' : 'degraded',
      service: 'TrustIssues Security Lab API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: config.env,
      database: dbCheck.ok
        ? { status: 'connected', latencyMs: dbCheck.latencyMs }
        : { status: 'disconnected', error: dbCheck.error },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024)
        }
      },
      targetModel: {
        provider: config.aiProvider || 'mock',
        model: config.aiModel || 'none',
        configured: Boolean(config.aiApiKey)
      }
    };
  }

  /**
   * Performs an actual minimal connectivity test to the configured model.
   * Sends a harmless prompt and evaluates response.
   * DOES NOT claim connection unless an actual inference request succeeds.
   * NEVER exposes API keys or genuine secrets.
   */
  async checkModelConnectivity() {
    const hasKey = Boolean(config.aiApiKey && config.aiApiKey.trim().length > 0);
    if (!hasKey) {
      return {
        connected: false,
        status: 'UNCONFIGURED_CREDENTIALS',
        provider: config.aiProvider,
        model: config.aiModel,
        baseUrl: config.aiBaseUrl || 'https://open.bigmodel.cn/api/paas/v4',
        message: 'AI_API_KEY is not configured in server/.env. Please configure AI_API_KEY to test live model connectivity.',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const adapter = new RemoteLLMAdapter({
        provider: config.aiProvider,
        model: config.aiModel,
        timeoutMs: 15000
      });

      const startTime = Date.now();
      const result = await adapter.execute({
        trustedInstructions: 'You are an AI system health monitor.',
        userQuery: 'Ping test: Please respond with "PONG" to confirm connectivity.'
      });
      const latencyMs = Date.now() - startTime;

      if (result.success && result.responseText) {
        return {
          connected: true,
          status: 'CONNECTED',
          provider: config.aiProvider,
          model: config.aiModel,
          baseUrl: adapter.baseUrl,
          latencyMs,
          sampleResponse: result.responseText.trim(),
          tokenUsage: result.metadata?.tokenUsage || null,
          timestamp: new Date().toISOString()
        };
      }

      // If execution was unsuccessful, inspect failure
      const err = result.error || {};
      const status = err.status || 500;
      let reason = 'INFERENCE_FAILED';

      if (status === 401 || status === 403 || err.code === 'AUTH_FAILURE') {
        reason = 'AUTH_FAILURE';
      } else if (status === 429 || err.code === 'RATE_LIMITED') {
        reason = 'QUOTA_EXCEEDED_OR_RATE_LIMITED';
      } else if (err.code === 'ETIMEDOUT') {
        reason = 'TIMEOUT';
      }

      return {
        connected: false,
        status: reason,
        httpStatus: status,
        provider: config.aiProvider,
        model: config.aiModel,
        baseUrl: adapter.baseUrl,
        latencyMs,
        message: err.message || 'Model did not return a successful completion.',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        connected: false,
        status: 'ERROR',
        provider: config.aiProvider,
        model: config.aiModel,
        message: err.message || 'Unexpected exception during model connectivity probe.',
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new HealthService();
