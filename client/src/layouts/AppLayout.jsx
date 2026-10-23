import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Cpu,
  FileCode,
  FileText,
  Activity,
  FileBarChart,
  RefreshCw,
  Terminal,
  Server,
  Play,
  Layers
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth';

export function AppLayout() {
  const location = useLocation();
  const { data: health, loading: healthLoading, error: healthError, refetch } = useHealth(15000);

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Run Test', path: '/run', icon: Play },
    { name: 'Trials & Comparison', path: '/trials', icon: Layers },
    { name: 'Results & Audit', path: '/results', icon: Activity },
    { name: 'Agent Lab', path: '/agents', icon: Cpu },
    { name: 'Test Library', path: '/test-library', icon: FileCode },
    { name: 'Document Lab', path: '/document-lab', icon: FileText },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
  ];

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#0c1222] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand Header */}
          <Link to="/" className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 hover:bg-slate-900/40 transition-colors">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-slate-100 flex items-center gap-1 font-mono">
                TRUST<span className="text-cyan-400">ISSUES</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">AI AGENT SECURITY LAB</p>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System & Health Status in Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0a0f1d]">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/90 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Backend Node
              </span>
              <button
                onClick={() => refetch()}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                title="Refresh Health Status"
              >
                <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {healthError ? (
              <div className="flex items-center gap-2 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-mono text-[11px] truncate">API Offline</span>
              </div>
            ) : health ? (
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online (v{health.version})</span>
                </div>
                <div className="text-slate-400 flex justify-between text-[10px]">
                  <span>DB Status:</span>
                  <span className={health.database?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                    {health.database?.status || 'unknown'}
                  </span>
                </div>
                <div className="text-slate-400 flex justify-between text-[10px]">
                  <span>Uptime:</span>
                  <span className="text-slate-300">{health.uptimeSeconds}s</span>
                </div>
                {health.targetModel && (
                  <div className="text-slate-400 flex justify-between text-[10px] pt-1 border-t border-slate-800/60">
                    <span>Target AI:</span>
                    <span className="text-cyan-400 font-mono truncate max-w-[100px]" title={`${health.targetModel.provider} / ${health.targetModel.model}`}>
                      {health.targetModel.provider}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="font-mono text-[11px]">Connecting...</span>
              </div>
            )}
          </div>
          <div className="mt-2 px-1 text-[10px] text-slate-400 font-mono text-center">
            Antigravity Security Lab
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-[#0c1222]/80 backdrop-blur px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs text-slate-400">
              ENVIRONMENT: <strong className="text-slate-200">LOCAL_SANDBOX</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/run"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Test
            </Link>
          </div>
        </header>

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
