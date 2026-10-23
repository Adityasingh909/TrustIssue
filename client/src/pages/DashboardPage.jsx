import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Play,
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertOctagon,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';

export function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMetricsSummary();
      setMetrics(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-mono">Loading laboratory security metrics...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Alert variant="danger" title="Unable to Load Dashboard Metrics">
          {error.message}
          <div className="mt-3">
            <button
              onClick={fetchMetrics}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  const {
    totalRuns = 0,
    completedCount = 0,
    failedCount = 0,
    inconclusiveCount = 0,
    errorCount = 0,
    passRate = 0,
    findingsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    categoryRates = [],
    timeline = [],
    recentRuns = []
  } = metrics || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#111c38] to-[#0c1829] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Real-Time Threat Laboratory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            TrustIssues Security Benchmark Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Continuous evaluation of AI agents against direct prompt injection, document ingestion attacks, canary token disclosure, and unauthorized simulated tools.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <Link
            to="/run"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch Test Run
          </Link>
        </div>
      </div>

      {/* KPI Metric Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Executed */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400">Total Executed</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalRuns}</div>
          <div className="text-[10px] text-slate-400 mt-1">Recorded in database</div>
        </div>

        {/* Pass Rate */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Pass Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{passRate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">{completedCount} passing verdicts</div>
        </div>

        {/* Failed Tests */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Security Failures</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{failedCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Vulnerabilities exploited</div>
        </div>

        {/* Inconclusive Tests */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Inconclusive</span>
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{inconclusiveCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Indeterminate responses</div>
        </div>

        {/* Execution Errors */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] shadow-sm col-span-2 md:col-span-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>System Errors</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{errorCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Timeouts / auth issues</div>
        </div>
      </div>

      {/* Vulnerability Severity Distribution Bar */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Vulnerabilities Discovered by Severity
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Total Findings: {findingsBySeverity.CRITICAL + findingsBySeverity.HIGH + findingsBySeverity.MEDIUM + findingsBySeverity.LOW}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40">
            <div className="text-[11px] font-mono text-rose-300 uppercase">Critical</div>
            <div className="text-xl font-bold text-rose-400 mt-1">{findingsBySeverity.CRITICAL}</div>
            <div className="text-[10px] text-rose-400/80">Canary leak / tool abuse</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40">
            <div className="text-[11px] font-mono text-amber-300 uppercase">High</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{findingsBySeverity.HIGH}</div>
            <div className="text-[10px] text-amber-400/80">Prompt override / hijack</div>
          </div>
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/40">
            <div className="text-[11px] font-mono text-cyan-300 uppercase">Medium</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{findingsBySeverity.MEDIUM}</div>
            <div className="text-[10px] text-cyan-400/80">Instruction hierarchy / format</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Low</div>
            <div className="text-xl font-bold text-slate-300 mt-1">{findingsBySeverity.LOW}</div>
            <div className="text-[10px] text-slate-400">Minor deviation / noise</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Category Rates & Historical Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pass Rates Chart */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-100">Category Security Rates</h3>
            <p className="text-xs text-slate-400">Pass rate percentage across evaluated attack vectors</p>
          </div>

          <div className="h-64 w-full">
            {categoryRates.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRates} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="category" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val) => [`${val}%`, 'Pass Rate']}
                  />
                  <Bar dataKey="passRate" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                No category data recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Historical Performance Timeline Chart */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-100">Historical Execution Latency</h3>
            <p className="text-xs text-slate-400">Response duration (ms) for recent test runs</p>
          </div>

          <div className="h-64 w-full">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="runIndex" stroke="#64748b" tickFormatter={(v) => `#${v}`} />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${v}ms`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val, name, item) => [`${val} ms (${item.payload.verdict})`, 'Latency']}
                  />
                  <Area type="monotone" dataKey="durationMs" stroke="#10b981" fillOpacity={1} fill="url(#latencyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                No timeline history recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Test Runs Table */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Recent Test Executions</h3>
            <p className="text-xs text-slate-400">Verdicts and evidence recorded in database</p>
          </div>
          <Link to="/results" className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1">
            View All Runs &rarr;
          </Link>
        </div>

        {recentRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal">Target Agent</th>
                  <th className="pb-3 font-normal">Test Case</th>
                  <th className="pb-3 font-normal">Category</th>
                  <th className="pb-3 font-normal">Duration</th>
                  <th className="pb-3 font-normal">Findings</th>
                  <th className="pb-3 font-normal text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3">
                      <Badge variant={run.status}>{run.status}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-200">{run.agentName}</div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{run.provider}</span>
                    </td>
                    <td className="py-3 text-slate-300 font-medium max-w-xs truncate">
                      {run.testCaseTitle}
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-[11px] text-slate-400">{run.category}</span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {run.durationMs !== null ? `${run.durationMs}ms` : '--'}
                    </td>
                    <td className="py-3">
                      {run.findingsCount > 0 ? (
                        <span className="text-rose-400 font-mono font-medium">{run.findingsCount} findings</span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/results?id=${run.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] underline"
                      >
                        Evidence
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Test Runs Recorded"
            description="Execute your first security evaluation to view real benchmark metrics and vulnerability findings."
            action={
              <Link
                to="/run"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch First Test Run
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
