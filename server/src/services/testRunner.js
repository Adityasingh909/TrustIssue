const dbService = require('./db.service');
const testCaseService = require('./testCaseService');
const evaluator = require('./evaluator');
const { VulnerableMockAgent, SafeMockAgent } = require('./mockAgent');
const { RemoteLLMAdapter } = require('./remoteLLMAdapter');

class TestRunnerService {
  /**
   * Resolves the appropriate AgentAdapter instance for an agent domain record.
   */
  resolveAgentAdapter(agent, customAdapter = null) {
    if (customAdapter) {
      return customAdapter;
    }

    const config = agent.configuration || {};
    const nameLower = (agent.name || '').toLowerCase();
    const isVulnerable =
      nameLower.includes('baseline') ||
      nameLower.includes('unprotected') ||
      nameLower.includes('vulnerable') ||
      config.defenseType === 'none';

    if (agent.provider === 'mock') {
      if (isVulnerable) {
        return new VulnerableMockAgent({
          name: agent.name,
          model: agent.model,
          ...config
        });
      }
      return new SafeMockAgent({
        name: agent.name,
        model: agent.model,
        defenseType: config.defenseType || 'strict_hierarchy',
        ...config
      });
    }

    // Live Remote LLM Integration (GLM-5.3-Flash, OpenAI, or compatible endpoint)
    // Pass only validated, non-sensitive parameters (NEVER allow client to override endpoint or API key)
    return new RemoteLLMAdapter({
      name: agent.name,
      provider: agent.provider,
      model: agent.model,
      defenseType: config.defenseType || 'strict_hierarchy',
      temperature: config.temperature,
      systemPrompt: config.systemPrompt
    });
  }

  /**
   * Constructs the structured input payload for the target agent.
   */
  constructAgentInput(agent, testCase, options = {}) {
    const config = agent.configuration || {};
    const criteria = testCase.evaluationCriteria || {};
    const testInput = testCase.testInput || '';

    let untrustedDocument = '';
    let userQuery = testInput;

    // Check if custom task or document was provided (e.g. from Document Lab)
    if (options.customTask !== undefined || options.customDocument !== undefined) {
      userQuery = options.customTask !== undefined ? options.customTask : (testCase.originalTask || testInput);
      untrustedDocument = options.customDocument !== undefined ? options.customDocument : '';
    } else {
      // Extract untrusted document boundary if present
      if (testInput.includes('<untrusted_content>')) {
        const match = testInput.match(/<untrusted_content>([\s\S]*?)<\/untrusted_content>/);
        if (match) {
          untrustedDocument = match[1].trim();
          userQuery = testInput.replace(/<untrusted_content>[\s\S]*?<\/untrusted_content>/, '').trim();
        }
      } else if (testCase.inputType === 'DOCUMENT') {
        untrustedDocument = testInput;
        userQuery = testCase.originalTask || `Please analyze and summarize the following document:`;
      }
    }

    // Determine synthetic canary token under evaluation
    const canaryToken =
      options.canaryToken ||
      criteria.prohibitedCanaries?.[0] ||
      `CANARY_SECVAL_${Math.floor(1000 + Math.random() * 9000)}`;

    // Build available tool descriptions
    const allowedTools = config.allowedTools || [];
    const availableTools = allowedTools.map(toolName => ({
      name: toolName,
      description: `Simulated sandbox tool: ${toolName}`
    }));

    return {
      trustedInstructions: config.systemPrompt || 'You are an AI assistant.',
      userQuery,
      untrustedDocument,
      availableTools,
      canaryToken
    };
  }

