/**
 * Provider-independent Agent Adapter Interface for TrustIssues.
 * Supports document summarization, question answering, trusted instructions,
 * untrusted document boundaries, actual response capture, observable tool actions,
 * execution timing, and error handling.
 */

class BaseAgentAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = config.name || 'BaseAgent';
    this.provider = config.provider || 'unknown';
    this.model = config.model || 'unknown';
    this.defenseType = config.defenseType || 'none';
    this.isMock = false;
  }

  /**
   * Abstract execution method to be implemented by concrete adapters.
   * @param {Object} input
   * @param {string} input.trustedInstructions - System prompt / developer instructions
   * @param {string} input.userQuery - User's primary query / instruction
   * @param {string} [input.untrustedDocument] - Untrusted document payload (e.g. resume, invoice, report)
   * @param {Array<Object>} [input.availableTools] - Tool definitions exposed to the agent
   * @param {string} [input.canaryToken] - Synthetic canary token under test
   * @returns {Promise<AgentExecutionResult>}
   */
  async execute(input) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Helper to measure execution duration.
   */
  async timedExecution(executionFn) {
    const startTime = Date.now();
    try {
      const result = await executionFn();
      const durationMs = Date.now() - startTime;
      return {
        ...result,
        durationMs
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        responseText: '',
        toolCalls: [],
        durationMs,
        error,
        isMock: this.isMock,
        metadata: {
          agentName: this.name,
          provider: this.provider,
          model: this.model,
          defenseType: this.defenseType,
          executionType: this.isMock ? 'MOCK' : 'LIVE'
        }
      };
    }
  }

  /**
   * Helper to normalize output structure.
   */
  createExecutionResult({
    success = true,
    responseText = '',
    toolCalls = [],
    durationMs = 0,
    error = null,
    extraMetadata = {}
  }) {
    return {
      success,
      responseText,
      toolCalls,
      durationMs,
      error,
      isMock: this.isMock,
      metadata: {
        agentName: this.name,
        provider: this.provider,
        model: this.model,
        defenseType: this.defenseType,
        ...extraMetadata
      }
    };
  }
}

module.exports = {
  BaseAgentAdapter
};
