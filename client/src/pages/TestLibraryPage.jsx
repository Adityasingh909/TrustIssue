import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCode,
  FileText,
  Search,
  Filter,
  Play,
  Eye,
  Shield,
  AlertTriangle,
  RefreshCw,
  Terminal,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';

export function TestLibraryPage() {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [inspectCase, setInspectCase] = useState(null);

  const categories = [
    'DIRECT_INJECTION',
    'INDIRECT_DOCUMENT_INJECTION',
    'TASK_HIJACKING',
    'SYNTHETIC_DATA_DISCLOSURE',
    'INSTRUCTION_HIERARCHY',
    'UNAUTHORIZED_TOOL_USE',
    'OUTPUT_INTEGRITY',
    'EXCESSIVE_AGENCY'
  ];

  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listTestCases({
        category: selectedCategory || undefined,
        severity: selectedSeverity || undefined,
        search: search || undefined
      });
      setTestCases(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, [selectedCategory, selectedSeverity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTestCases();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            Security Test Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and filter versioned benchmark scenarios across prompt injection, document ingestion, and tool misuse.
          </p>
        </div>

        <Badge variant="cyan" size="md">
          {testCases.length} Benchmark Scenarios Available
        </Badge>
      </div>

      {error && (
        <Alert variant="danger" title="Error Loading Test Cases">
          {error.message}
        </Alert>
      )}

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, test ID (e.g. TC-DPI-001), or description..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Severities</option>
              {severities.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Test Cases Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-mono">Loading security test specifications...</p>
        </div>
      ) : testCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className="p-5 rounded-xl border border-slate-800 bg-[#0c1222] flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-cyan-400">
                    {tc.testId || tc.category}
                  </span>
                  <Badge variant={tc.severity}>{tc.severity}</Badge>
                </div>

                <h3 className="font-semibold text-sm text-slate-100 mb-2 leading-snug">
                  {tc.title}
                </h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                  {tc.description}
                </p>

                <div className="space-y-1.5 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-slate-300 truncate max-w-[150px]">{tc.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Input Type:</span>
                    <span className="text-slate-300">{tc.inputType}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setInspectCase(tc)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Inspect
                </button>

                <div className="flex items-center gap-2">
                  {(tc.inputType === 'DOCUMENT' || tc.category === 'INDIRECT_DOCUMENT_INJECTION') && (
                    <Link
                      to={`/document-lab?testCaseId=${tc.id}&scenario=${tc.testId || ''}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                      title="Open in Document Lab"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Doc Lab</span>
                    </Link>
                  )}
                  <Link
                    to={`/run?testCaseId=${tc.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-800/60 text-xs font-medium transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Test
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#0c1222]">
          <p className="text-xs text-slate-400 font-mono">No security test cases matched your filter criteria.</p>
        </div>
      )}

      {/* Inspect Test Case Modal */}
      {inspectCase && (
        <Modal
          isOpen={true}
          onClose={() => setInspectCase(null)}
          title={`[${inspectCase.testId || inspectCase.category}] ${inspectCase.title}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex gap-2">
              <Badge variant={inspectCase.severity}>{inspectCase.severity}</Badge>
              <Badge variant="cyan">{inspectCase.category}</Badge>
              <Badge>{inspectCase.inputType}</Badge>
              <span className="font-mono text-slate-400 text-xs ml-auto">Version {inspectCase.version}</span>
            </div>

            <p className="text-slate-300 leading-relaxed">{inspectCase.description}</p>

            {inspectCase.originalTask && (
              <div>
                <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1">Original Assigned Task</h4>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono">
                  {inspectCase.originalTask}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1">Test Input Payload</h4>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {inspectCase.testInput}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1">Expected Safe Behavior</h4>
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 font-mono leading-relaxed">
                {inspectCase.expectedBehavior}
              </div>
            </div>

            {inspectCase.mitigation && (
              <div>
                <h4 className="font-mono text-[11px] uppercase text-slate-400 mb-1">Recommended Mitigation</h4>
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/40 text-cyan-300 font-mono">
                  {inspectCase.mitigation}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setInspectCase(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
              >
                Close
              </button>
              <Link
                to={`/run?testCaseId=${inspectCase.id}`}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs shadow-md shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Select & Execute Test
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TestLibraryPage;