  /**
   * Executes a complete security test run lifecycle.
   * 1. Validate agent and test case.
   * 2. Load expected behavior.
   * 3. Construct agent input.
   * 4. Execute selected agent.
   * 5. Capture actual response and observable actions.
   * 6. Evaluate security criteria.
   * 7. Save test run and evidence.
   * 8. Return normalized result.
   */
  async runTest({ agentId, testCaseId, customAdapter = null, options = {} }) {
    const startTime = new Date();

    // 1. Validate the agent and test case
    const agent = await dbService.getAgentById(agentId);
    const testCase = await testCaseService.getTestCaseById(testCaseId);

    // 2. Resolve adapter & construct input
    const adapter = this.resolveAgentAdapter(agent, customAdapter);
    const agentInput = this.constructAgentInput(agent, testCase, options);

    // 3. Record TestRun in QUEUED state
    const testRun = await dbService.createTestRun({
      agentId: agent.id,
      testCaseId: testCase.id
    });

    let executionResult;

    // 4. Execute selected agent & capture observable actions and execution duration
    try {
      executionResult = await adapter.execute(agentInput);
    } catch (err) {
      executionResult = {
        success: false,
        responseText: '',
        toolCalls: [],
        durationMs: Date.now() - startTime.getTime(),
        error: err,
        isMock: adapter.isMock,
        metadata: {
          agentName: agent.name,
          provider: agent.provider,
          model: agent.model
        }
      };
    }

    // 5. Evaluate security criteria (verdict, findings, safe quotation, behavioral classification)
    const evaluation = evaluator.evaluate(testCase, executionResult, {
      canaryToken: agentInput.canaryToken,
      customTask: options.customTask,
      customDocument: options.customDocument,
      judgeType: options.judgeType
    });

    // 6. Map verdict to database RunStatus
    let dbStatus = 'COMPLETED';
    if (evaluation.verdict === 'FAIL') {
      dbStatus = 'FAILED';
    } else if (evaluation.verdict === 'ERROR') {
      dbStatus = 'ERROR';
    } else if (evaluation.verdict === 'INCONCLUSIVE') {
      dbStatus = 'INCONCLUSIVE';
    } else if (evaluation.verdict === 'SKIPPED') {
      dbStatus = 'SKIPPED';
    }

    // 7. Save the test run and findings atomically inside a database transaction
    const updatePayload = {
      status: dbStatus,
      startedAt: startTime,
      completedAt: new Date(),
      actualResponse: executionResult.responseText || null,
      evaluationResult: {
        verdict: evaluation.verdict,
        reason: evaluation.reason,
        isMock: executionResult.isMock,
        testCaseVersion: testCase.version || 1,
        suppliedInput: {
          userQuery: agentInput.userQuery,
          untrustedDocument: agentInput.untrustedDocument ? agentInput.untrustedDocument.slice(0, 5000) : '',
          canaryToken: agentInput.canaryToken
        },
        metadata: executionResult.metadata,
        details: evaluation.details
      },
      durationMs: executionResult.durationMs || (Date.now() - startTime.getTime()),
      errorMessage: executionResult.error ? executionResult.error.message : null
    };

    const savedRun = await dbService.recordTestRunOutcome(
      testRun.id,
      updatePayload,
      evaluation.findings || []
    );

    // 8. Return normalized result
    return {
      testRunId: savedRun.id,
      agentId: agent.id,
      agentName: agent.name,
      testCaseId: testCase.id,
      testCaseTitle: testCase.title,
      testCaseVersion: testCase.version || 1,
      category: testCase.category,
      status: savedRun.status,
      verdict: evaluation.verdict,
      reason: evaluation.reason,
      durationMs: savedRun.durationMs,
      actualResponse: savedRun.actualResponse,
      toolCalls: executionResult.toolCalls || [],
      findings: savedRun.findings || [],
      isMock: executionResult.isMock,
      suppliedInput: {
        userQuery: agentInput.userQuery,
        untrustedDocument: agentInput.untrustedDocument ? agentInput.untrustedDocument.slice(0, 5000) : '',
        canaryToken: agentInput.canaryToken
      },
      details: evaluation.details,
      createdAt: savedRun.createdAt,
      completedAt: savedRun.completedAt
    };
  }
}

module.exports = new TestRunnerService();
