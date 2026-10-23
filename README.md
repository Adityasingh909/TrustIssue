# TrustIssues — AI Agent Security Testing Lab

**TrustIssues** is a security evaluation framework and testing lab for autonomous and tool-augmented AI agents. It rigorously evaluates whether target agents succumb to direct prompt injection, indirect document injection, task hijacking, canary data disclosure, instruction hierarchy violations, and unauthorized tool use.

---

## 1. Repository Structure

```text
TrustIssues/
├── package.json               # Root workspace orchestration
├── README.md                  # Setup & operational guide
├── .gitignore                 # Secrets, dependencies, and build exclusions
├── docs/                      # Architectural & security specifications
│   ├── architecture.md        # Request/response flows and data schema
│   ├── threat-model.md        # Assets, trust boundaries, attack scenarios
│   ├── implementation-plan.md # Phased development roadmap (Stages 0–6)
│   └── test-strategy.md       # Vitest/Supertest test plan & mock agent specs
├── client/                    # React + Vite + Tailwind CSS frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── components/        # Reusable UI components (Badge, Alert, EmptyState)
│       ├── pages/             # Dashboard, AgentLab, TestLibrary, DocumentLab, Results, Reports
│       ├── layouts/           # Dark cybersecurity shell (AppLayout)
│       ├── services/          # API client (Fetch + Health check)
│       ├── hooks/             # useHealth and live monitoring hooks
│       ├── App.jsx            # React Router navigation
│       └── main.jsx           # App entry point
└── server/                    # Node.js + Express.js CommonJS backend
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma      # PostgreSQL relational schema
    │   ├── seed.js            # Non-destructive synthetic benchmark seed script
    │   └── migrations/        # Tracked Prisma schema migrations
    ├── src/
    │   ├── server.js          # HTTP listener
    │   ├── app.js             # Express app setup (Helmet, CORS, JSON)
    │   ├── config/            # Environment-driven configuration
    │   ├── controllers/       # HTTP controller handlers
    │   ├── routes/            # REST API routes (/api/health)
    │   ├── middleware/        # Error handling & Zod request validation
    │   ├── services/          # db.service.js, health.service.js
    │   ├── test-cases/        # Benchmark test definitions
    │   └── utils/             # prisma.js (client singleton), validators.js (Zod)
    └── tests/                 # Vitest & Supertest automated test suite
        ├── health.test.js     # Health endpoint & database ping tests
        └── db.test.js         # Transactions, cascade delete, Zod security checks
```

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher (verified on Node `v26.12.0`)
- **npm**: `v10.x` or higher (verified on npm `11.20.0`)
- **PostgreSQL**: PostgreSQL 14+ (tested on PostgreSQL 16/17 via port 5432)

---

## 3. Database Architecture & Setup (Prisma ORM)

### 3.1 Domain Models
The database encapsulates 6 core entities:
1. **`User`**: Security researchers and system users (`id`, `email`, `createdAt`, `updatedAt`).
2. **`Agent`**: Evaluated agent definitions (`id`, `name`, `description`, `provider`, `model`, `configuration` JSON, `createdAt`, `updatedAt`). **Security Rule**: API keys and secrets are prohibited from being saved in database records.
3. **`TestCase`**: Security scenarios (`id`, `title`, `description`, `category`, `severity`, `inputType`, `testInput`, `expectedBehavior`, `evaluationCriteria` JSON, `version`, `createdAt`, `updatedAt`).
4. **`TestRun`**: Test execution records (`id`, `agentId`, `testCaseId`, `status`, `startedAt`, `completedAt`, `actualResponse`, `evaluationResult` JSON, `durationMs`, `errorMessage`, `createdAt`). Explicitly distinguishes security failures (`FAILED`) from execution runtime errors (`ERROR`), while accommodating `INCONCLUSIVE` and `SKIPPED`.
5. **`Finding`**: Discovered security vulnerabilities linked to a test run (`id`, `testRunId`, `title`, `description`, `severity`, `evidence` JSON, `recommendation`, `createdAt`). Configured with `onDelete: Cascade`.
6. **`Report`**: Audit reports and comparative benchmark summaries (`id`, `title`, `summary`, `metrics` JSON, `createdAt`, `userId`).

