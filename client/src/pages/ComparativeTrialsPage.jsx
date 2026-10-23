import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Cpu,
  FileCode,
  Sliders,
  Sparkles,
  Info,
  Clock,
  Terminal,
  Activity
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';

export function ComparativeTrialsPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedTestCaseId = queryParams.get('testCaseId');

  const [agents, setAgents] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(preselectedTestCaseId || '');
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [trialsCount, setTrialsCount] = useState(3);

  const [loadingData, setLoadingData] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  // Failure drilldown filters
  const [drilldownFilter, setDrilldownFilter] = useState('ALL'); // 'ALL' | 'FAILURES' | 'ERRORS'
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [activeTabAgentId, setActiveTabAgentId] = useState(null);

  // Load available agents and test cases
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

        if (testCasesData.length > 0 && !selectedTestCaseId) {
          setSelectedTestCaseId(testCasesData[0].id);
        }
        // Default to selecting all mock agents (e.g. baseline and guarded for instant comparison)
        if (agentsData.length > 0) {
          const defaultAgents = agentsData.slice(0, 2).map(a => a.id);
          setSelectedAgentIds(defaultAgents);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  // Update activeTabAgentId when executionResult updates
  useEffect(() => {
    if (executionResult?.agents?.length > 0) {
      setActiveTabAgentId(executionResult.agents[0].agentId);
    }
  }, [executionResult]);

  const selectedTestCase = testCases.find(tc => tc.id === selectedTestCaseId);
  const totalRunsPlanned = selectedAgentIds.length * trialsCount;

  const toggleAgent = (agentId) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  const selectAllAgents = () => {
    setSelectedAgentIds(agents.map(a => a.id));
  };

  const clearAllAgents = () => {
    setSelectedAgentIds([]);
  };

  const handleExecuteTrials = async () => {
    if (!selectedTestCaseId || selectedAgentIds.length === 0 || executing) return;

    try {
      setExecuting(true);
      setError(null);
      setExecutionResult(null);

      const result = await api.executeTrials({
        testCaseId: selectedTestCaseId,
        agentIds: selectedAgentIds,
        trialsCount: parseInt(trialsCount, 10)
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
        <p className="text-xs text-slate-400 font-mono">Loading laboratory targets and security benchmark suites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header & Page Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Layers className="w-4 h-4 text-cyan-400" />
            </span>
            <h1 className="text-xl font-bold text-slate-100">
              Repeated Security Trials & Agent Configuration Comparison
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Execute bounded repeated evaluation trials across multiple agent configurations to measure empirical resilience, variance, and failure modes.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 self-start md:self-auto">
          <Link
            to="/run"
            className="px-3 py-1.5 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            Single Execution
          </Link>
          <div className="px-3 py-1.5 rounded-md text-xs font-mono bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/80 shadow-sm">
            Repeated Trials
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Trial Execution Failed">
          {error.message || 'An error occurred during repeated trials execution.'}
        </Alert>
      )}

      {/* Trial Configuration Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Benchmark Test Case Selection */}
        <div className="lg:col-span-1 p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                1. Security Test Case
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
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Category:</span>
                  <span className="text-cyan-300">{selectedTestCase.category}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Version:</span>
                  <span className="text-slate-300">v{selectedTestCase.version || 1}</span>
                </div>
                <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="text-slate-400 uppercase text-[10px] mb-0.5">Expected Safe Behavior:</div>
                  <div className="text-emerald-300/90 font-sans line-clamp-3">
                    {selectedTestCase.expectedBehavior}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-slate-950/50 p-2.5 rounded border border-slate-800/60">
            Evaluating identical prompt & security policy across all trials.
          </div>
        </div>

        {/* Step 2: Target Agent Configurations Multi-Select */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              2. Target Agent Configurations ({selectedAgentIds.length} Selected)
            </label>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={selectAllAgents}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={clearAllAgents}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {agents.map((agent) => {
              const isSelected = selectedAgentIds.includes(agent.id);
              const isMock = agent.provider === 'mock';
              const defenseType = agent.configuration?.defenseType || 'none';

              return (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-700/80 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs font-bold text-slate-200">{agent.name}</span>
                    </div>
                    <Badge variant={isMock ? 'MOCK' : 'LIVE'} size="xs">
                      {isMock ? 'MOCK' : 'LIVE MODEL'}
                    </Badge>
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Model: <strong className="text-slate-300">{agent.model}</strong></span>
                    <span>Defense: <strong className="text-cyan-400">{defenseType}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedAgentIds.length === 0 && (
            <div className="text-rose-400 text-xs font-mono">
              ⚠️ Please select at least one agent configuration to evaluate.
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Trials Bounding & Execution Bar */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              3. Repeated Trials Parameter (Bounded: 1 - 20 Trials)
            </label>
            <p className="text-xs text-slate-400">
              Execute identical iterations to isolate probabilistic failure modes and calculate conclusive security rates.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
              <span className="text-xs font-mono text-slate-400">Trials per agent:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={trialsCount}
                onChange={(e) => setTrialsCount(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-28 accent-cyan-400 cursor-pointer"
              />
              <input
                type="number"
                min="1"
                max="20"
                value={trialsCount}
                onChange={(e) => setTrialsCount(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-12 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-center text-xs font-mono text-cyan-300 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExecuteTrials}
              disabled={executing || selectedAgentIds.length === 0 || !selectedTestCaseId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <>
                  <Spinner size="sm" className="border-slate-950 border-t-transparent" />
                  <span>Executing Trials ({totalRunsPlanned} runs)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Trials ({totalRunsPlanned} runs)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live concurrency & rate limit notice */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Safeguards: Concurrency bounded & live model rate-limit protection active. Duplicate submission lock enabled.</span>
          </div>
          <div>
            Batch: <strong className="text-slate-200">{selectedAgentIds.length} agents × {trialsCount} trials = {totalRunsPlanned} test runs</strong>
          </div>
        </div>
      </div>

      {/* Aggregate Comparison Scoreboard */}
      {executionResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Statistical Limitation Notice (Strict Mandate) */}
          <div className="p-4 rounded-xl border border-amber-900/60 bg-amber-950/20 text-amber-200/90 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold font-mono text-amber-300 uppercase tracking-wider text-[11px]">
                Statistical Security Benchmark Notice
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {executionResult.statisticalNotice?.statement ||
                  'Small-sample repeated security trials (N ≤ 20) quantify observable behavioral variance under specific test conditions, but do NOT constitute proof of general security or immunity against adaptive adversarial evasion. Conclusive rates exclude runtime errors.'}
              </p>
            </div>
          </div>

          {/* Divergence & Resilience Ranking Banner */}
          {executionResult.comparisonSummary?.divergenceObserved && (
            <div className="p-4 rounded-xl border border-cyan-900/60 bg-cyan-950/20 text-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-100 font-mono text-xs">Resilience Divergence Confirmed: </span>
                  <span className="text-slate-300">
                    Target configurations exhibited statistically distinct behavior under identical evaluation.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-emerald-400">
                  Most Resilient: <strong>{executionResult.comparisonSummary.mostResilient?.agentName}</strong> ({executionResult.comparisonSummary.mostResilient?.passRate}%)
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400">
                  Least Resilient: <strong>{executionResult.comparisonSummary.leastResilient?.agentName}</strong> ({executionResult.comparisonSummary.leastResilient?.passRate}%)
                </span>
              </div>
            </div>
          )}

          {/* Comparative Scoreboard Table */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Comparative Resilience Scoreboard
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Metrics derived strictly from conclusive trials. Denominators explicitly reflect completed test evaluations.
                </p>
              </div>

              <div className="text-right font-mono text-xs text-slate-400">
                Test Case: <strong className="text-slate-200">[{executionResult.testCase.testId || executionResult.testCase.category}] {executionResult.testCase.title}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Agent Configuration</th>
                    <th className="py-3 px-3">Provider / Model</th>
                    <th className="py-3 px-3 text-center">Conclusive Trials</th>
                    <th className="py-3 px-3 text-center">Pass Rate</th>
                    <th className="py-3 px-3 text-center">Failure Rate</th>
                    <th className="py-3 px-3 text-center">Canary Disclosure</th>
                    <th className="py-3 px-3 text-center">Action Attempt</th>
                    <th className="py-3 px-3 text-center">Action Executed</th>
                    <th className="py-3 px-3 text-center">Errors / Inconclusive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {executionResult.agents.map((agentMetrics) => {
                    const passRate = agentMetrics.passRate;
                    const isMock = agentMetrics.isMock;

                    return (
                      <tr key={agentMetrics.agentId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{agentMetrics.agentName}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">
                            Defense: {agentMetrics.defenseType}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant={isMock ? 'MOCK' : 'LIVE'} size="xs">
                              {isMock ? 'MOCK' : 'LIVE'}
                            </Badge>
                            <span className="text-slate-300">{agentMetrics.provider}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{agentMetrics.model}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-slate-200 font-bold">{agentMetrics.conclusiveCount}</span>
                          <span className="text-slate-400 text-[10px]"> / {agentMetrics.totalTrials}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className={`font-bold text-sm ${passRate >= 80 ? 'text-emerald-400' : passRate >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {passRate}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({agentMetrics.passRateDenominator})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className={`font-bold text-sm ${agentMetrics.failureRate > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {agentMetrics.failureRate}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({agentMetrics.failureRateDenominator})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className={`font-bold ${agentMetrics.canaryDisclosureCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {agentMetrics.canaryDisclosureRate}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({agentMetrics.canaryDisclosureDenominator})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className={`font-bold ${agentMetrics.unauthorizedAttemptCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {agentMetrics.unauthorizedAttemptRate}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({agentMetrics.unauthorizedAttemptDenominator})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className={`font-bold ${agentMetrics.unauthorizedExecutionCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {agentMetrics.unauthorizedExecutionRate}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({agentMetrics.unauthorizedExecutionDenominator})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="text-slate-300">
                            {agentMetrics.errorCount} <span className="text-rose-400">err</span> / {agentMetrics.inconclusiveCount} <span className="text-amber-400">inc</span>
                          </div>
                          <div className="text-[10px] text-slate-400">excluded from rate</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Trials & Failure Drilldown Panel */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1222] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Individual Trial Outcomes & Failure Drilldown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect concrete responses, evaluator reasoning, and vulnerability traces for every trial.
                </p>
              </div>

              {/* Drilldown Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setDrilldownFilter('ALL')}
                  className={`px-3 py-1 rounded transition-colors ${
                    drilldownFilter === 'ALL' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Trials
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownFilter('FAILURES')}
                  className={`px-3 py-1 rounded transition-colors ${
                    drilldownFilter === 'FAILURES' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Failures Only
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownFilter('ERRORS')}
                  className={`px-3 py-1 rounded transition-colors ${
                    drilldownFilter === 'ERRORS' ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Errors Only
                </button>
              </div>
            </div>

            {/* Agent Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              {executionResult.agents.map((agent) => (
                <button
                  key={agent.agentId}
                  onClick={() => setActiveTabAgentId(agent.agentId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 ${
                    activeTabAgentId === agent.agentId
                      ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{agent.agentName}</span>
                  <Badge variant={agent.passRate >= 80 ? 'PASS' : 'FAIL'} size="xs">
                    {agent.passRate}%
                  </Badge>
                </button>
              ))}
            </div>

            {/* Trial List for Active Agent */}
            {(() => {
              const currentAgent = executionResult.agents.find(a => a.agentId === activeTabAgentId) || executionResult.agents[0];
              if (!currentAgent) return null;

              let filteredRuns = currentAgent.runs || [];
              if (drilldownFilter === 'FAILURES') {
                filteredRuns = filteredRuns.filter(r => r.verdict === 'FAIL' || r.status === 'FAILED');
              } else if (drilldownFilter === 'ERRORS') {
                filteredRuns = filteredRuns.filter(r => r.status === 'ERROR' || r.verdict === 'ERROR' || r.verdict === 'INCONCLUSIVE');
              }

              if (filteredRuns.length === 0) {
                return (
                  <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800/80">
                    No trials match the active filter criteria ({drilldownFilter}).
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredRuns.map((run, idx) => {
                    const isExpanded = expandedRunId === (run.testRunId || `run-${idx}`);
                    const runVerdict = run.verdict || run.status;
                    const findingsCount = run.findings ? run.findings.length : 0;

                    return (
                      <div
                        key={run.testRunId || idx}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden"
                      >
                        {/* Trial Summary Header */}
                        <div
                          onClick={() => setExpandedRunId(isExpanded ? null : (run.testRunId || `run-${idx}`))}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div className="font-mono text-xs font-bold text-slate-200">
                              Trial #{run.trialNumber || (idx + 1)}
                            </div>
                            <Badge variant={runVerdict}>{runVerdict}</Badge>
                            {findingsCount > 0 && (
                              <span className="text-[11px] font-mono text-rose-400">
                                {findingsCount} Finding{findingsCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                            <span>Duration: <strong className="text-slate-200">{run.durationMs}ms</strong></span>
                            {run.testRunId && (
                              <Link
                                to={`/results?id=${run.testRunId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                                title="Open full persistent record"
                              >
                                <span className="text-[11px]">Audit Run</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-4 text-xs">
                            {/* Evaluator Reason */}
                            <div>
                              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">
                                Evaluator Reasoning:
                              </div>
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-sans leading-relaxed">
                                {run.reason || run.errorMessage || 'No evaluation reason recorded.'}
                              </div>
                            </div>

                            {/* Actual Model Response */}
                            {run.actualResponse && (
                              <div>
                                <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">
                                  Captured Model Output:
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {run.actualResponse}
                                </div>
                              </div>
                            )}

                            {/* Findings if any */}
                            {run.findings && run.findings.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-mono uppercase text-rose-400 font-semibold">
                                  Vulnerability Findings:
                                </div>
                                {run.findings.map((f, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-rose-300">{f.title}</span>
                                      <Badge variant={f.severity} size="xs">{f.severity}</Badge>
                                    </div>
                                    <p className="text-slate-300 font-sans">{f.description}</p>
                                    {f.recommendation && (
                                      <div className="text-[11px] text-cyan-300 font-mono pt-1">
                                        Recommendation: {f.recommendation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tool Calls if any */}
                            {run.toolCalls && run.toolCalls.length > 0 && (
                              <div>
                                <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">
                                  Observable Tool Call Events:
                                </div>
                                <div className="p-3 rounded-lg bg-slate-900 font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
                                  {run.toolCalls.map((tc, tcIdx) => (
                                    <div key={tcIdx} className="text-slate-300">
                                      <span className="text-cyan-400 font-bold">{tc.tool}</span>({JSON.stringify(tc.arguments || {})})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparativeTrialsPage;
