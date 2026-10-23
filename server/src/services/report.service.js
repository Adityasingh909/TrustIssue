const { prisma } = require('../utils/prisma');
const dbService = require('./db.service');

// All recognized attack categories in TrustIssues
const ALL_CATEGORIES = [
  'DIRECT_INJECTION',
  'INDIRECT_DOCUMENT_INJECTION',
  'TASK_HIJACKING',
  'SYNTHETIC_DATA_DISCLOSURE',
  'INSTRUCTION_HIERARCHY',
  'UNAUTHORIZED_TOOL_USE',
  'OUTPUT_INTEGRITY',
  'EXCESSIVE_AGENCY'
];

// Display names for human-readable audit presentation
const CATEGORY_NAMES = {
  DIRECT_INJECTION: 'Direct Prompt Injection',
  INDIRECT_DOCUMENT_INJECTION: 'Indirect Document Injection',
  TASK_HIJACKING: 'Task & Context Hijacking',
  SYNTHETIC_DATA_DISCLOSURE: 'Synthetic Canary & Data Disclosure',
  INSTRUCTION_HIERARCHY: 'Instruction Hierarchy Confusion',
  UNAUTHORIZED_TOOL_USE: 'Simulated Unauthorized Tool Use',
  OUTPUT_INTEGRITY: 'Output Integrity & Parser Injection',
  EXCESSIVE_AGENCY: 'Excessive Agency & Autonomous Action'
};

// Known limitations documented for all evidence-based reports
const REPORT_LIMITATIONS = [
  {
    title: 'Heuristic & Static Rules Boundary',
    description: 'Security evaluations use deterministic rule-based checks, substring matches, canary tracking, and simulated tool interception. Novel or obfuscated attack variants may evade pattern detection.'
  },
  {
    title: 'Deterministic Mock vs Stochastic Live Separation',
    description: 'Mock agent runs utilize deterministic responses designed for benchmark repeatability. Live language models exhibit non-deterministic stochastic variability across inference temperatures.'
  },
  {
    title: 'Absence of Universal Security Certification',
    description: 'No universal security rating (e.g. letter grade or overall safe/unsafe certification) is assigned. Agent security is multi-dimensional; high resistance to prompt injection does not imply safety against indirect document attacks or tool misuse.'
  },
  {
    title: 'Infrastructure & Operational Error Isolation',
    description: 'Model inference timeouts, rate limits, network failures, or missing credentials are classified strictly as ERROR and excluded from security pass/fail rate calculations.'
  },
  {
    title: 'Simulated Tool-Use Environment Boundary',
    description: 'Observable tool executions reflect simulated sandbox calls. They do not execute arbitrary shell commands, destructive database modifications, or production external network requests.'
  }
];

// Formula and documentation for the Weighted Risk Index
const WEIGHTED_SCORE_SPEC = {
  name: 'Weighted Risk Index (WRI)',
  formula: 'WRI = (CRITICAL_FINDINGS * 10 + HIGH_FINDINGS * 5 + MEDIUM_FINDINGS * 2 + LOW_FINDINGS * 1) / Math.max(conclusiveTests, 1)',
  weights: {
    CRITICAL: 10,
    HIGH: 5,
    MEDIUM: 2,
    LOW: 1
  },
  description: 'A normalized indicator of vulnerability severity density per conclusive test run. A score of 0.0 indicates zero observed vulnerabilities across conclusive tests.',
  limitations: 'The Weighted Risk Index is an empirical heuristic weighting of detected findings in tested scenarios. It is not an exhaustive guarantee of immunity against untested prompts, zero-days, or edge cases.'
};

/**
 * Sanitizes text or object to prevent accidental exposure of genuine secrets or API keys.
 * Preserves evidence snippets, canary tokens, and actual response text.
 */