### 3.2 Database Commands
From `server/` or via npm workspaces:

```bash
# Validate Prisma schema
npm --workspace=server run prisma:generate
npx --prefix server prisma validate

# Create and apply migrations
npm --workspace=server run db:migrate
# or: cd server && npx prisma migrate dev --name init

# Populate database with synthetic seed data
npm --workspace=server run db:seed
# or: cd server && npx prisma db seed
```

### 3.3 Synthetic Seed Data & Non-Fabrication Policy
The seed script (`server/prisma/seed.js`) populates:
- Default Security Researcher user (`security-researcher@trustissues.internal`).
- Standard Agent Configurations:
  - **Baseline Unprotected Agent** (no instruction hierarchy or tool guards).
  - **Guarded Mitigated Agent** (XML delimiter encapsulation, tool whitelists, canary defense).
- Standard Benchmark Test Cases covering all 6 attack categories:
  - `DIRECT_INJECTION` (System prompt override / jailbreak).
  - `INDIRECT_DOCUMENT_INJECTION` (Hidden payload in candidate resume).
  - `TASK_HIJACKING` (Expense report audit hijack).
  - `SYNTHETIC_DATA_DISCLOSURE` (Canary leak attempt).
  - `INSTRUCTION_HIERARCHY` (Document developer role spoofing).
  - `UNAUTHORIZED_TOOL_USE` (Customer data exfiltration privilege escalation).

> **Integrity Guarantee**: In compliance with the project security guidelines, **zero test results or findings are fabricated in seed data**. Test runs and findings are created only when tests are executed by the runner engine.

### 3.4 Local Validation vs. Live PostgreSQL Connection
- **Validated Locally (Without Live Database)**:
  - Prisma schema syntax and model relations (`npx prisma validate`).
  - Prisma client generation (`npx prisma generate`).
  - Zod validation schemas for all domain entities (`server/src/utils/validators.js`).
  - Security constraints rejecting credential persistence in Agent configurations.
  - Mock agent adapters and evaluation rule algorithms.
- **Requires Live PostgreSQL Connection**:
  - Prisma migration creation and application (`npx prisma migrate dev`).
  - Foreign key and unique constraint enforcement in Postgres tables.
  - Atomicity of transaction blocks (`prisma.$transaction`).
  - Live query latency monitoring in `GET /api/health`.

---

## 4. Running the Development Environment

### Step 1: Configure Environment Variables
Copy the provided environment templates:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Ensure `server/.env` contains your PostgreSQL connection string and AI credentials:
```dotenv
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/trustissues?schema=public"
CORS_ORIGIN=http://localhost:5173

# Live Language Model Integration (Multi-Provider Support: groq, openai, glm-flash, openrouter, gemini, deepseek, ollama)
AI_PROVIDER=groq
AI_MODEL=qwen/qwen3.8-27b
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.groq.com/openai/v1
AI_TIMEOUT_MS=30000
```

### Step 2: Test AI Model Connectivity
Verify live inference connectivity and latency to your configured provider without starting the web UI:
```bash
npm run test:model
```
Or check the live endpoint via HTTP:
```bash
curl http://localhost:5001/api/health/model
```

### Step 3: Start Backend & Frontend

**Backend (Express):**
```bash
npm run dev:server
# or
cd server && npm run dev
```

**Frontend (Vite + React):**
```bash
npm run dev:client
# or
cd client && npm run dev
```

---

## 5. Verification & Tests

Run all unit, integration, and database tests:
```bash
npm test
# or
npm --workspace=server run test
```

Test live model connectivity probe:
```bash
npm run test:model
```

Build the frontend bundle:
```bash
npm run build
```
# TrustIssue
