const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('should return 200 OK and healthy status object with database status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'TrustIssues Security Lab API');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status');
    expect(res.body).toHaveProperty('system');
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error.message).toContain('Resource not found');
  });

  it('GET /api/health/model should return model connectivity inspection without leaking API key', async () => {
    const config = require('../src/config');
    const res = await request(app).get('/api/health/model');

    expect(res.body).toHaveProperty('provider', config.aiProvider || 'groq');
    expect(res.body).toHaveProperty('model', config.aiModel || 'qwen/qwen3.8-27b');
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('status');

    // Ensure the response body never leaks any configured secret
    if (config.aiApiKey) {
      expect(JSON.stringify(res.body)).not.toContain(config.aiApiKey);
    }
  });
});
