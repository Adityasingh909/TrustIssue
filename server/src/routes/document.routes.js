const express = require('express');
const documentController = require('../controllers/document.controller');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/inspect',
  rateLimiter.limit({
    windowMs: 60000,
    max: 60,
    message: 'Document inspection rate limit reached (max 60 inspections/minute). Please wait before scanning more documents.'
  }),
  (req, res, next) => documentController.inspectDocument(req, res, next)
);

module.exports = router;
