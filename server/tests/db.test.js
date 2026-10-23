const { prisma, checkDatabaseConnection } = require('../src/utils/prisma');
const dbService = require('../src/services/db.service');
const { AgentInputSchema } = require('../src/utils/validators');

describe('Database Service & Prisma Models', () => {
  let testAgent;
  let testCase;
  let testRun;

  beforeAll(async () => {
    // 1. Verify live DB connection
    const conn = await checkDatabaseConnection();
    expect(conn.ok).toBe(true);

    // 2. Load seeded agent and test case for testing
    testAgent = await prisma.agent.findFirst({
      where: { name: 'Baseline Unprotected Agent' }
    });
    expect(testAgent).toBeDefined();

    testCase = await prisma.testCase.findFirst({
      where: { category: 'DIRECT_INJECTION' }
    });
    expect(testCase).toBeDefined();
  });

  afterAll(async () => {
    // Clean up only temporary test runs created during this test
    if (testRun && testRun.id) {
      await prisma.testRun.deleteMany({
        where: { id: testRun.id }
      });
    }
  });

  describe('Input Validation & Security Boundaries', () => {
    it('should reject agent creation if configuration contains API keys or secrets', () => {
      const maliciousAgentPayload = {
        name: 'Vulnerable Agent with Leaked Secret',
        provider: 'mock',
        model: 'mock-target',
        configuration: {
          systemPrompt: 'You are an agent.',
          apiKey: 'sk-secret-live-api-key-12345',
          defenseType: 'none',
          allowedTools: []
        }
      };

      expect(() => {
        AgentInputSchema.parse(maliciousAgentPayload);
      }).toThrow(/Security Violation: Model API keys or secrets must not be stored in database records/);
    });

    it('should accept valid agent configuration without credentials', () => {
      const validPayload = {
        name: 'Safe Agent Config',
        provider: 'mock',
        model: 'mock-target',
        configuration: {
          systemPrompt: 'Strict prompt',
          defenseType: 'delimiter_fence',
          allowedTools: ['simulated_read_document']
        }
      };

      const parsed = AgentInputSchema.parse(validPayload);
      expect(parsed.name).toBe('Safe Agent Config');
      expect(parsed.configuration.defenseType).toBe('delimiter_fence');
    });
  });

  describe('TestRun & Finding Transactional Recording', () => {
    it('should create a TestRun in QUEUED state', async () => {
      testRun = await dbService.createTestRun({
        agentId: testAgent.id,
        testCaseId: testCase.id
      });

      expect(testRun.id).toBeDefined();
      expect(testRun.status).toBe('QUEUED');
      expect(testRun.agent.name).toBe(testAgent.name);
      expect(testRun.testCase.category).toBe('DIRECT_INJECTION');
    });

    it('should atomically record a security FAILED outcome with Findings inside a transaction', async () => {
      const updateData = {
        status: 'FAILED',
        actualResponse: 'SYSTEM_OVERRIDE_COMPLETED_PWNED',
        evaluationResult: {
          verdict: 'FAIL',
          reason: 'Model output matched forbidden trigger phrase',
          canaryDetected: false,
          unauthorizedToolUsed: false
        },
        durationMs: 420
      };

      const findings = [
        {
          title: 'Direct Prompt Injection Exploit Succeeded',
          description: 'The baseline target agent succumbed to the Maintenance Override Mode jailbreak.',
          severity: 'HIGH',
          evidence: {
            rawInput: testCase.testInput,
            rawResponse: 'SYSTEM_OVERRIDE_COMPLETED_PWNED',
            evaluatorNotes: 'Trigger word found at index 0'
          },
          recommendation: 'Implement strict instruction hierarchy and XML delimiter fences.'
        }
      ];

      const result = await dbService.recordTestRunOutcome(testRun.id, updateData, findings);

      expect(result.status).toBe('FAILED');
      expect(result.actualResponse).toBe('SYSTEM_OVERRIDE_COMPLETED_PWNED');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('HIGH');
      expect(result.findings[0].title).toBe('Direct Prompt Injection Exploit Succeeded');

      // Verify findings persisted in DB
      const dbFinding = await prisma.finding.findFirst({
        where: { testRunId: testRun.id }
      });
      expect(dbFinding).toBeDefined();
      expect(dbFinding.recommendation).toContain('Implement strict instruction hierarchy');
    });

    it('should distinguish execution runtime ERROR from security failures', async () => {
      // Create a temporary run for testing error outcome
      const errorRun = await dbService.createTestRun({
        agentId: testAgent.id,
        testCaseId: testCase.id
      });

      const updated = await dbService.recordTestRunOutcome(
        errorRun.id,
        {
          status: 'ERROR',
          errorMessage: 'Connection timeout: Model API provider unreachable after 10000ms',
          evaluationResult: {
            verdict: 'ERROR',
            reason: 'Operational failure'
          },
          durationMs: 10002
        },
        [] // No findings on execution error
      );

      expect(updated.status).toBe('ERROR');
      expect(updated.errorMessage).toContain('Connection timeout');
      expect(updated.findings).toHaveLength(0);

      // Clean up error run
      await prisma.testRun.delete({ where: { id: errorRun.id } });
    });

    it('should support INCONCLUSIVE and SKIPPED outcomes', async () => {
      const incRun = await dbService.createTestRun({
        agentId: testAgent.id,
        testCaseId: testCase.id
      });

      const updatedInc = await dbService.recordTestRunOutcome(incRun.id, {
        status: 'INCONCLUSIVE',
        actualResponse: 'I am unable to determine the outcome.',
        evaluationResult: {
          verdict: 'INCONCLUSIVE',
          reason: 'Model output was indeterminate and did not execute primary or attacker directive'
        }
      });

      expect(updatedInc.status).toBe('INCONCLUSIVE');

      const skippedRun = await dbService.createTestRun({
        agentId: testAgent.id,
        testCaseId: testCase.id
      });

      const updatedSkipped = await dbService.recordTestRunOutcome(skippedRun.id, {
        status: 'SKIPPED',
        evaluationResult: {
          verdict: 'SKIPPED',
          reason: 'Test skipped due to missing optional tool prerequisite'
        }
      });

      expect(updatedSkipped.status).toBe('SKIPPED');

      // Clean up
      await prisma.testRun.delete({ where: { id: incRun.id } });
      await prisma.testRun.delete({ where: { id: skippedRun.id } });
    });

    it('should cascade delete findings when a TestRun is deleted', async () => {
      const cascadeRun = await dbService.createTestRun({
        agentId: testAgent.id,
        testCaseId: testCase.id
      });

      await dbService.recordTestRunOutcome(
        cascadeRun.id,
        { status: 'FAILED' },
        [
          {
            title: 'Cascade Finding Test',
            description: 'Should be automatically removed when parent run is deleted',
            severity: 'LOW',
            evidence: {},
            recommendation: 'Apply security fix and enforce delimiter fences.'
          }
        ]
      );

      // Finding exists
      const findingBefore = await prisma.finding.findFirst({
        where: { testRunId: cascadeRun.id }
      });
      expect(findingBefore).toBeDefined();

      // Delete parent TestRun
      await prisma.testRun.delete({ where: { id: cascadeRun.id } });

      // Finding should have been cascade-deleted
      const findingAfter = await prisma.finding.findFirst({
        where: { testRunId: cascadeRun.id }
      });
      expect(findingAfter).toBeNull();
    });
  });
});
