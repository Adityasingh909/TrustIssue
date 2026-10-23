#!/usr/bin/env node

/**
 * TrustIssues Minimal Model Connectivity Test.
 * Sends a harmless prompt ("Ping test: Please respond with 'PONG'") to the configured AI provider.
 * Evaluates real model connectivity, authentication, quota, and latency.
 *
 * SAFETY RULES:
 * 1. NEVER prints the actual API key.
 * 2. Only claims connection if an actual inference completion succeeded (HTTP 200).
 * 3. Gracefully handles 401 (auth failure), 429 (quota/rate limit), timeouts, and network failures.
 */

const healthService = require('../src/services/health.service');
const config = require('../src/config');

async function runConnectivityTest() {
  console.log('===========================================================');
  console.log('   TrustIssues AI Model Connectivity Diagnostic Test       ');
  console.log('===========================================================');
  console.log(`Configured Provider : ${config.aiProvider}`);
  console.log(`Target Model        : ${config.aiModel}`);
  console.log(`Endpoint Base URL   : ${config.aiBaseUrl || '(default provider routing)'}`);
  console.log(`API Key Configured  : ${config.aiApiKey ? 'YES (Key present in server/.env)' : 'NO (Missing)'}`);
  console.log('-----------------------------------------------------------');
  console.log('Dispatching minimal harmless probe: "Ping test: Please respond with \'PONG\'"...');

  const startTime = Date.now();
  const result = await healthService.checkModelConnectivity();
  const totalElapsed = Date.now() - startTime;

  console.log('-----------------------------------------------------------');
  console.log(`Diagnostic Status   : ${result.status}`);
  console.log(`Connected Verdict   : ${result.connected ? 'SUCCESS (MODEL CONNECTED)' : 'FAILED (DISCONNECTED)'}`);
  console.log(`Elapsed Latency     : ${result.latencyMs || totalElapsed} ms`);

  if (result.connected) {
    console.log('-----------------------------------------------------------');
    console.log(`Sample Response     : "${result.sampleResponse}"`);
    if (result.tokenUsage) {
      console.log(`Token Usage Details : Prompt: ${result.tokenUsage.prompt_tokens}, Completion: ${result.tokenUsage.completion_tokens}, Total: ${result.tokenUsage.total_tokens}`);
    }
    console.log('===========================================================');
    console.log('SUCCESS: Live model completed inference successfully.');
    console.log('===========================================================');
    process.exit(0);
  } else {
    console.log('-----------------------------------------------------------');
    console.log(`HTTP Status Code    : ${result.httpStatus || 'N/A'}`);
    console.log(`Diagnostic Message  : ${result.message}`);
    console.log('===========================================================');

    if (result.status === 'QUOTA_EXCEEDED_OR_RATE_LIMITED') {
      console.log('ANALYSIS: Authentication succeeded and model code was recognized by BigModel,');
      console.log('but the account returned HTTP 429: "余额不足或无可用资源包" (Insufficient quota / balance).');
      console.log('ACTION: Top up account balance or add resource pack at https://open.bigmodel.cn.');
    } else if (result.status === 'AUTH_FAILURE') {
      console.log('ANALYSIS: The provider rejected the API key (HTTP 401/403).');
      console.log('ACTION: Verify your API key in server/.env.');
    } else if (result.status === 'UNCONFIGURED_CREDENTIALS') {
      console.log('ANALYSIS: AI_API_KEY is not configured in server/.env.');
      console.log('ACTION: Set AI_API_KEY=<your-key> in server/.env.');
    } else if (result.status === 'TIMEOUT') {
      console.log('ANALYSIS: Inference request timed out.');
      console.log('ACTION: Check network connection or increase AI_TIMEOUT_MS in server/.env.');
    }

    console.log('===========================================================');
    process.exit(1);
  }
}

runConnectivityTest().catch(err => {
  console.error('[UNEXPECTED ERROR]', err);
  process.exit(1);
});
