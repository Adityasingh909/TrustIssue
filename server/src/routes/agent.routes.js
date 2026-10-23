const express = require('express');
const agentController = require('../controllers/agent.controller');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', (req, res, next) => agentController.listAgents(req, res, next));
router.get('/:id', (req, res, next) => agentController.getAgentById(req, res, next));
router.post(
  '/',
  rateLimiter.limit({
    windowMs: 60000,
    max: 30,
    message: 'Agent registration rate limit reached. Please wait.'
  }),
  (req, res, next) => agentController.createAgent(req, res, next)
);

module.exports = router;
