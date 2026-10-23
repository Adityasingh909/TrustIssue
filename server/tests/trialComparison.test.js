import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import trialService from '../src/services/trialService';
import { prisma } from '../src/utils/prisma';

describe('TrialService - Repeated Trials & Comparative Analytics', () => {
  let createdRunIds = [];

  beforeEach(() => {
    trialService.activeBatches.clear();
  });

  afterEach(async () => {
    if (createdRunIds.length > 0) {
      await prisma.testRun.deleteMany({
        where: { id: { in: createdRunIds } }
      });
      createdRunIds = [];
    }
  });

  describe('calculateAgentMetrics - Metric Formulas & Denominator Transparency', () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Baseline Mock Target',
      provider: 'mock',
      model: 'mock-baseline',
      configuration: { defenseType: 'none' }
    };

    it('calculates 100% pass rate when all conclusive trials pass', () => {
      const runs = [
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 120, findings: [] },
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 140, findings: [] },
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 100, findings: [] }
      ];

      const metrics = trialService.calculateAgentMetrics(mockAgent, runs);

      expect(metrics.totalTrials).toBe(3);
      expect(metrics.conclusiveCount).toBe(3);
      expect(metrics.passedCount).toBe(3);
      expect(metrics.failedCount).toBe(0);
      expect(metrics.inconclusiveCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.passRate).toBe(100);
      expect(metrics.failureRate).toBe(0);
      expect(metrics.passRateDenominator).toBe('3/3');
      expect(metrics.avgDurationMs).toBe(120);
      expect(metrics.isMock).toBe(true);
    });

    it('calculates 0% pass rate when all conclusive trials fail', () => {
      const runs = [
        {
          status: 'FAILED',
          verdict: 'FAIL',
          durationMs: 150,
          findings: [{ severity: 'CRITICAL', title: 'Injection' }]
        },
        {
          status: 'FAILED',
          verdict: 'FAIL',
          durationMs: 160,
          findings: [{ severity: 'HIGH', title: 'Bypass' }]
        }
      ];

      const metrics = trialService.calculateAgentMetrics(mockAgent, runs);

      expect(metrics.totalTrials).toBe(2);
      expect(metrics.conclusiveCount).toBe(2);
      expect(metrics.passedCount).toBe(0);
      expect(metrics.failedCount).toBe(2);
      expect(metrics.passRate).toBe(0);
      expect(metrics.failureRate).toBe(100);
      expect(metrics.passRateDenominator).toBe('0/2');
      expect(metrics.criticalFindings).toBe(1);
      expect(metrics.highFindings).toBe(1);
    });

    it('excludes INCONCLUSIVE and ERROR results from the pass/fail denominator', () => {
      // 3 PASS, 1 FAIL, 1 INCONCLUSIVE, 1 ERROR -> 4 Conclusive trials (3/4 = 75% pass rate)
      const runs = [
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 100 },
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 100 },
        { status: 'COMPLETED', verdict: 'PASS', durationMs: 100 },
        { status: 'FAILED', verdict: 'FAIL', durationMs: 100 },
        { status: 'INCONCLUSIVE', verdict: 'INCONCLUSIVE', durationMs: 50 },
        { status: 'ERROR', verdict: 'ERROR', durationMs: 20 }
      ];

      const metrics = trialService.calculateAgentMetrics(mockAgent, runs);

      expect(metrics.totalTrials).toBe(6);
      expect(metrics.conclusiveCount).toBe(4);
      expect(metrics.passedCount).toBe(3);
      expect(metrics.failedCount).toBe(1);
      expect(metrics.inconclusiveCount).toBe(1);
      expect(metrics.errorCount).toBe(1);

      // Pass rate should be 3/4 = 75.0%
      expect(metrics.passRate).toBe(75);
      expect(metrics.failureRate).toBe(25);
      expect(metrics.passRateDenominator).toBe('3/4');
      expect(metrics.failureRateDenominator).toBe('1/4');
      expect(metrics.excludedCount).toBe(2);
      expect(metrics.denominatorExplanation).toContain('4 conclusive trials');
    });

    it('handles zero conclusive trials gracefully without dividing by zero', () => {
      // Only errors and inconclusive runs
      const runs = [
        { status: 'INCONCLUSIVE', verdict: 'INCONCLUSIVE', durationMs: 50 },
        { status: 'ERROR', verdict: 'ERROR', durationMs: 30 }
      ];

      const metrics = trialService.calculateAgentMetrics(mockAgent, runs);

      expect(metrics.totalTrials).toBe(2);
      expect(metrics.conclusiveCount).toBe(0);
      expect(metrics.passedCount).toBe(0);
      expect(metrics.failedCount).toBe(0);
      expect(metrics.passRate).toBe(0);
      expect(metrics.failureRate).toBe(0);
      expect(metrics.passRateDenominator).toBe('0/0');
      expect(metrics.canaryDisclosureRate).toBe(0);
    });

    it('accurately calculates canary disclosure and unauthorized tool rates', () => {
      const runs = [
        // Trial 1: Canary disclosed
        {
          status: 'FAILED',
          verdict: 'FAIL',
          durationMs: 100,
          findings: [{ severity: 'CRITICAL', title: 'Synthetic Sensitive Data Disclosure' }],
          details: {
            behaviorClassification: { mentioningMaliciousText: true }
          }
        },
        // Trial 2: Unauthorized tool attempted and blocked
        {
          status: 'FAILED',
          verdict: 'FAIL',
          durationMs: 110,
          findings: [
            {
              severity: 'HIGH',
              title: 'Unauthorized Simulated Tool Invocation: simulated_send_email [BLOCKED_ATTEMPT]',
              evidence: { allowedTools: [], actionStatus: 'ATTEMPTED_AND_BLOCKED' }
            }
          ],
          details: {
            behaviorClassification: { attemptingUnauthorizedAction: true }
          }
        },
        // Trial 3: Unauthorized tool executed
        {
          status: 'FAILED',
          verdict: 'FAIL',
          durationMs: 120,
          findings: [
            {
              severity: 'CRITICAL',
              title: 'Unauthorized Simulated Tool Invocation: simulated_send_email [EXECUTED]',
              evidence: { allowedTools: [], actionStatus: 'EXECUTED' }
            }
          ],
          details: {
            behaviorClassification: {
              attemptingUnauthorizedAction: true,
              successfullyExecutingUnauthorizedAction: true
            }
          }
        },
        // Trial 4: Clean PASS
        {
          status: 'COMPLETED',
          verdict: 'PASS',
          durationMs: 90,
          findings: [],
          details: {
            behaviorClassification: {}
          }
        }
      ];

      const metrics = trialService.calculateAgentMetrics(mockAgent, runs);

      expect(metrics.totalTrials).toBe(4);
      expect(metrics.conclusiveCount).toBe(4);
      expect(metrics.canaryDisclosureCount).toBe(1);
      expect(metrics.canaryDisclosureRate).toBe(25);
      expect(metrics.canaryDisclosureDenominator).toBe('1/4');

      expect(metrics.unauthorizedAttemptCount).toBe(2);
      expect(metrics.unauthorizedAttemptRate).toBe(50);
      expect(metrics.unauthorizedAttemptDenominator).toBe('2/4');

      expect(metrics.unauthorizedExecutionCount).toBe(1);
      expect(metrics.unauthorizedExecutionRate).toBe(25);
      expect(metrics.unauthorizedExecutionDenominator).toBe('1/4');
    });

    it('distinguishes real-model agent from mock agent and collects token usage', () => {
      const realAgent = {
        id: 'real-groq-1',
        name: 'Groq Qwen Live Model',
        provider: 'groq',
        model: 'qwen-2.5-32b',
        configuration: { defenseType: 'strict_hierarchy' }
      };

      const runs = [
        {
          status: 'COMPLETED',
          verdict: 'PASS',
          durationMs: 400,
          evaluationResult: {
            metadata: {
              promptTokens: 150,
              completionTokens: 40,
              totalTokens: 190
            }
          }
        },
        {
          status: 'COMPLETED',
          verdict: 'PASS',
          durationMs: 450,
          evaluationResult: {
            metadata: {
              promptTokens: 150,
              completionTokens: 50,
              totalTokens: 200
            }
          }
        }
      ];

      const metrics = trialService.calculateAgentMetrics(realAgent, runs);

      expect(metrics.isMock).toBe(false);
      expect(metrics.provider).toBe('groq');
      expect(metrics.model).toBe('qwen-2.5-32b');
      expect(metrics.tokenUsage.promptTokens).toBe(300);
      expect(metrics.tokenUsage.completionTokens).toBe(90);
      expect(metrics.tokenUsage.totalTokens).toBe(390);
    });
  });

  describe('generateComparisonSummary - Ranking & Divergence', () => {
    it('ranks agents correctly and flags divergence between guarded and vulnerable configs', () => {
      const agentA = {
        agentId: 'a1',
        agentName: 'Guarded Agent',
        isMock: true,
        passRate: 100,
        passRateDenominator: '5/5',
        conclusiveCount: 5,
        criticalFindings: 0
      };

      const agentB = {
        agentId: 'b2',
        agentName: 'Baseline Vulnerable Agent',
        isMock: true,
        passRate: 0,
        passRateDenominator: '0/5',
        conclusiveCount: 5,
        criticalFindings: 5
      };

      const summary = trialService.generateComparisonSummary([agentB, agentA]);

      expect(summary.agentCount).toBe(2);
      expect(summary.mostResilient.agentId).toBe('a1');
      expect(summary.mostResilient.passRate).toBe(100);
      expect(summary.leastResilient.agentId).toBe('b2');
      expect(summary.leastResilient.passRate).toBe(0);
      expect(summary.divergenceObserved).toBe(true);
      expect(summary.rankings[0].agentId).toBe('a1');
      expect(summary.rankings[1].agentId).toBe('b2');
    });
  });

  describe('executeTrials - Validation & Safeguards', () => {
    it('rejects trialsCount outside [1, 20]', async () => {
      await expect(
        trialService.executeTrials({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: ['00000000-0000-0000-0000-000000000002'],
          trialsCount: 0
        })
      ).rejects.toThrow(/trialsCount must be a bounded integer between 1 and 20/);

      await expect(
        trialService.executeTrials({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: ['00000000-0000-0000-0000-000000000002'],
          trialsCount: 25
        })
      ).rejects.toThrow(/trialsCount must be a bounded integer between 1 and 20/);
    });

    it('rejects empty agentIds or excessive batch sizes', async () => {
      await expect(
        trialService.executeTrials({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: [],
          trialsCount: 3
        })
      ).rejects.toThrow(/agentIds must be a non-empty array/);

      // 4 agents * 10 trials = 40 runs > 30 maximum limit
      await expect(
        trialService.executeTrials({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: ['id1', 'id2', 'id3', 'id4'],
          trialsCount: 10
        })
      ).rejects.toThrow(/exceeds maximum safety limit of 30 runs/);
    });

    it('prevents concurrent duplicate submissions using re-entrancy mutex', async () => {
      const testCaseId = 'test-tc-mutex';
      const agentIds = ['agent-1', 'agent-2'];

      // Manually add key to activeBatches to simulate an in-flight batch
      const batchKey = trialService.getBatchKey(testCaseId, agentIds);
      trialService.activeBatches.add(batchKey);

      await expect(
        trialService.executeTrials({
          testCaseId,
          agentIds,
          trialsCount: 2
        })
      ).rejects.toThrow(/currently in progress/);

      trialService.activeBatches.clear();
    });

    it('executes repeated trials across multiple mock agents and records independent runs', async () => {
      const testCase = await prisma.testCase.findFirst({
        where: { testId: 'TC-DPI-001' }
      });
      const safeAgent = await prisma.agent.findFirst({
        where: { name: 'Guarded Mitigated Agent' }
      });
      const vulnAgent = await prisma.agent.findFirst({
        where: { name: 'Baseline Unprotected Agent' }
      });

      expect(testCase).toBeDefined();
      expect(safeAgent).toBeDefined();
      expect(vulnAgent).toBeDefined();

      const result = await trialService.executeTrials({
        testCaseId: testCase.id,
        agentIds: [safeAgent.id, vulnAgent.id],
        trialsCount: 2
      });

      // 2 agents * 2 trials = 4 executions
      expect(result.trialsCount).toBe(2);
      expect(result.totalExecutions).toBe(4);
      expect(result.agents).toHaveLength(2);

      const safeMetrics = result.agents.find(a => a.agentId === safeAgent.id);
      const vulnMetrics = result.agents.find(a => a.agentId === vulnAgent.id);

      expect(safeMetrics.totalTrials).toBe(2);
      expect(safeMetrics.conclusiveCount).toBe(2);
      expect(safeMetrics.passRate).toBe(100);
      expect(safeMetrics.passRateDenominator).toBe('2/2');
      expect(safeMetrics.runs).toHaveLength(2);

      expect(vulnMetrics.totalTrials).toBe(2);
      expect(vulnMetrics.conclusiveCount).toBe(2);
      expect(vulnMetrics.passRate).toBe(0);
      expect(vulnMetrics.passRateDenominator).toBe('0/2');
      expect(vulnMetrics.runs).toHaveLength(2);

      // Collect run IDs to clean up in afterEach
      for (const agentRes of result.agents) {
        for (const r of agentRes.runs) {
          if (r.testRunId) createdRunIds.push(r.testRunId);
        }
      }

      expect(result.comparisonSummary.mostResilient.agentId).toBe(safeAgent.id);
      expect(result.comparisonSummary.leastResilient.agentId).toBe(vulnAgent.id);
      expect(result.comparisonSummary.divergenceObserved).toBe(true);
      expect(result.statisticalNotice).toBeDefined();
      expect(result.statisticalNotice.statement).toContain('EMPIRICAL BENCHMARK LIMITATION');
    });
  });

  describe('POST /api/test-runs/trials - API Route Integration', () => {
    it('returns 400 when agentIds is empty or missing', async () => {
      const res = await request(app)
        .post('/api/test-runs/trials')
        .send({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: [],
          trialsCount: 3
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 when trialsCount exceeds bounded limit of 20', async () => {
      const res = await request(app)
        .post('/api/test-runs/trials')
        .send({
          testCaseId: '00000000-0000-0000-0000-000000000001',
          agentIds: ['00000000-0000-0000-0000-000000000002'],
          trialsCount: 25
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('executes trial batch through HTTP endpoint and returns structured comparative metrics', async () => {
      const testCase = await prisma.testCase.findFirst({
        where: { testId: 'TC-DPI-001' }
      });
      const safeAgent = await prisma.agent.findFirst({
        where: { name: 'Guarded Mitigated Agent' }
      });

      const res = await request(app)
        .post('/api/test-runs/trials')
        .send({
          testCaseId: testCase.id,
          agentIds: [safeAgent.id],
          trialsCount: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.trialsCount).toBe(2);
      expect(res.body.data.agents).toHaveLength(1);
      expect(res.body.data.agents[0].passRate).toBe(100);
      expect(res.body.data.agents[0].passRateDenominator).toBe('2/2');
      expect(res.body.data.statisticalNotice).toBeDefined();

      // Clean up test runs created during test
      for (const r of res.body.data.agents[0].runs) {
        if (r.testRunId) createdRunIds.push(r.testRunId);
      }
    });
  });
});
