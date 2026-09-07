'use client';

import React from 'react';
import { RealtimeConsistencyCheck } from '@/lib/ahp/consistency';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface ConsistencyTrackerProps {
  check: RealtimeConsistencyCheck;
  title: string;
}

export default function ConsistencyTracker({ check, title }: ConsistencyTrackerProps) {
  const { cr, status, triadViolations, totalPairs, answeredPairs, isAcceptable, message } = check;

  const progressPercent = totalPairs > 0 ? Math.round((answeredPairs / totalPairs) * 100) : 0;

  // Visual style config
  let statusBadge = {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    label: '우수 (CR ≤ 0.05)',
    barColor: 'bg-emerald-500',
    icon: CheckCircle2,
  };

  if (status === 'GOOD') {
    statusBadge = {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      label: '양호 (CR ≤ 0.10)',
      barColor: 'bg-blue-500',
      icon: ShieldCheck,
    };
  } else if (status === 'CAUTION') {
    statusBadge = {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      label: '주의 (0.10 < CR ≤ 0.15)',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
    };
  } else if (status === 'CRITICAL') {
    statusBadge = {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      label: '심각 (CR > 0.15)',
      barColor: 'bg-rose-500',
      icon: AlertOctagon,
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3 sm:px-6 transition-all">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Section name & Progress */}
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-900">
                {answeredPairs} / {totalPairs} 문항 완료
              </span>
              <span className="text-xs text-slate-400">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Right: Real-time CR Score & Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs text-slate-500 font-medium">일관성 비율(CR):</span>
              <span
                className={`text-base font-extrabold ${
                  isAcceptable ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {cr.toFixed(3)}
              </span>
            </div>
            <div className="w-32 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden ml-auto">
              <div
                className={`h-full transition-all duration-500 ${statusBadge.barColor}`}
                style={{ width: `${Math.min(100, Math.max(10, (cr / 0.2) * 100))}%` }}
              />
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{statusBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Triad or Critical Inconsistency Notification Banner */}
      {triadViolations.length > 0 && (
        <div className="max-w-4xl mx-auto mt-2.5 p-2.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 animate-pulse">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>논리적 순환 모순 발견:</strong> {triadViolations[0].message}
          </div>
        </div>
      )}
    </div>
  );
}
