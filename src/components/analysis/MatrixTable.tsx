'use client';

import React from 'react';
import { AHPResult } from '@/lib/ahp/calculator';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface MatrixTableProps {
  title: string;
  items: Array<{ id: string; name: string }>;
  ahpResult: AHPResult;
}

export default function MatrixTable({ title, items, ahpResult }: MatrixTableProps) {
  const { matrix, weights, lambdaMax, ci, cr, isConsistent } = ahpResult;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            λmax: <strong>{lambdaMax.toFixed(4)}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">
            CI: <strong>{ci.toFixed(4)}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 font-bold">
            CR:
            <span className={isConsistent ? 'text-emerald-600' : 'text-rose-600'}>
              {cr.toFixed(4)}
            </span>
            {isConsistent ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-2.5 px-3 font-semibold text-slate-700">구분</th>
              {items.map(item => (
                <th key={item.id} className="py-2.5 px-3 font-semibold text-center text-slate-700">
                  {item.name}
                </th>
              ))}
              <th className="py-2.5 px-3 font-bold text-right text-indigo-700 bg-indigo-50/50">
                가중치 (Wi)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((rowItem, i) => (
              <tr key={rowItem.id} className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-3 font-bold text-slate-800">{rowItem.name}</td>
                {items.map((colItem, j) => {
                  const val = matrix[i]?.[j] ?? 1.0;
                  const isDiag = i === j;
                  return (
                    <td
                      key={colItem.id}
                      className={`py-2.5 px-3 text-center font-mono ${
                        isDiag ? 'text-slate-400 bg-slate-50/50' : 'text-slate-700'
                      }`}
                    >
                      {val >= 1 ? val.toFixed(2) : `1/${(1 / val).toFixed(1)}`}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-right font-bold text-indigo-700 font-mono bg-indigo-50/30">
                  {((weights[i] || 0) * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
