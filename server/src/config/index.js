const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',

  // AI Provider Configuration (GLM-5.3-Flash / OpenAI-compatible endpoint)
  aiProvider: (process.env.AI_PROVIDER || 'glm-flash').trim(),
  aiModel: (process.env.AI_MODEL || 'glm-5.3-flash').trim(),
  aiApiKey: (process.env.AI_API_KEY || process.env.MODEL_API_KEY || '').trim(),
  aiBaseUrl: (process.env.AI_BASE_URL || process.env.MODEL_BASE_URL || '').trim(),
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10)
};

module.exports = config;
