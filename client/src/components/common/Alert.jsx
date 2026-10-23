import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export function Alert({ variant = 'info', title, children, className = '' }) {
  const configs = {
    info: {
      bg: 'bg-cyan-950/40 border-cyan-800/50 text-cyan-200',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    danger: {
      bg: 'bg-rose-950/40 border-rose-800/50 text-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
  };

  const config = configs[variant] || configs.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${config.bg} ${className}`}>
      {config.icon}
      <div className="text-sm">
        {title && <h5 className="font-semibold mb-1 text-slate-100">{title}</h5>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Alert;
