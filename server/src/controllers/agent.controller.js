const dbService = require('../services/db.service');
const { AgentInputSchema } = require('../utils/validators');

class AgentController {
  async listAgents(req, res, next) {
    try {
      const agents = await dbService.listAgents();
      // Mask any internal details if necessary and return agents
      return res.status(200).json({
        data: agents,
        count: agents.length
      });
    } catch (err) {
      return next(err);
    }
  }

  async getAgentById(req, res, next) {
    try {
      const { id } = req.params;
      const agent = await dbService.getAgentById(id);
      return res.status(200).json({ data: agent });
    } catch (err) {
      return next(err);
    }
  }

  async createAgent(req, res, next) {
    try {
      const validated = AgentInputSchema.parse(req.body);
      const created = await dbService.createAgent(validated);
      return res.status(201).json({ data: created });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AgentController();
