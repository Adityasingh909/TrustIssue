const { prisma } = require('../utils/prisma');

class MetricsController {
  async getSummary(req, res, next) {
    try {
      // 1. Fetch all test runs with associated test case and agent
      const runs = await prisma.testRun.findMany({
        include: {
          testCase: { select: { id: true, category: true, severity: true } },
          agent: { select: { id: true, name: true, provider: true } },
          findings: { select: { id: true, severity: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalRuns = runs.length;
      let completedCount = 0; // PASS
      let failedCount = 0;    // FAIL
      let inconclusiveCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      const categoryStats = {};
      const findingsBySeverity = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      };

      for (const run of runs) {
        // Status breakdown
        if (run.status === 'COMPLETED') completedCount++;
        else if (run.status === 'FAILED') failedCount++;
        else if (run.status === 'INCONCLUSIVE') inconclusiveCount++;
        else if (run.status === 'ERROR') errorCount++;
        else if (run.status === 'SKIPPED') skippedCount++;

        // Category breakdown
        const cat = run.testCase?.category || 'UNKNOWN';
        if (!categoryStats[cat]) {
          categoryStats[cat] = { total: 0, passed: 0, failed: 0, other: 0 };
        }
        categoryStats[cat].total++;
        if (run.status === 'COMPLETED') categoryStats[cat].passed++;
        else if (run.status === 'FAILED') categoryStats[cat].failed++;
        else categoryStats[cat].other++;

        // Findings count
        for (const finding of run.findings || []) {
          const sev = finding.severity || 'MEDIUM';
          if (findingsBySeverity[sev] !== undefined) {
            findingsBySeverity[sev]++;
          }
        }
      }

      const passRate = (completedCount + failedCount) > 0
        ? Math.round((completedCount / (completedCount + failedCount)) * 100)
        : 0;

      // Category pass rates array for Recharts
      const categoryRates = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        total: stats.total,
        passed: stats.passed,
        failed: stats.failed,
        passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
      }));

      // Timeline entries (up to last 20 runs formatted for historical chart)
      const timeline = runs
        .slice(0, 20)
        .reverse()
        .map((run, idx) => ({
          runIndex: idx + 1,
          date: run.completedAt || run.createdAt,
          verdict: run.status === 'COMPLETED' ? 'PASS' : run.status,
          durationMs: run.durationMs || 0,
          category: run.testCase?.category,
          agentName: run.agent?.name
        }));

      return res.status(200).json({
        data: {
          totalRuns,
          completedCount,
          failedCount,
          inconclusiveCount,
          errorCount,
          skippedCount,
          passRate,
          findingsBySeverity,
          categoryRates,
          timeline,
          recentRuns: runs.slice(0, 10).map(r => ({
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            durationMs: r.durationMs,
            agentName: r.agent?.name,
            provider: r.agent?.provider,
            testCaseTitle: r.testCase?.title,
            category: r.testCase?.category,
            findingsCount: r.findings?.length || 0
          }))
        }
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new MetricsController();
