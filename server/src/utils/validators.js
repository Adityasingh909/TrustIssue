const { z } = require('zod');

const SeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const AttackCategoryEnum = z.enum([
  'DIRECT_INJECTION',
  'INDIRECT_DOCUMENT_INJECTION',
  'TASK_HIJACKING',
  'SYNTHETIC_DATA_DISCLOSURE',
  'INSTRUCTION_HIERARCHY',
  'UNAUTHORIZED_TOOL_USE',
  'OUTPUT_INTEGRITY',
  'EXCESSIVE_AGENCY'
]);

const InputTypeEnum = z.enum(['PROMPT', 'DOCUMENT', 'MULTI_MODAL', 'TOOL_CALL']);

const RunStatusEnum = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'INCONCLUSIVE',
  'ERROR',
  'SKIPPED'
]);

// User Input Validation Schema
const UserInputSchema = z.object({
  email: z.string().email('Invalid email address')
});

// Agent Input Validation Schema
// Enforces that API keys and secrets are NEVER stored in database records
const AgentConfigurationSchema = z.object({
  systemPrompt: z.string().min(1, 'System prompt cannot be empty'),
  defenseType: z.enum(['none', 'delimiter_fence', 'strict_hierarchy', 'guard_evaluator']).default('none'),
  allowedTools: z.array(z.string()).default([]),
  canaryRules: z.record(z.any()).optional(),
  temperature: z.number().min(0).max(2).optional(),
}).passthrough().refine(
  (data) => {
    // Explicit security check: forbid storing secret keys or arbitrary endpoints in the DB record to prevent SSRF & key leak
    const forbiddenKeys = [
      'apiKey', 'api_key', 'secret', 'token', 'authorization', 'password',
      'baseUrl', 'base_url', 'url', 'endpoint', 'webhook', 'proxy'
    ];
    return !forbiddenKeys.some((k) => k in data);
  },
  {
    message: 'Security Violation: Model API keys or secrets must not be stored in database records. Endpoints and credentials must be managed strictly via server environment variables to prevent SSRF and secret exfiltration.'
  }
);

const AgentInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  provider: z.string().min(1, 'Provider is required (e.g. mock, glm-flash, openai)'),
  model: z.string().min(1, 'Model identifier is required'),
  configuration: AgentConfigurationSchema
});

// TestCase Input Validation Schema
const TestCaseEvaluationCriteriaSchema = z.object({
  prohibitedCanaries: z.array(z.string()).optional(),
  forbiddenActions: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
  requiredPhrases: z.array(z.string()).optional(),
  forbiddenPhrases: z.array(z.string()).optional(),
  expectedOutcome: z.string().optional()
}).passthrough();

const TestCaseInputSchema = z.object({
  testId: z.string().min(2, 'Test ID is required (e.g. TC-DPI-001)').optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description is required'),
  category: AttackCategoryEnum,
  severity: SeverityEnum.default('MEDIUM'),
  inputType: InputTypeEnum.default('PROMPT'),
  testInput: z.string().min(1, 'Test input is required'),
  originalTask: z.string().optional(),
  expectedBehavior: z.string().min(1, 'Expected behavior is required'),
  evaluationCriteria: TestCaseEvaluationCriteriaSchema,
  mitigation: z.string().optional(),
  version: z.number().int().positive().default(1)
});

// TestRun Input Validation Schemas
const TestRunCreateSchema = z.object({
  agentId: z.string().uuid('Invalid Agent ID format'),
  testCaseId: z.string().uuid('Invalid TestCase ID format')
});

const TestRunUpdateSchema = z.object({
  status: RunStatusEnum.optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  actualResponse: z.string().optional().nullable(),
  evaluationResult: z.object({
    verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR', 'SKIPPED']),
    reason: z.string().optional(),
    canaryDetected: z.boolean().optional(),
    unauthorizedToolUsed: z.boolean().optional(),
    hijacked: z.boolean().optional(),
    details: z.any().optional()
  }).passthrough().optional().nullable(),
  durationMs: z.number().int().nonnegative().optional().nullable(),
  errorMessage: z.string().optional().nullable()
});

// Finding Input Validation Schema
const FindingInputSchema = z.object({
  testRunId: z.string().uuid('Invalid TestRun ID format'),
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  severity: SeverityEnum,
  evidence: z.object({
    rawInput: z.string().optional(),
    rawResponse: z.string().optional(),
    matchedCanaries: z.array(z.string()).optional(),
    toolCalls: z.array(z.any()).optional(),
    evaluatorNotes: z.string().optional()
  }).passthrough(),
  recommendation: z.string().min(5, 'Remediation recommendation is required')
});

// Report Input Validation Schema
const ReportInputSchema = z.object({
  title: z.string().min(3, 'Report title is required'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  metrics: z.object({
    totalTests: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    inconclusive: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    passRate: z.number().min(0).max(100),
    categoryBreakdown: z.union([z.record(z.any()), z.array(z.any())]).optional(),
    baselineComparison: z.any().optional()
  }).passthrough(),
  userId: z.string().uuid().optional().nullable()
});

module.exports = {
  SeverityEnum,
  AttackCategoryEnum,
  InputTypeEnum,
  RunStatusEnum,
  UserInputSchema,
  AgentInputSchema,
  TestCaseInputSchema,
  TestRunCreateSchema,
  TestRunUpdateSchema,
  FindingInputSchema,
  ReportInputSchema
};
