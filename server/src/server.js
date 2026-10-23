const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[TrustIssues Server] Listening on port ${config.port} (environment: ${config.env})`);
  console.log(`[TrustIssues Server] Health check available at http://localhost:${config.port}/api/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[TrustIssues Server] Received SIGTERM, closing gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[TrustIssues Server] Received SIGINT, closing gracefully');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
