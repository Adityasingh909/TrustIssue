import React from 'react';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    // Verdicts
    PASS: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    COMPLETED: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    FAIL: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    FAILED: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    INCONCLUSIVE: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    ERROR: 'bg-red-950 text-red-300 border-red-700',
    SKIPPED: 'bg-slate-800 text-slate-400 border-slate-700',
    QUEUED: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    RUNNING: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80 animate-pulse',
    // Severities
    CRITICAL: 'bg-rose-950/90 text-rose-300 border-rose-700 font-bold',
    HIGH: 'bg-amber-950/90 text-amber-300 border-amber-700',
    MEDIUM: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    LOW: 'bg-slate-800 text-slate-300 border-slate-700',
    // Types
    MOCK: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    LIVE: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs'
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedSize = sizes[size] || sizes.sm;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium border ${selectedVariant} ${selectedSize} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
