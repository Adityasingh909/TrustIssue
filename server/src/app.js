const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const requestTimeout = require('./middleware/timeout');
const { authenticate } = require('./middleware/auth');

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration supporting credentials and strictly allowed origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches configured origin or development hosts
    const allowed = [
      config.corsOrigin,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174'
    ];

    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    if (config.env === 'production') {
      return callback(new Error(`CORS violation: Origin '${origin}' is not authorized.`));
    }

    return callback(null, true); // Dev-mode fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'x-test-ratelimit']
}));

// Request timeout middleware: terminates hanging connections after 25s
app.use(requestTimeout(25000));

// Body parsers: restricted to 2.5MB to protect against payload-based DoS & memory exhaustion
app.use(express.json({ limit: '2.5mb' }));
app.use(express.urlencoded({ extended: true, limit: '2.5mb' }));

// Downloadable hackathon assets (PowerPoint Pitch Deck & PDF Manual)
const path = require('path');
const docsDir = path.resolve(__dirname, '../../docs');

const sendPitchDeck = (req, res) => {
  const file = path.join(docsDir, 'TrustIssues-Hackathon-Pitch-Deck.pptx');
  res.download(file, 'TrustIssues-Hackathon-Pitch-Deck.pptx', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: { message: 'Pitch deck file not found on server.', status: 404 } });
    }
  });
};

const sendPdfManual = (req, res) => {
  const file = path.join(docsDir, 'TrustIssues-User-Guide-and-Demo-Manual.pdf');
  res.download(file, 'TrustIssues-User-Guide-and-Demo-Manual.pdf', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: { message: 'PDF manual file not found on server.', status: 404 } });
    }
  });
};

app.get('/download/pitch-deck', sendPitchDeck);
app.get('/api/download/pitch-deck', sendPitchDeck);
app.get('/download/manual-pdf', sendPdfManual);
app.get('/api/download/manual-pdf', sendPdfManual);

// Global Rate Limiting on API endpoints: 120 req/min per IP
app.use('/api', rateLimiter.limit({ windowMs: 60000, max: 120 }));

// Authentication context middleware on all API routes
app.use('/api', authenticate);

// API Root Routes
app.use('/api', routes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      status: 404
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
