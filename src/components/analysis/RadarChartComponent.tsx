'use client';

import React from 'react';

interface RadarChartProps {
  criteria: Array<{ id: string; name: string }>;
  alternatives: Array<{ id: string; name: string }>;
  contributionMatrix: number[][]; // [altIdx][critIdx]
}

const ALT_COLORS = [
  { stroke: '#4f46e5', fill: 'rgba(79, 70, 229, 0.25)', label: 'Indigo' },
  { stroke: '#059669', fill: 'rgba(5, 150, 105, 0.25)', label: 'Emerald' },
  { stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.25)', label: 'Amber' },
  { stroke: '#dc2626', fill: 'rgba(220, 38, 38, 0.25)', label: 'Rose' },
  { stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.25)', label: 'Purple' },
];

export default function RadarChartComponent({
  criteria,
  alternatives,
  contributionMatrix,
}: RadarChartProps) {
  const size = 320;
  const center = size / 2;
  const radius = center - 45;
  const numAxes = criteria.length;

  if (numAxes < 3 || alternatives.length === 0) {
    return null;
  }

  // Find max value in contributionMatrix for normalization
  let maxVal = 0.001;
  contributionMatrix.forEach(row => {
    row.forEach(val => {
      if (val > maxVal) maxVal = val;
    });
  });

  const getPoint = (value: number, axisIndex: number) => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col items-center">
      <h3 className="text-base font-bold text-slate-900 mb-2 self-start">
        평가 기준별 대안 프로필 (레이더 차트)
      </h3>
      <p className="text-xs text-slate-500 mb-4 self-start">
        각 대안이 어떤 평가 기준에서 높은 강점을 지니는지 비교합니다.
      </p>

      <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Concentric Grid Circles */}
          {[0.25, 0.5, 0.75, 1.0].map(fraction => (
            <circle
              key={fraction}
              cx={center}
              cy={center}
              r={radius * fraction}
              fill="none"
              stroke="#e2e8f0"
              strokeDasharray={fraction < 1.0 ? '3 3' : undefined}
            />
          ))}

          {/* Axes */}
          {criteria.map((crit, idx) => {
            const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const labelX = center + (radius + 20) * Math.cos(angle);
            const labelY = center + (radius + 20) * Math.sin(angle);

            return (
              <g key={crit.id}>
                <line x1={center} y1={center} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="600"
                  fill="#475569"
                >
                  {crit.name}
                </text>
              </g>
            );
          })}

          {/* Alternative Polygons */}
          {alternatives.map((alt, altIdx) => {
            const row = contributionMatrix[altIdx] || [];
            const points = row.map((val, critIdx) => {
              const pt = getPoint(val, critIdx);
              return `${pt.x},${pt.y}`;
            }).join(' ');

            const color = ALT_COLORS[altIdx % ALT_COLORS.length];

            return (
              <polygon
                key={alt.id}
                points={points}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="2"
                className="transition-all hover:opacity-80"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100 w-full">
        {alternatives.map((alt, idx) => {
          const color = ALT_COLORS[idx % ALT_COLORS.length];
          return (
            <div key={alt.id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color.stroke }}
              />
              <span>{alt.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
