'use client';

import React from 'react';

export interface PairItemData {
  id: string;
  name: string;
  description?: string;
}

interface PairwiseItemProps {
  itemA: PairItemData;
  itemB: PairItemData;
  pairKey: string;
  value: number | undefined; // >1: A preferred, <-1: B preferred, 1: equal
  onChange: (pairKey: string, value: number) => void;
  isWorstOffender?: boolean;
  recommendedText?: string;
}

const SCALE_OPTIONS = [
  { val: 9, label: '9', sub: '절대적', side: 'left' },
  { val: 7, label: '7', sub: '매우', side: 'left' },
  { val: 5, label: '5', sub: '확실히', side: 'left' },
  { val: 3, label: '3', sub: '약간', side: 'left' },
  { val: 1, label: '1', sub: '동등', side: 'center' },
  { val: -3, label: '3', sub: '약간', side: 'right' },
  { val: -5, label: '5', sub: '확실히', side: 'right' },
  { val: -7, label: '7', sub: '매우', side: 'right' },
  { val: -9, label: '9', sub: '절대적', side: 'right' },
];

export default function PairwiseItem({
  itemA,
  itemB,
  pairKey,
  value,
  onChange,
  isWorstOffender,
  recommendedText,
}: PairwiseItemProps) {
  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        isWorstOffender
          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
          : value !== undefined
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-slate-50/70 border-slate-200 hover:bg-white'
      }`}
    >
      {/* Item Labels Comparison Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {/* Left Item A */}
        <div className="flex-1 text-left sm:pr-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
            <span className="font-bold text-slate-900 text-base">{itemA.name}</span>
          </div>
          {itemA.description && (
            <p className="text-xs text-slate-500 mt-0.5 pl-4.5">{itemA.description}</p>
          )}
        </div>

        {/* VS Badge */}
        <div className="self-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider shrink-0">
          VS
        </div>

        {/* Right Item B */}
        <div className="flex-1 text-left sm:text-right sm:pl-4">
          <div className="flex items-center sm:justify-end gap-2">
            <span className="font-bold text-slate-900 text-base">{itemB.name}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
          </div>
          {itemB.description && (
            <p className="text-xs text-slate-500 mt-0.5 sm:pr-4.5">{itemB.description}</p>
          )}
        </div>
      </div>

      {/* Saaty 9-point Scale Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
          <span className="text-indigo-700 font-semibold">◀ [{itemA.name}] 더 중요</span>
          <span className="text-slate-400">동등</span>
          <span className="text-emerald-700 font-semibold">[{itemB.name}] 더 중요 ▶</span>
        </div>

        <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
          {SCALE_OPTIONS.map(opt => {
            const isSelected = value === opt.val;
            const isLeft = opt.side === 'left';
            const isRight = opt.side === 'right';
            const isCenter = opt.side === 'center';

            let btnStyle = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100';
            if (isSelected) {
              if (isLeft) {
                btnStyle = 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 font-bold';
              } else if (isRight) {
                btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200 font-bold';
              } else {
                btnStyle = 'bg-slate-800 text-white border-slate-800 font-bold';
              }
            }

            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => onChange(pairKey, opt.val)}
                className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl border text-center transition ${btnStyle}`}
              >
                <span className="text-sm sm:text-base font-bold">{opt.label}</span>
                <span className="text-[10px] hidden sm:block opacity-80">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Worst Inconsistency Callout if flagged */}
      {isWorstOffender && recommendedText && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span>
            ⚠️ <strong>일관성 개선 추천:</strong> 다른 문항들의 응답 패턴상, 이 문항은 <strong>{recommendedText}</strong>일 때 논리적 일관성이 가장 높습니다.
          </span>
        </div>
      )}
    </div>
  );
}
