'use client';

import React from 'react';

interface BarItem {
  name: string;
  weight: number; // 0..1
  description?: string;
  highlight?: boolean;
}

interface BarChartProps {
  title: string;
  items: BarItem[];
  color?: 'indigo' | 'emerald' | 'amber';
}

export default function BarChartComponent({ title, items, color = 'indigo' }: BarChartProps) {
  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const maxWeight = Math.max(...sorted.map(it => it.weight), 0.01);

  const colorMap = {
    indigo: {
      bar: 'bg-indigo-600',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      rank: 'bg-indigo-100 text-indigo-800',
    },
    emerald: {
      bar: 'bg-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      rank: 'bg-emerald-100 text-emerald-800',
    },
    amber: {
      bar: 'bg-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      rank: 'bg-amber-100 text-amber-800',
    },
  };

  const theme = colorMap[color];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>

      <div className="space-y-4">
        {sorted.map((item, idx) => {
          const percent = (item.weight * 100).toFixed(2);
          const barWidth = `${Math.round((item.weight / maxWeight) * 100)}%`;

          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx === 0 ? 'bg-indigo-600 text-white shadow-xs' : theme.rank
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800">{item.name}</span>
                  {item.description && (
                    <span className="text-slate-400 text-xs hidden sm:inline-block truncate max-w-xs">
                      ({item.description})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{percent}%</span>
                  <span className="text-xs text-slate-400 font-mono">({item.weight.toFixed(4)})</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                  style={{ width: barWidth }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
