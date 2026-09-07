'use client';

import React from 'react';
import { RealtimeConsistencyCheck } from '@/lib/ahp/consistency';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, Check } from 'lucide-react';

export interface TrackerTab {
  id: string; // 'criteria' or criterion id
  title: string; // '1단계: 평가 기준' or '2단계: [가격] 관점 대안 비교'
  shortTitle: string; // '1단계: 기준' or '2-1: 가격'
  check: RealtimeConsistencyCheck;
}

interface ConsistencyTrackerProps {
  tabs: TrackerTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
}

export default function ConsistencyTracker({
  tabs,
  activeTabId,
  onSelectTab,
}: ConsistencyTrackerProps) {
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  if (!currentTab) return null;

  const { cr, status, triadViolations, totalPairs, answeredPairs, isAcceptable } = currentTab.check;
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

  if (answeredPairs < 3 && totalPairs > 0) {
    statusBadge = {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-600',
      label: '응답 진행 중',
      barColor: 'bg-indigo-500',
      icon: ShieldCheck,
    };
  } else if (status === 'GOOD') {
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
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-2.5 sm:px-6 transition-all">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Step Selector Tabs in Sticky Bar */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 uppercase">
              실시간 일관성:
            </span>
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              const isTabComplete = tab.check.answeredPairs === tab.check.totalPairs && tab.check.totalPairs > 0;
              const tabCR = tab.check.cr;
              const isTabGood = tab.check.isAcceptable && tab.check.triadViolations.length === 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.shortTitle}</span>
                  {tab.check.answeredPairs > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-indigo-700 text-white'
                          : isTabGood
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      CR {tabCR.toFixed(2)}
                    </span>
                  )}
                  {isTabComplete && (
                    <Check className={`w-3 h-3 ${isActive ? 'text-indigo-200' : 'text-emerald-600'}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Detailed Status Bar for currently selected matrix */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
          {/* Section title & progress */}
          <div>
            <span className="text-xs font-bold text-slate-900 block truncate max-w-sm sm:max-w-md">
              {currentTab.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-medium">
                {answeredPairs} / {totalPairs} 문항 완료
              </span>
              <span className="text-xs text-slate-400">({progressPercent}%)</span>
            </div>
          </div>

          {/* CR Score & Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs text-slate-500 font-medium">일관성 비율(CR):</span>
                <span
                  className={`text-base font-extrabold ${
                    isAcceptable ? 'text-slate-900' : 'text-rose-600'
                  }`}
                >
                  {answeredPairs >= 3 ? cr.toFixed(3) : '-'}
                </span>
              </div>
              <div className="w-28 sm:w-32 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden ml-auto">
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

        {/* Triad Violation Alert Banner */}
        {triadViolations.length > 0 && (
          <div className="p-2 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 animate-pulse">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <strong>논리적 순환 모순 감지:</strong> {triadViolations[0].message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
