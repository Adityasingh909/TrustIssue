import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Cpu,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';

export function RunTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const preselectedTestCaseId = queryParams.get('testCaseId');

  const [agents, setAgents] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(preselectedTestCaseId || '');

  const [loadingData, setLoadingData] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  // Load available agents and test cases from backend
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingData(true);
        const [agentsData, testCasesData] = await Promise.all([
          api.listAgents(),
          api.listTestCases()
        ]);
        setAgents(agentsData);
        setTestCases(testCasesData);

        if (agentsData.length > 0 && !selectedAgentId) {
          setSelectedAgentId(agentsData[0].id);
        }
        if (testCasesData.length > 0 && !selectedTestCaseId) {
          setSelectedTestCaseId(testCasesData[0].id);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedTestCase = testCases.find(tc => tc.id === selectedTestCaseId);

  const handleExecute = async () => {
    if (!selectedAgentId || !selectedTestCaseId) return;

    try {
      setExecuting(true);
      setError(null);
      setExecutionResult(null);

      const result = await api.createTestRun({
        agentId: selectedAgentId,
        testCaseId: selectedTestCaseId
      });

      setExecutionResult(result);
    } catch (err) {
      setError(err);
    } finally {
      setExecuting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-mono">Loading laboratory targets and security test suites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header & Page Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Play className="w-5 h-5 text-cyan-400 fill-current" />
            Execute Security Evaluation Run
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Select an agent configuration and security benchmark test case to execute safe local evaluation.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-md text-xs font-mono bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/80 shadow-sm">
            Single Execution
          </div>
          <Link
            to="/trials"
            className="px-3 py-1.5 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            Repeated Trials
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Test Execution Failed">
          {error.message}
        </Alert>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Select Agent */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              1. Select Target Agent
            </label>
            {selectedAgent && (
              <Badge variant={selectedAgent.provider === 'mock' ? 'MOCK' : 'LIVE'}>
                {selectedAgent.provider === 'mock' ? 'MOCK TARGET' : 'LIVE MODEL'}
              </Badge>
            )}
          </div>

          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.model} - {agent.provider})
              </option>
            ))}
          </select>

          {selectedAgent && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Provider:</span>
                <span className="font-mono text-slate-200">{selectedAgent.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="font-mono text-slate-200">{selectedAgent.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Defense Type:</span>
                <span className="font-mono text-cyan-300">
                  {selectedAgent.configuration?.defenseType || 'none'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                {selectedAgent.description}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Test Case */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              2. Select Security Test Case
            </label>
            {selectedTestCase && (
              <Badge variant={selectedTestCase.severity}>{selectedTestCase.severity}</Badge>
            )}
          </div>

          <select
            value={selectedTestCaseId}
            onChange={(e) => setSelectedTestCaseId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            {testCases.map((tc) => (
              <option key={tc.id} value={tc.id}>
                [{tc.testId || tc.category}] {tc.title}
              </option>
            ))}
          </select>

          {selectedTestCase && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-mono text-cyan-300">{selectedTestCase.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Input Type:</span>
                <span className="font-mono text-slate-200">{selectedTestCase.inputType}</span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                {selectedTestCase.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Input & Expected Behavior Preview */}
      {selectedTestCase && (
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            3. Review Input Payload & Expected Safe Behavior
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Test Input Payload</div>
              <div className="font-mono text-xs text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedTestCase.testInput}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Expected Safe Behavior</div>
              <div className="font-mono text-xs text-emerald-300/90 bg-slate-950/80 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedTestCase.expectedBehavior}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              Evaluator: Deterministic Canary + Tool Sandbox Policy Check
            </span>

            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Spinner size="sm" className="border-slate-950 border-t-transparent" />
                  <span>Evaluating Target...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Security Test</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Execution Results View */}
      {executionResult && (
        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1222] space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">Execution Completed</span>
                <Badge variant={executionResult.verdict}>{executionResult.verdict}</Badge>
                <Badge variant={executionResult.isMock ? 'MOCK' : 'LIVE'}>
                  {executionResult.isMock ? 'MOCK' : 'LIVE MODEL'}
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-slate-100">
                {executionResult.testCaseTitle}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">Duration</span>
              <div className="text-sm font-bold text-slate-200 font-mono">
                {executionResult.durationMs}ms
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-mono text-slate-400 mb-1">Evaluator Reasoning:</div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                {executionResult.reason}
              </div>
            </div>

            {executionResult.actualResponse && (
              <div>
                <div className="text-xs font-mono text-slate-400 mb-1">Actual Agent Response:</div>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {executionResult.actualResponse}
                </div>
              </div>
            )}

            {executionResult.findings && executionResult.findings.length > 0 && (
              <div>
                <div className="text-xs font-mono text-rose-400 font-semibold mb-1">
                  Vulnerability Findings ({executionResult.findings.length}):
                </div>
                <div className="space-y-2">
                  {executionResult.findings.map((f, i) => (
                    <div key={i} className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs space-y-1">
                      <div className="font-semibold text-rose-300 flex items-center justify-between">
                        <span>{f.title}</span>
                        <Badge variant={f.severity}>{f.severity}</Badge>
                      </div>
                      <p className="text-slate-300">{f.description}</p>
                      {f.recommendation && (
                        <div className="text-[11px] text-cyan-300 pt-1 font-mono">
                          Recommendation: {f.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[11px] font-mono text-slate-400">
              Run ID: {executionResult.testRunId}
            </span>
            <Link
              to={`/results?id=${executionResult.testRunId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors"
            >
              <span>View Full Evidence Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunTestPage;