function sanitizeContent(content) {
  if (!content) return content;
  if (typeof content === 'string') {
    return content
      .replace(/AI_API_KEY=[^\s&"']+/gi, 'AI_API_KEY=[REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, 'Bearer [REDACTED]')
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/gi, 'sk-[REDACTED]');
  }
  if (typeof content === 'object') {
    try {
      const serialized = JSON.stringify(content);
      const sanitized = sanitizeContent(serialized);
      return JSON.parse(sanitized);
    } catch {
      return content;
    }
  }
  return content;
}

/**
 * Normalizes test run verdict into standard values: PASS, FAIL, INCONCLUSIVE, ERROR, SKIPPED.
 */
function normalizeVerdict(run) {
  if (!run) return 'INCONCLUSIVE';
  if (run.status === 'ERROR') return 'ERROR';
  if (run.status === 'SKIPPED') return 'SKIPPED';
  if (run.status === 'FAILED') return 'FAIL';
  if (run.status === 'INCONCLUSIVE') return 'INCONCLUSIVE';

  const evalVerdict = run.evaluationResult?.verdict;
  if (evalVerdict) {
    if (evalVerdict === 'PASS') return 'PASS';
    if (evalVerdict === 'FAIL') return 'FAIL';
    if (evalVerdict === 'INCONCLUSIVE') return 'INCONCLUSIVE';
    if (evalVerdict === 'ERROR') return 'ERROR';
    if (evalVerdict === 'SKIPPED') return 'SKIPPED';
  }

  if (run.status === 'COMPLETED') {
    return run.findings && run.findings.length > 0 ? 'FAIL' : 'PASS';
  }

  return 'INCONCLUSIVE';
}

/**
 * Pure function: calculates evidence-based metrics from an array of stored test run objects.
 * Supports empty datasets, inconclusive runs, errors, and mixed mock vs live models.
 */
function calculateMetricsFromRuns(runs = []) {
  const safeRuns = Array.isArray(runs) ? runs : [];
  const totalTests = safeRuns.length;

  let passed = 0;
  let failed = 0;
  let inconclusive = 0;
  let error = 0;
  let skipped = 0;

  const findingsBySeverity = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  // Groupings for partitions and categories
  const mockRuns = [];
  const liveRuns = [];
  const runsByCategory = {};
  const agentMap = {};
  const allFindings = [];

  for (const cat of ALL_CATEGORIES) {
    runsByCategory[cat] = [];
  }

  for (const run of safeRuns) {
    const verdict = normalizeVerdict(run);
    const agent = run.agent || {};
    const isMock = agent.provider === 'mock' || run.evaluationResult?.isMock === true;

    // Track status counts
    if (verdict === 'PASS') passed++;
    else if (verdict === 'FAIL') failed++;
    else if (verdict === 'INCONCLUSIVE') inconclusive++;
    else if (verdict === 'ERROR') error++;
    else if (verdict === 'SKIPPED') skipped++;

    // Partition by mock vs live
    if (isMock) {
      mockRuns.push(run);
    } else {
      liveRuns.push(run);
    }

    // Category tracking
    const category = run.testCase?.category || 'DIRECT_INJECTION';
    if (!runsByCategory[category]) {
      runsByCategory[category] = [];
    }
    runsByCategory[category].push({ run, verdict });

    // Agent tracking
    const agentId = agent.id || run.agentId || 'unknown-agent';
    if (!agentMap[agentId]) {
      agentMap[agentId] = {
        agentId,
        name: agent.name || 'Unnamed Agent',
        provider: agent.provider || 'unknown',
        model: agent.model || 'unknown',
        isMock,
        type: isMock ? 'MOCK_AGENT' : 'LIVE_MODEL',
        configuration: sanitizeContent(agent.configuration || {}),
        totalTests: 0,
        passed: 0,
        failed: 0,
        inconclusive: 0,
        error: 0,
        skipped: 0
      };
    }
    const aStat = agentMap[agentId];
    aStat.totalTests++;
    if (verdict === 'PASS') aStat.passed++;
    else if (verdict === 'FAIL') aStat.failed++;
    else if (verdict === 'INCONCLUSIVE') aStat.inconclusive++;
    else if (verdict === 'ERROR') aStat.error++;
    else if (verdict === 'SKIPPED') aStat.skipped++;

    // Process findings
    const runFindings = Array.isArray(run.findings) ? run.findings : [];
    for (const f of runFindings) {
      const sev = f.severity || 'MEDIUM';
      if (findingsBySeverity[sev] !== undefined) {
        findingsBySeverity[sev]++;
      }
      allFindings.push({
        id: f.id,
        testRunId: run.id,
        createdAt: f.createdAt || run.createdAt,
        title: f.title,
        description: f.description,
        severity: sev,
        category,
        agentId: aStat.agentId,
        agentName: aStat.name,
        agentProvider: aStat.provider,
        isMock,
        testCaseId: run.testCase?.id || run.testCaseId,
        testId: run.testCase?.testId || null,
        testCaseTitle: run.testCase?.title || 'Unknown Test Case',
        testCaseVersion: run.testCase?.version || 1,
        evidence: sanitizeContent(f.evidence || {}),
        recommendation: f.recommendation || run.testCase?.mitigation || 'Implement instruction boundaries and delimiter fences.'
      });
    }
  }

  // Calculate conclusive pass rates (CRITICAL: exclude inconclusive and errors)
  const conclusive = passed + failed;
  const passRate = conclusive > 0 ? Number(((passed / conclusive) * 100).toFixed(1)) : 0;
  const failRate = conclusive > 0 ? Number(((failed / conclusive) * 100).toFixed(1)) : 0;
  const inconclusiveRate = totalTests > 0 ? Number(((inconclusive / totalTests) * 100).toFixed(1)) : 0;
  const errorRate = totalTests > 0 ? Number(((error / totalTests) * 100).toFixed(1)) : 0;

  // Calculate agent conclusive pass rates
  const agentProfiles = Object.values(agentMap).map(a => {
    const aConclusive = a.passed + a.failed;
    return {
      ...a,
      conclusive: aConclusive,
      passRate: aConclusive > 0 ? Number(((a.passed / aConclusive) * 100).toFixed(1)) : 0
    };
  });

  // Calculate separated mock vs live partitions
  const calculatePartition = (subRuns, label, isMock) => {
    let p = 0;
    let f = 0;
    let inc = 0;
    let err = 0;
    let skp = 0;
    for (const r of subRuns) {
      const v = normalizeVerdict(r);
      if (v === 'PASS') p++;
      else if (v === 'FAIL') f++;
      else if (v === 'INCONCLUSIVE') inc++;
      else if (v === 'ERROR') err++;
      else if (v === 'SKIPPED') skp++;
    }
    const conc = p + f;
    return {
      partition: label,
      isMock,
      totalTests: subRuns.length,
      conclusive: conc,
      passed: p,
      failed: f,
      inconclusive: inc,
      error: err,
      skipped: skp,
      passRate: conc > 0 ? Number(((p / conc) * 100).toFixed(1)) : 0,
      note: isMock
        ? 'Deterministic synthetic test fixtures; not representative of live stochastic model evaluations.'
        : 'Live model inference runs.'
    };
  };

  const mockPartition = calculatePartition(mockRuns, 'MOCK_AGENTS', true);
  const livePartition = calculatePartition(liveRuns, 'LIVE_MODELS', false);

  // Category breakdown
  const categoryBreakdown = ALL_CATEGORIES.map(category => {
    const list = runsByCategory[category] || [];
    let p = 0;
    let f = 0;
    let inc = 0;
    let err = 0;
    let skp = 0;
    for (const item of list) {
      if (item.verdict === 'PASS') p++;
      else if (item.verdict === 'FAIL') f++;
      else if (item.verdict === 'INCONCLUSIVE') inc++;
      else if (item.verdict === 'ERROR') err++;
      else if (item.verdict === 'SKIPPED') skp++;
    }
    const conc = p + f;
    const catFindings = allFindings.filter(find => find.category === category);
    const mitigations = [...new Set(catFindings.map(find => find.recommendation).filter(Boolean))];

    return {
      category,
      displayName: CATEGORY_NAMES[category] || category,
      total: list.length,
      conclusive: conc,
      passed: p,
      failed: f,
      inconclusive: inc,
      error: err,
      skipped: skp,
      passRate: conc > 0 ? Number(((p / conc) * 100).toFixed(1)) : 0,
      findingsCount: catFindings.length,
      mitigations
    };
  });

  // Calculate Weighted Risk Index
  const weightedScoreValue = conclusive > 0
    ? Number((
        (findingsBySeverity.CRITICAL * WEIGHTED_SCORE_SPEC.weights.CRITICAL +
         findingsBySeverity.HIGH * WEIGHTED_SCORE_SPEC.weights.HIGH +
         findingsBySeverity.MEDIUM * WEIGHTED_SCORE_SPEC.weights.MEDIUM +
         findingsBySeverity.LOW * WEIGHTED_SCORE_SPEC.weights.LOW) /
        conclusive
      ).toFixed(2))
    : 0;

  // Recommended mitigations summary (deduplicated & prioritized)
  const mitigationMap = {};
  for (const finding of allFindings) {
    const rec = finding.recommendation;
    if (!rec) continue;
    if (!mitigationMap[rec]) {
      mitigationMap[rec] = {
        recommendation: rec,
        category: finding.category,
        highestSeverity: finding.severity,
        affectedAgents: new Set(),
        occurrenceCount: 0
      };
    }
    mitigationMap[rec].occurrenceCount++;
    mitigationMap[rec].affectedAgents.add(finding.agentName);
  }

  const recommendedMitigations = Object.values(mitigationMap).map(m => ({
    recommendation: m.recommendation,
    category: m.category,
    highestSeverity: m.highestSeverity,
    occurrenceCount: m.occurrenceCount,
    affectedAgents: Array.from(m.affectedAgents)
  })).sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  return {
    totalTests,
    conclusive,
    passed,
    failed,
    inconclusive,
    error,
    skipped,
    passRate,
    failRate,
    inconclusiveRate,
    errorRate,
    findingsBySeverity,
    totalFindings: allFindings.length,
    agentProfiles,
    partitions: {
      mock: mockPartition,
      live: livePartition,
      separationNotice: 'Mock agent results are strictly partitioned from live model executions to prevent false evaluation equivalence.'
    },
    universalSecurityRating: null,
    ratingNotice: 'Universal security rating intentionally omitted. Evaluation of AI agent security requires multidimensional threat modeling rather than a single grade.',
    weightedRiskIndex: {
      score: weightedScoreValue,
      ...WEIGHTED_SCORE_SPEC
    },
    categoryBreakdown,
    detailedFindings: allFindings,
    recommendedMitigations,
    limitations: REPORT_LIMITATIONS,
    referencedRunIds: safeRuns.map(r => r.id)
  };
}

/**
 * Generates an executive summary narrative from calculated metrics.
 */
function generateSummaryText(metrics, options = {}) {
  const { totalTests, passed, failed, inconclusive, error, passRate, findingsBySeverity, agentProfiles } = metrics;

  if (totalTests === 0) {
    return 'No test runs found matching the requested criteria. Evaluation dataset is currently empty.';
  }

  const agentNames = agentProfiles.map(a => `${a.name} (${a.type})`).join(', ');
  const sevParts = [];
  if (findingsBySeverity.CRITICAL > 0) sevParts.push(`${findingsBySeverity.CRITICAL} Critical`);
  if (findingsBySeverity.HIGH > 0) sevParts.push(`${findingsBySeverity.HIGH} High`);
  if (findingsBySeverity.MEDIUM > 0) sevParts.push(`${findingsBySeverity.MEDIUM} Medium`);
  if (findingsBySeverity.LOW > 0) sevParts.push(`${findingsBySeverity.LOW} Low`);
  const sevText = sevParts.length > 0 ? sevParts.join(', ') : 'Zero findings';

  let narrative = `Security assessment evaluated ${totalTests} test runs across ${agentProfiles.length} agent configuration(s): ${agentNames}. ` +
    `Across conclusive tests, the evaluated agents achieved an aggregate conclusive pass rate of ${passRate}% (${passed} passed, ${failed} failed). ` +
    `Operational exceptions were tracked separately with ${inconclusive} inconclusive run(s) and ${error} execution error(s). ` +
    `A total of ${metrics.totalFindings} security finding(s) were recorded (${sevText}).`;

  if (metrics.partitions.mock.totalTests > 0 && metrics.partitions.live.totalTests > 0) {
    narrative += ` Note: Assessment includes both deterministic mock test fixtures (${metrics.partitions.mock.totalTests} runs) and live model inference (${metrics.partitions.live.totalTests} runs), which are reported under separate partitions.`;
  }

  return narrative;
}

/**
 * Service handling evidence-based report generation and formatting.
 */
class ReportService {
  /**
   * Generates and persists a comprehensive security report from stored database test runs.
   * @param {Object} [options]
   * @param {string} [options.agentId] - Filter by specific agent
   * @param {string} [options.title] - Custom report title
   * @param {string} [options.userId] - Optional creator user ID
   * @param {Array<string>} [options.testRunIds] - Explicit list of test run IDs to include
   */
  async generateReport(options = {}) {
    const where = {};
    if (options.agentId) {
      where.agentId = options.agentId;
    }
    if (Array.isArray(options.testRunIds) && options.testRunIds.length > 0) {
      where.id = { in: options.testRunIds };
    }

    // Query actual stored test runs with full relations
    const storedRuns = await prisma.testRun.findMany({
      where,
      include: {
        agent: true,
        testCase: true,
        findings: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const metrics = calculateMetricsFromRuns(storedRuns);
    const title = options.title || `AI Agent Security Assessment Report - ${new Date().toISOString().split('T')[0]}`;
    const summary = generateSummaryText(metrics, options);

    // Persist report in PostgreSQL database
    const createdReport = await dbService.createReport({
      title,
      summary,
      metrics,
      userId: options.userId || null
    });

    return {
      id: createdReport.id,
      title: createdReport.title,
      summary: createdReport.summary,
      createdAt: createdReport.createdAt,
      metrics,
      downloadFilename: `trustissues-security-report-${createdReport.id.substring(0, 8)}.json`
    };
  }

  /**
   * Retrieves a stored report by ID and deserializes its full evidence-based payload.
   */
  async getReportById(id) {
    const report = await dbService.getReportById(id);
    return {
      id: report.id,
      title: report.title,
      summary: report.summary,
      createdAt: report.createdAt,
      userId: report.userId,
      user: report.user,
      metrics: report.metrics,
      downloadFilename: `trustissues-security-report-${report.id.substring(0, 8)}.json`
    };
  }

  /**
   * Lists all generated reports stored in the database.
   */
  async listReports() {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } }
      }
    });

    return reports.map(r => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      createdAt: r.createdAt,
      user: r.user,
      totalTests: r.metrics?.totalTests || 0,
      passRate: r.metrics?.passRate ?? 0,
      conclusive: r.metrics?.conclusive ?? 0,
      failed: r.metrics?.failed ?? 0,
      inconclusive: r.metrics?.inconclusive ?? 0,
      error: r.metrics?.error ?? 0,
      findingsCount: r.metrics?.totalFindings ?? 0
    }));
  }

  /**
   * Formats a complete report as a downloadable GitHub Flavored Markdown audit brief.
   */
  formatReportAsMarkdown(report) {
    const m = report.metrics || {};
    const genDate = new Date(report.createdAt).toUTCString();

    let md = `# ${report.title}\n\n`;
    md += `**Report ID:** \`${report.id}\`  \n`;
    md += `**Generated At:** ${genDate}  \n`;
    md += `**Evaluation Platform:** TrustIssues AI Agent Security Testing Lab  \n\n`;

    md += `## 1. Executive Summary\n\n${report.summary}\n\n`;

    md += `## 2. Conclusive Security Metrics\n\n`;
    md += `> **Conclusive Pass Rate Rule:** Pass rates are calculated exclusively from conclusive test results (Pass vs Fail). Inconclusive runs and system execution errors are tracked independently and never treated as passes or fails.\n\n`;
    md += `| Metric | Count / Percentage | Definition |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Total Evaluations** | \`${m.totalTests || 0}\` | Total test run executions in audit |\n`;
    md += `| **Conclusive Runs** | \`${m.conclusive || 0}\` | Evaluated runs with definitive compliance outcome |\n`;
    md += `| **Passed Tests** | \`${m.passed || 0}\` | Security boundaries upheld |\n`;
    md += `| **Failed Tests** | \`${m.failed || 0}\` | Vulnerability confirmed (policy violation) |\n`;
    md += `| **Inconclusive** | \`${m.inconclusive || 0}\` | Ambiguous completion or indeterminate behavior |\n`;
    md += `| **Execution Errors** | \`${m.error || 0}\` | System/model infrastructure failure (non-vulnerability) |\n`;
    md += `| **Conclusive Pass Rate** | **\`${m.passRate || 0}%\`** | \`Passed / (Passed + Failed)\` |\n\n`;

    md += `## 3. Mock vs Live Model Separation\n\n`;
    md += `> [!NOTE]\n`;
    md += `> ${m.partitions?.separationNotice || 'Mock agent results are strictly partitioned from live model executions.'}\n\n`;
    md += `| Partition | Type | Total Runs | Conclusive | Passed | Failed | Pass Rate |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    if (m.partitions?.mock) {
      const mock = m.partitions.mock;
      md += `| **Mock Agents** | \`SYNTHETIC_MOCK\` | ${mock.totalTests} | ${mock.conclusive} | ${mock.passed} | ${mock.failed} | **${mock.passRate}%** |\n`;
    }
    if (m.partitions?.live) {
      const live = m.partitions.live;
      md += `| **Live Models** | \`LIVE_INFERENCE\` | ${live.totalTests} | ${live.conclusive} | ${live.passed} | ${live.failed} | **${live.passRate}%** |\n`;
    }
    md += `\n`;

    md += `## 4. Evaluated Agent Profiles\n\n`;
    const profiles = m.agentProfiles || [];
    for (const a of profiles) {
      md += `### ${a.name} (\`${a.type}\`)\n`;
      md += `- **Provider:** \`${a.provider}\` | **Model:** \`${a.model}\`\n`;
      md += `- **Conclusive Pass Rate:** \`${a.passRate}%\` (${a.passed}/${a.conclusive} conclusive runs)\n`;
      md += `- **Inconclusive / Errors:** ${a.inconclusive} inconclusive, ${a.error} error(s)\n`;
      md += `- **Defense Policy:** \`${a.configuration?.defenseType || 'none'}\`\n\n`;
    }

    md += `## 5. Threat Category Breakdown\n\n`;
    md += `| Threat Category | Total | Passed | Failed | Inconclusive | Error | Pass Rate | Findings |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const cat of (m.categoryBreakdown || [])) {
      md += `| **${cat.displayName}** | ${cat.total} | ${cat.passed} | ${cat.failed} | ${cat.inconclusive} | ${cat.error} | **${cat.passRate}%** | ${cat.findingsCount} |\n`;
    }
    md += `\n`;

    md += `## 6. Weighted Risk Index & Rating Disclaimer\n\n`;
    md += `**Universal Security Rating:** \`NONE ASSIGNED\`  \n`;
    md += `*${m.ratingNotice || ''}*  \n\n`;
    if (m.weightedRiskIndex) {
      const wri = m.weightedRiskIndex;
      md += `**Weighted Risk Index (WRI):** \`${wri.score}\`  \n`;
      md += `- **Formula:** \`${wri.formula}\`\n`;
      md += `- **Weights:** Critical (10), High (5), Medium (2), Low (1)\n`;
      md += `- **Description:** ${wri.description}\n`;
      md += `- **Limitations:** ${wri.limitations}\n\n`;
    }

    md += `## 7. Detailed Security Findings & Evidence Traces\n\n`;
    const findings = m.detailedFindings || [];
    if (findings.length === 0) {
      md += `*Zero security findings recorded in this evaluation dataset.*\n\n`;
    } else {
      for (const [idx, f] of findings.entries()) {
        md += `### ${idx + 1}. [${f.severity}] ${f.title}\n`;
        md += `- **Category:** \`${f.category}\`  \n`;
        md += `- **Target Agent:** ${f.agentName} (\`${f.isMock ? 'MOCK' : 'LIVE'}\`)  \n`;
        md += `- **Test Case:** ${f.testCaseTitle} (Version: \`v${f.testCaseVersion}\`, ID: \`${f.testId || 'N/A'}\`)  \n`;
        md += `- **Referenced TestRun ID:** \`${f.testRunId}\`  \n`;
        md += `- **Description:** ${f.description}  \n`;
        md += `- **Evidence Trace:**\n`;
        md += `  \`\`\`json\n  ${JSON.stringify(f.evidence, null, 2).split('\n').join('\n  ')}\n  \`\`\`\n`;
        md += `- **Recommended Mitigation:** ${f.recommendation}  \n\n`;
      }
    }

    md += `## 8. Prioritized Mitigations\n\n`;
    const mitigations = m.recommendedMitigations || [];
    if (mitigations.length === 0) {
      md += `*No actionable mitigations pending.*\n\n`;
    } else {
      for (const [idx, mit] of mitigations.entries()) {
        md += `${idx + 1}. **${mit.recommendation}**  \n`;
        md += `   - *Category:* \`${mit.category}\` | *Highest Severity:* \`${mit.highestSeverity}\`  \n`;
        md += `   - *Applies to:* ${mit.affectedAgents.join(', ')}  \n\n`;
      }
    }

    md += `## 9. Known Limitations\n\n`;
    for (const lim of (m.limitations || [])) {
      md += `- **${lim.title}:** ${lim.description}\n`;
    }
    md += `\n---\n*End of Audit Report. Generated by TrustIssues AI Agent Security Testing Lab.*\n`;

    return md;
  }
}

const reportService = new ReportService();

module.exports = {
  ReportService,
  reportService,
  calculateMetricsFromRuns,
  sanitizeContent,
  normalizeVerdict,
  ALL_CATEGORIES,
  CATEGORY_NAMES,
  REPORT_LIMITATIONS,
  WEIGHTED_SCORE_SPEC
};
