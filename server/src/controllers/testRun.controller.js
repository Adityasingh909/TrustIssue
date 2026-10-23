const testRunner = require('../services/testRunner');
const trialService = require('../services/trialService');
const dbService = require('../services/db.service');
const { z } = require('zod');

const RunRequestSchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
  testCaseId: z.string().uuid('testCaseId must be a valid UUID'),
  canaryToken: z.string().max(256).optional(),
  customTask: z.string().max(10000).optional(),
  customDocument: z.string().max(2097152, 'Document size exceeds maximum permitted limit of 2MB').optional(),
  judgeType: z.enum(['deterministic', 'independent_judge']).optional()
});

const TrialsBatchSchema = z.object({
  testCaseId: z.string().uuid('testCaseId must be a valid UUID'),
  agentIds: z.array(z.string().uuid('agentIds must be valid UUIDs')).min(1, 'At least one agent must be selected').max(10, 'Maximum 10 agents can be compared simultaneously'),
  trialsCount: z.number().int().min(1).max(20).default(3),
  options: z.object({
    customTask: z.string().max(10000).optional(),
    customDocument: z.string().max(2097152, 'Document size exceeds maximum permitted limit of 2MB').optional(),
    judgeType: z.enum(['deterministic', 'independent_judge']).optional(),
    canaryToken: z.string().max(256).optional()
  }).optional()
});

/**
 * Controller handling Test Run execution and retrieval.
 */
class TestRunController {
  /**
   * POST /api/test-runs
   * Executes a security test run against an agent.
   */
  async createTestRun(req, res, next) {
    try {
      const validated = RunRequestSchema.parse(req.body);
      const result = await testRunner.runTest({
        agentId: validated.agentId,
        testCaseId: validated.testCaseId,
        options: {
          canaryToken: validated.canaryToken,
          customTask: validated.customTask,
          customDocument: validated.customDocument,
          judgeType: validated.judgeType
        }
      });

      return res.status(201).json({
        data: result
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/test-runs/trials
   * Executes repeated security evaluation trials across one or more agent configurations
   * with rate limiting, concurrency bounds, and aggregate comparison analytics.
   */
  async executeTrials(req, res, next) {
    try {
      const validated = TrialsBatchSchema.parse(req.body);
      const results = await trialService.executeTrials({
        testCaseId: validated.testCaseId,
        agentIds: validated.agentIds,
        trialsCount: validated.trialsCount,
        options: validated.options
      });

      return res.status(200).json({
        data: results
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/test-runs
   * Lists past test runs with optional filters.
   */
  async listTestRuns(req, res, next) {
    try {
      const { agentId, testCaseId, status } = req.query;
      const runs = await dbService.listTestRuns({ agentId, testCaseId, status });

      return res.status(200).json({
        data: runs,
        count: runs.length
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/test-runs/:id
   * Retrieves detailed test run outcome, captured evidence, and findings.
   */
  async getTestRunById(req, res, next) {
    try {
      const { id } = req.params;
      const run = await dbService.getTestRunById(id);

      return res.status(200).json({
        data: run
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TestRunController();
