# TrustIssues Implementation Plan

## 1. Overview & Phased Roadmap

This plan breaks down the development of the **TrustIssues** AI Agent Security Testing Lab into small, verifiable stages. Each stage includes explicit, automated or testable acceptance criteria before moving to the next.

```text
┌────────────────────────────────────────────────────────┐
│ Stage 0: Monorepo Foundation & Tooling Setup           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Prisma Schema, Seed Data & Evaluator Engine   │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Target Agent Adapters & Simulated Tool Sandbox│
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: Test Runner Service & Express REST API        │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 4: Frontend UI (Dashboard, Runs & Evidence)      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 5: Baseline vs. Mitigated Comparison & Reports   │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 6: Full Verification, Benchmarks & Polish        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Stages & Acceptance Criteria

### Stage 0: Monorepo Foundation & Tooling Setup
- **Tasks**:
  1. Initialize root `package.json` with npm workspaces (`server`, `client`).
  2. Setup `server/` with Express.js, CommonJS configuration, Zod, dotenv, Vitest, and Supertest.
  3. Setup `client/` with Vite, React, Tailwind CSS, React Router, Recharts, and Lucide React.
  4. Create standard `.gitignore`, environment variable templates (`.env.example`), and root scripts (`npm run dev`, `npm test`, `npm run build`).
- **Verifiable Acceptance Criteria**:
  - `npm install` runs cleanly across both workspaces.
  - `npm --workspace=server test` executes a placeholder Vitest suite successfully.
  - `npm --workspace=client run build` completes Vite build with zero bundle errors.

---

### Stage 1: Prisma Schema, Seed Data & Evaluator Engine
- **Tasks**:
  1. Define PostgreSQL schema in `server/prisma/schema.prisma` (`TestSuite`, `TestCase`, `AgentConfig`, `TestRun`, `TestResult`, `EvidenceRecord`).
  2. Implement deterministic security evaluator in `server/src/services/evaluator/`:
     - `canary-detector.js`: Exact and obfuscated canary token leak detection.
     - `tool-policy-analyzer.js`: Validates tool calls against permitted lists.
     - `task-hijack-analyzer.js`: Identifies if injection hijacked expected task completion.
     - `verdicts.js`: Produces standardized verdicts (`PASS`, `FAIL`, `INCONCLUSIVE`, `ERROR`, `SKIPPED`) with structured evidence.
  3. Create seed script `server/prisma/seed.js` with standard benchmark suites:
     - Direct Prompt Injection Suite
     - Indirect Document Injection Suite
     - Sensitive Data Disclosure Suite
     - Unauthorized Tool Use Suite
     - Instruction Hierarchy Suite
  4. Write unit tests for all evaluator rules.
- **Verifiable Acceptance Criteria**:
  - Unit tests prove canary detector catches exact and base64-encoded canaries.
  - Unit tests prove tool policy analyzer catches unauthorized tool invocations.
  - Seed script successfully populates test cases and agent configs in the database.

---

### Stage 2: Target Agent Adapters & Simulated Tool Sandbox
- **Tasks**:
  1. Create `AgentAdapterInterface` defining standard contract for executing prompt inputs with tools.
  2. Implement `MockAgentAdapter`:
     - Deterministic rule-based agent simulator for local and CI/CD testing.
     - Configurable behaviors: `vulnerable` (succumbs to injection) vs. `mitigated` (resists injection and enforces boundaries).
  3. Implement `RemoteLLMAdapter`:
     - Pluggable HTTP client supporting GLM-5.3-Flash and OpenAI-compatible completions.
     - Decoupled from Antigravity internal APIs; respects timeouts and token quotas.
  4. Implement `SimulatedToolSandbox`:
     - Tools: `simulated_send_email`, `simulated_execute_db_query`, `simulated_read_document`, `simulated_export_customer_data`.
     - In-memory append-only audit log tracking tool name, parameters, caller timestamp, and simulated response.
     - Zero side effects: no network egress, no filesystem modifications, no production DB connections.
- **Verifiable Acceptance Criteria**:
  - Unit tests prove `MockAgentAdapter` returns predictable completions and tool calls for all attack categories.
  - Unit tests prove simulated tools log calls accurately without executing any real-world side effects.

---

### Stage 3: Test Runner Service & Express REST API
- **Tasks**:
  1. Build `TestRunnerEngine`:
     - Orchestrates execution of a `TestSuite` against an `AgentConfig`.
     - Generates per-test synthetic canary tokens.
     - Executes target agent, intercepts tool calls, and passes results to evaluator.
     - Persists `TestRun`, `TestResult`, and `EvidenceRecord` entries atomically.
  2. Build Express API routes with Zod validation middleware:
     - `GET /api/suites`: List test suites and case counts.
     - `GET /api/suites/:id`: Retrieve suite details and test cases.
     - `GET /api/agents`: List agent configurations.
     - `POST /api/agents`: Create new agent configuration.
     - `POST /api/runs`: Launch a test run.
     - `GET /api/runs`: List past test runs.
     - `GET /api/runs/:id`: Get detailed test run results with evidence.
     - `GET /api/metrics/summary`: Aggregate security metrics.
     - `GET /api/reports/compare`: Side-by-side comparison between runs.
  3. Implement global error handling middleware ensuring consistent JSON error responses.
- **Verifiable Acceptance Criteria**:
  - Supertest integration tests cover:
    - Creating and fetching agent configurations.
    - Launching a test run with `MockAgentAdapter`.
    - Querying run results and verifying verdict and evidence persistence.
    - Proper 400 Bad Request responses for malformed Zod request bodies.

---

### Stage 4: Frontend UI (Dashboard, Runs & Evidence)
- **Tasks**:
  1. Build layout with dark/light security-themed dashboard styling using Tailwind CSS.
  2. Implement **Dashboard Page**:
     - Metric cards: Overall Pass Rate, Vulnerabilities Detected, Total Test Runs, Active Configurations.
     - Recharts attack category vulnerability distribution radar/bar charts.
     - Recent test runs table with live status badges.
  3. Implement **Test Suites & Launch Modal**:
     - Browse suites, view test cases, select agent configuration, and trigger runs.
  4. Implement **Run Detail View**:
     - Progress indicator, summary cards, filterable results list (`PASS`, `FAIL`, `INCONCLUSIVE`, `ERROR`, `SKIPPED`).
  5. Implement **Evidence Modal / Drawer**:
     - Inspect raw model prompt, untrusted document payload, raw completion text, simulated tool call logs, matched canary tokens, and evaluation reasoning.
- **Verifiable Acceptance Criteria**:
  - Dashboard loads metrics from backend API.
  - Triggering a test run from the UI executes against the backend and updates results in real-time or on poll.
  - Clicking any result displays the evidence drawer with complete raw inputs and outputs.

---

### Stage 5: Baseline vs. Mitigated Comparison & Reports
- **Tasks**:
  1. Implement **Comparison View**:
     - Select Baseline Run (e.g. unprotected prompt) and Mitigated Run (e.g. structured defenses).
     - Visual delta indicators: Vulnerability Reduction %, Over-defense Refusal %, Latency Delta.
     - Test-case-by-test-case diff grid highlighting flipped verdicts (`FAIL -> PASS` vs. `PASS -> FAIL`).
  2. Implement **Detailed Reports View**:
     - Printable / exportable security audit summary.
     - Executive summary narrative with risk scores per OWASP LLM Top 10 categories.
- **Verifiable Acceptance Criteria**:
  - Comparison API and UI calculate and display accurate delta percentages.
  - Flipped verdicts are distinctly highlighted in the comparison diff table.

---

### Stage 6: End-to-End Verification, Benchmarks & Polish
- **Tasks**:
  1. Execute complete test cycle using `MockAgentAdapter` (vulnerable vs. mitigated) across all 6 attack categories.
  2. Test optional live adapter with GLM-5.3-Flash / OpenAI endpoint when API key is provided.
  3. Ensure code formatting, linting, and error-handling robustness.
  4. Provide clear README documentation with quickstart instructions.
- **Verifiable Acceptance Criteria**:
  - 100% of unit and integration tests pass via `npm test`.
  - Full end-to-end user workflow tested from browser UI without console or network errors.
  - Zero fabricated data: all dashboard metrics derive strictly from database records.
