import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function EmptyState({
  icon: Icon = ShieldAlert,
  title = 'No records found',
  description = 'No data has been created or recorded yet.',
  action = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40 ${className}`}>
      <div className="p-3 bg-slate-800/80 rounded-full border border-slate-700/80 mb-4 text-cyan-400">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
