import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';

export function ReportsPage() {
  const [reportsList, setReportsList] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [agents, setAgents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Generation Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTitle, setGenerateTitle] = useState('');
  const [generateAgentId, setGenerateAgentId] = useState('');

  // Expandable findings
  const [expandedFindings, setExpandedFindings] = useState({});

  // Active view tab: 'overview' | 'findings' | 'markdown'
  const [activeTab, setActiveTab] = useState('overview');
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);

  // Fetch initial reports and agents
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reports, agentsData] = await Promise.all([
        api.listReports(),
        api.listAgents()
      ]);

      setReportsList(reports);
      setAgents(agentsData);

      if (reports.length > 0) {
        // Select the most recent report or preserve current selection
        const targetId = selectedReportId || reports[0].id;
        setSelectedReportId(targetId);
        await loadReportDetails(targetId);
      } else {
        // Automatically generate an initial report if test runs exist
        try {
          const autoReport = await api.generateReport({
            title: 'Initial AI Agent Security Baseline Audit'
          });
          setReportsList([autoReport]);
          setSelectedReportId(autoReport.id);
          setCurrentReport(autoReport);
        } catch {
          // If no test runs exist yet, that's okay
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (id) => {
    try {
      const data = await api.getReportById(id);
      setCurrentReport(data);
      if (activeTab === 'markdown') {
        loadMarkdown(id);
      }
    } catch (err) {
      setError(err);
    }
  };

  const loadMarkdown = async (id) => {
    try {
      setLoadingMarkdown(true);
      const md = await api.getReportMarkdown(id);
      setMarkdownContent(md);
    } catch (err) {
      console.error('Failed to load markdown', err);
    } finally {
      setLoadingMarkdown(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectReport = (id) => {
    setSelectedReportId(id);
    loadReportDetails(id);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'markdown' && currentReport) {
      loadMarkdown(currentReport.id);
    }
  };

  const toggleFinding = (id) => {
    setExpandedFindings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Generate Report Handler
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError(null);

      const payload = {
        title: generateTitle.trim() || undefined,
        agentId: generateAgentId || undefined
      };

      const newReport = await api.generateReport(payload);
      setShowGenerateModal(false);
      setGenerateTitle('');
      setGenerateAgentId('');

      // Reload list and select new report
      const updatedReports = await api.listReports();
      setReportsList(updatedReports);
      setSelectedReportId(newReport.id);
      setCurrentReport(newReport);
    } catch (err) {
      setError(err);
    } finally {
      setGenerating(false);
    }
  };

  // Export JSON Report
  const exportJsonReport = () => {
    if (!currentReport) return;
    const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentReport.downloadFilename || `trustissues-report-${currentReport.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Markdown Report
  const exportMarkdownReport = async () => {
    if (!currentReport) return;
    try {
      const md = await api.getReportMarkdown(currentReport.id);
      const blob = new Blob([md], { type: 'text/markdown; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trustissues-report-${currentReport.id.substring(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err);
    }
  };

  if (loading && !currentReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-mono">Loading evidence-based security reports from database...</p>
      </div>
    );
  }

  const metrics = currentReport?.metrics || {};
  const {
    totalTests = 0,
    conclusive = 0,
    passed = 0,
    failed = 0,
    inconclusive = 0,
    error: errorCount = 0,
    passRate = 0,
    findingsBySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    totalFindings = 0,
    partitions = {},
    agentProfiles = [],
    categoryBreakdown = [],
    detailedFindings = [],
    recommendedMitigations = [],
    limitations = [],
    weightedRiskIndex = null,
    ratingNotice = ''
  } = metrics;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-cyan-400" />
            Evidence-Based Security Reporting
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit-grade security assessments generated strictly from stored database test runs and captured verification evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Generate New Report
          </button>

          <button
            onClick={exportJsonReport}
            disabled={!currentReport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export JSON
          </button>

          <button
            onClick={exportMarkdownReport}
            disabled={!currentReport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Export Markdown
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Report Error">
          {error.message || String(error)}
        </Alert>
      )}

      {/* Report Selection Bar */}
      {reportsList.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">Selected Audit:</span>
            <select
              value={selectedReportId || ''}
              onChange={(e) => handleSelectReport(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 max-w-md truncate"
            >
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({new Date(r.createdAt).toLocaleDateString()}) - {r.totalTests || 0} runs
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Report ID: <code className="text-cyan-400">{currentReport?.id?.substring(0, 13)}...</code></span>
            <span>Created: <span className="text-slate-200">{currentReport?.createdAt ? new Date(currentReport.createdAt).toLocaleString() : 'N/A'}</span></span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-3 px-3 text-xs font-mono border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Assessment Overview & Metrics
        </button>
        <button
          onClick={() => handleTabChange('findings')}
          className={`pb-3 px-3 text-xs font-mono border-b-2 transition-colors ${
            activeTab === 'findings'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Detailed Findings ({totalFindings})
        </button>
        <button
          onClick={() => handleTabChange('markdown')}
          className={`pb-3 px-3 text-xs font-mono border-b-2 transition-colors ${
            activeTab === 'markdown'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Markdown Audit Brief
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Summary Narrative */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222]">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Executive Summary Narrative
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {currentReport?.summary || 'No summary available.'}
            </p>
          </div>

          {/* Conclusive Security Scorecards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Conclusive Assessment Metrics
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Rule: Pass rate computed solely from conclusive tests ({conclusive})
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {/* Total Evaluations */}
              <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222]">
                <span className="text-[10px] font-mono uppercase text-slate-400">Total Evaluations</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{totalTests}</div>
                <span className="text-[10px] text-slate-500">Stored DB runs</span>
              </div>

              {/* Conclusive Pass Rate */}
              <div className="p-4 rounded-xl border border-emerald-950/60 bg-emerald-950/20">
                <span className="text-[10px] font-mono uppercase text-emerald-400">Conclusive Pass Rate</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{passRate}%</div>
                <span className="text-[10px] text-emerald-300/70">{passed}/{conclusive} conclusive runs</span>
              </div>

              {/* Passed Tests */}
              <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222]">
                <span className="text-[10px] font-mono uppercase text-slate-400">Passed Tests</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{passed}</div>
                <span className="text-[10px] text-slate-500">Safety verified</span>
              </div>

              {/* Failed Tests */}
              <div className="p-4 rounded-xl border border-rose-950/60 bg-rose-950/20">
                <span className="text-[10px] font-mono uppercase text-rose-400">Failed Tests</span>
                <div className="text-2xl font-bold text-rose-400 mt-1">{failed}</div>
                <span className="text-[10px] text-rose-300/70">Confirmed exploits</span>
              </div>

              {/* Inconclusive Tests */}
              <div className="p-4 rounded-xl border border-amber-950/60 bg-amber-950/20">
                <span className="text-[10px] font-mono uppercase text-amber-400">Inconclusive Runs</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">{inconclusive}</div>
                <span className="text-[10px] text-amber-300/70">Ambiguous output</span>
              </div>

              {/* Execution Errors */}
              <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222]">
                <span className="text-[10px] font-mono uppercase text-slate-400">Execution Errors</span>
                <div className="text-2xl font-bold text-slate-300 mt-1">{errorCount}</div>
                <span className="text-[10px] text-slate-500">System/API timeouts</span>
              </div>
            </div>
          </div>

          {/* Mock vs Live Partition Separation */}
          <div className="p-5 rounded-xl border border-cyan-900/40 bg-cyan-950/10 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                Mock Agent vs Live Model Partition Separation
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              {partitions.separationNotice || 'Mock agent results are strictly partitioned from live model executions to prevent false evaluation equivalence.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Mock Partition */}
              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-200">Mock Synthetic Benchmarks</span>
                  <Badge variant="MOCK">MOCK_AGENT</Badge>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Runs</span>
                    <span className="text-sm font-bold text-slate-200">{partitions.mock?.totalTests || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-emerald-400 block">Pass</span>
                    <span className="text-sm font-bold text-emerald-400">{partitions.mock?.passed || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-rose-400 block">Fail</span>
                    <span className="text-sm font-bold text-rose-400">{partitions.mock?.failed || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-cyan-400 block">Rate</span>
                    <span className="text-sm font-bold text-cyan-300">{partitions.mock?.passRate || 0}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {partitions.mock?.note}
                </p>
              </div>

              {/* Live Partition */}
              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-200">Live Model Inference</span>
                  <Badge variant="LIVE">LIVE_MODEL</Badge>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Runs</span>
                    <span className="text-sm font-bold text-slate-200">{partitions.live?.totalTests || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-emerald-400 block">Pass</span>
                    <span className="text-sm font-bold text-emerald-400">{partitions.live?.passed || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-rose-400 block">Fail</span>
                    <span className="text-sm font-bold text-rose-400">{partitions.live?.failed || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/50">
                    <span className="text-[10px] text-cyan-400 block">Rate</span>
                    <span className="text-sm font-bold text-cyan-300">{partitions.live?.passRate || 0}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {partitions.live?.note}
                </p>
              </div>
            </div>
          </div>

          {/* Weighted Risk Index & Rating Disclaimer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weighted Score */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {weightedRiskIndex?.name || 'Weighted Risk Index'}
                </h3>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {weightedRiskIndex?.score ?? 0.0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                <code>{weightedRiskIndex?.formula}</code>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {weightedRiskIndex?.description}
              </p>
              <p className="text-[11px] text-slate-500 italic">
                <strong>Limitations:</strong> {weightedRiskIndex?.limitations}
              </p>
            </div>

            {/* Universal Rating Disclaimer */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Universal Security Rating
                </h3>
                <span className="text-xs font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                  NONE ASSIGNED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {ratingNotice}
              </p>
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-mono text-slate-400 mb-1">Findings by Severity Density:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="CRITICAL">Critical: {findingsBySeverity.CRITICAL}</Badge>
                  <Badge variant="HIGH">High: {findingsBySeverity.HIGH}</Badge>
                  <Badge variant="MEDIUM">Medium: {findingsBySeverity.MEDIUM}</Badge>
                  <Badge variant="LOW">Low: {findingsBySeverity.LOW}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluated Agent Profiles Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Evaluated Agent Profiles ({agentProfiles.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="pb-3 font-normal">Agent Name</th>
                    <th className="pb-3 font-normal">Type</th>
                    <th className="pb-3 font-normal">Provider / Model</th>
                    <th className="pb-3 font-normal">Total Runs</th>
                    <th className="pb-3 font-normal">Conclusive</th>
                    <th className="pb-3 font-normal">Pass Rate</th>
                    <th className="pb-3 font-normal">Defense Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {agentProfiles.map((a) => (
                    <tr key={a.agentId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-slate-200">{a.name}</td>
                      <td className="py-3">
                        <Badge variant={a.isMock ? 'MOCK' : 'LIVE'}>{a.type}</Badge>
                      </td>
                      <td className="py-3 font-mono text-slate-300">
                        {a.provider} / {a.model}
                      </td>
                      <td className="py-3 font-mono text-slate-400">{a.totalTests}</td>
                      <td className="py-3 font-mono text-slate-300">
                        {a.passed}P / {a.failed}F
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        {a.passRate}%
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {a.configuration?.defenseType || 'none'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results by Threat Category Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Threat Category Vulnerability Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="pb-3 font-normal">Threat Category</th>
                    <th className="pb-3 font-normal">Total</th>
                    <th className="pb-3 font-normal">Passed</th>
                    <th className="pb-3 font-normal">Failed</th>
                    <th className="pb-3 font-normal">Inconclusive</th>
                    <th className="pb-3 font-normal">Errors</th>
                    <th className="pb-3 font-normal">Conclusive Pass Rate</th>
                    <th className="pb-3 font-normal">Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {categoryBreakdown.map((cat) => (
                    <tr key={cat.category} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-slate-200">{cat.displayName}</td>
                      <td className="py-3 font-mono text-slate-400">{cat.total}</td>
                      <td className="py-3 font-mono text-emerald-400">{cat.passed}</td>
                      <td className="py-3 font-mono text-rose-400">{cat.failed}</td>
                      <td className="py-3 font-mono text-amber-400">{cat.inconclusive}</td>
                      <td className="py-3 font-mono text-slate-400">{cat.error}</td>
                      <td className="py-3 font-mono font-bold text-slate-200">
                        {cat.conclusive > 0 ? `${cat.passRate}%` : 'N/A'}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          cat.findingsCount > 0 ? 'bg-rose-950/60 text-rose-400 border border-rose-800' : 'text-slate-500'
                        }`}>
                          {cat.findingsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Recommended Mitigations */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Prioritized Actionable Mitigations ({recommendedMitigations.length})
            </h3>
            {recommendedMitigations.length > 0 ? (
              <div className="space-y-3">
                {recommendedMitigations.map((mit, i) => (
                  <div key={i} className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={mit.highestSeverity}>{mit.highestSeverity}</Badge>
                        <span className="text-xs font-semibold text-slate-200">{mit.recommendation}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Category: <span className="font-mono text-cyan-400">{mit.category}</span> | Target Agents: <span className="text-slate-300">{mit.affectedAgents.join(', ')}</span>
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      Found in {mit.occurrenceCount} test failure(s)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No actionable mitigations pending. All evaluated tests passed safety criteria.</p>
            )}
          </div>

          {/* Known Limitations */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Known Evaluation Limitations
            </h3>
            <div className="space-y-2">
              {limitations.map((lim, i) => (
                <div key={i} className="text-xs text-slate-400 font-sans">
                  <span className="font-semibold text-slate-300">{lim.title}:</span> {lim.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED FINDINGS */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Recorded Security Findings ({detailedFindings.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Preserved evaluation evidence traces from PostgreSQL
            </span>
          </div>

          {detailedFindings.length > 0 ? (
            <div className="space-y-3">
              {detailedFindings.map((finding) => {
                const isExpanded = !!expandedFindings[finding.id];
                return (
                  <div key={finding.id} className="rounded-xl border border-slate-800 bg-[#0c1222] overflow-hidden">
                    <div
                      onClick={() => toggleFinding(finding.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Badge variant={finding.severity}>{finding.severity}</Badge>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">{finding.title}</h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {finding.testCaseTitle} (v{finding.testCaseVersion}) • Agent: {finding.agentName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={finding.isMock ? 'MOCK' : 'LIVE'}>
                          {finding.isMock ? 'MOCK' : 'LIVE'}
                        </Badge>
                        <span className="text-[11px] font-mono text-slate-500">
                          {finding.category}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-4 text-xs font-sans">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Violation Description</span>
                          <p className="text-slate-300">{finding.description}</p>
                        </div>

                        {/* Evidence Trace */}
                        <div>
                          <span className="text-[10px] font-mono uppercase text-cyan-400 block mb-1 flex items-center gap-1">
                            <Code className="w-3.5 h-3.5" />
                            Preserved Evaluation Evidence Trace
                          </span>
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                            <pre>{JSON.stringify(finding.evidence, null, 2)}</pre>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                          <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Recommended Remediation</span>
                          <p className="text-emerald-200/90">{finding.recommendation}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                          <span>Finding ID: {finding.id}</span>
                          <span>Referenced TestRun ID: {finding.testRunId}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Zero Security Findings"
              description="No security violations were detected in the selected evaluation dataset."
            />
          )}
        </div>
      )}

      {/* TAB 3: MARKDOWN AUDIT BRIEF */}
      {activeTab === 'markdown' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Formatted Markdown Audit Brief
            </h3>
            <button
              onClick={exportMarkdownReport}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download .md
            </button>
          </div>

          {loadingMarkdown ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap">{markdownContent}</pre>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Evidence-Based Security Report"
      >
        <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-mono mb-1">Report Title (Optional)</label>
            <input
              type="text"
              value={generateTitle}
              onChange={(e) => setGenerateTitle(e.target.value)}
              placeholder="e.g. Q4 AI Agent Red Team Assessment"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1">Target Agent Scope</label>
            <select
              value={generateAgentId}
              onChange={(e) => setGenerateAgentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Agents (Full Multi-Agent Assessment)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.provider} / {a.model})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting an agent aggregates all stored runs for that target. Leaving empty evaluates the entire test suite.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating && <Spinner size="sm" />}
              Generate & Persist Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ReportsPage;
