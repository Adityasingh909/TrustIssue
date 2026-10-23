import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertOctagon,
  Copy,
  Check
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';

export function ResultsPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedRunId = queryParams.get('id');

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listTestRuns({
        status: statusFilter || undefined
      });
      setRuns(data);

      if (initialSelectedRunId && !selectedRun) {
        inspectRun(initialSelectedRunId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [statusFilter]);

  const inspectRun = async (id) => {
    try {
      setLoadingRunDetail(true);
      const data = await api.getTestRunById(id);
      setSelectedRun(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingRunDetail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Test Execution Results & Cryptographic Evidence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit logs, verdicts, raw completions, and captured vulnerability findings recorded in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Verdicts</option>
            <option value="COMPLETED">PASS (Completed)</option>
            <option value="FAILED">FAIL (Vulnerable)</option>
            <option value="INCONCLUSIVE">INCONCLUSIVE</option>
            <option value="ERROR">ERROR</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>

          <button
            onClick={fetchRuns}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Runs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Error Loading Test Results">
          {error.message}
        </Alert>
      )}

      {/* Results Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-mono">Querying execution audit logs from database...</p>
        </div>
      ) : runs.length > 0 ? (
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="pb-3 font-normal">Verdict / Status</th>
                <th className="pb-3 font-normal">Target Agent</th>
                <th className="pb-3 font-normal">Test Case</th>
                <th className="pb-3 font-normal">Category</th>
                <th className="pb-3 font-normal">Duration</th>
                <th className="pb-3 font-normal">Findings</th>
                <th className="pb-3 font-normal">Timestamp</th>
                <th className="pb-3 font-normal text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5">
                    <Badge variant={run.status}>{run.status}</Badge>
                  </td>
                  <td className="py-3.5">
                    <div className="font-medium text-slate-200">{run.agent?.name}</div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {run.agent?.provider}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-300 font-medium max-w-xs truncate">
                    {run.testCase?.title}
                  </td>
                  <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                    {run.testCase?.category}
                  </td>
                  <td className="py-3.5 font-mono text-slate-400">
                    {run.durationMs !== null ? `${run.durationMs}ms` : '--'}
                  </td>
                  <td className="py-3.5">
                    {run.findings && run.findings.length > 0 ? (
                      <span className="text-rose-400 font-mono font-medium">
                        {run.findings.length} finding(s)
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                    {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => inspectRun(run.id)}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="No Matching Test Runs Found"
          description="Try adjusting your status filter or launch a new security test run from the test library."
        />
      )}

      {/* Deep Evidence Inspection Modal */}
      {selectedRun && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRun(null)}
          title={`Test Run Audit Evidence: ${selectedRun.id}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 text-xs font-sans">
            {/* Header Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedRun.status}>{selectedRun.status}</Badge>
                  <span className="font-mono text-slate-300 text-xs">
                    {selectedRun.testCase?.title}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Target: {selectedRun.agent?.name} ({selectedRun.agent?.model})
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="text-slate-400">Latency: </span>
                <span className="text-cyan-300 font-bold">{selectedRun.durationMs}ms</span>
              </div>
            </div>

            {/* Supplied Task & Untrusted Input Payload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1.5 font-semibold">
                  Supplied Input / Untrusted Document Payload
                </h4>
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedRun.evaluationResult?.suppliedInput?.untrustedDocument ? (
                    <div>
                      {selectedRun.evaluationResult.suppliedInput.userQuery && (
                        <div className="text-cyan-300 mb-2 font-semibold">
                          Task: {selectedRun.evaluationResult.suppliedInput.userQuery}
                        </div>
                      )}
                      <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Untrusted Content:</div>
                      {selectedRun.evaluationResult.suppliedInput.untrustedDocument}
                    </div>
                  ) : (
                    selectedRun.evaluationResult?.suppliedInput?.userQuery ||
                    selectedRun.testCase?.testInput ||
                    'Input payload not recorded.'
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-mono text-[11px] uppercase text-emerald-400 mb-1.5 font-semibold">
                  Expected Safe Behavior Criteria
                </h4>
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300/90 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedRun.testCase?.expectedBehavior || 'Agent must preserve instruction hierarchy and refuse unauthorized adversarial directives.'}
                </div>
              </div>
            </div>

            {/* Evaluator Verdict & Reasoning */}
            <div>
              <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1.5 font-semibold">
                Evaluator Verdict & Reasoning
              </h4>
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed">
                {selectedRun.evaluationResult?.reason || 'Evaluation completed successfully.'}
              </div>
            </div>

            {/* Actual Model Output Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-mono text-[11px] uppercase text-slate-400 font-semibold">
                  Actual Agent Raw Response Text
                </h4>
                {selectedRun.actualResponse && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedRun.actualResponse);
                      setCopiedResponse(true);
                      setTimeout(() => setCopiedResponse(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200"
                  >
                    {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedResponse ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {selectedRun.actualResponse || (
                  <span className="text-slate-400 italic">No output text returned (e.g. error or empty response).</span>
                )}
              </div>
            </div>

            {/* Error Message if Operational Error */}
            {selectedRun.errorMessage && (
              <div>
                <h4 className="font-mono text-[11px] uppercase text-red-400 mb-1.5 font-semibold">
                  Operational Error Message
                </h4>
                <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 font-mono text-xs whitespace-pre-wrap">
                  {selectedRun.errorMessage}
                </div>
              </div>
            )}

            {/* Simulated Tool Invocations */}
            {selectedRun.evaluationResult?.details?.toolsChecked && (
              <div>
                <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1.5 font-semibold">
                  Simulated Sandbox Tool Interceptions
                </h4>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                  <div className="text-[11px] text-slate-400">
                    Policy Check: All tool attempts intercepted by memory sandbox (Zero live side effects).
                  </div>
                </div>
              </div>
            )}

            {/* Findings & Vulnerability Evidence */}
            {selectedRun.findings && selectedRun.findings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-mono text-[11px] uppercase text-rose-400 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Recorded Security Findings ({selectedRun.findings.length})
                </h4>

                {selectedRun.findings.map((f) => (
                  <div key={f.id} className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-300 text-sm">{f.title}</span>
                      <Badge variant={f.severity}>{f.severity}</Badge>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">{f.description}</p>

                    {f.evidence && (
                      <div className="p-3 rounded bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Cryptographic Evidence Trace:</div>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] text-cyan-300">
                          {JSON.stringify(f.evidence, null, 2)}
                        </pre>
                      </div>
                    )}

                    {f.recommendation && (
                      <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-900/40 text-[11px] text-cyan-300 font-mono">
                        <strong>Remediation:</strong> {f.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ResultsPage;
