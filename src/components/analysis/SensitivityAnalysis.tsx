'use client';

import { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Sliders,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Info,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface Criterion {
  id: string;
  name: string;
  weight?: number;
}

interface Alternative {
  id: string;
  name: string;
  weight?: number;
}

interface SensitivityAnalysisProps {
  criteria: Criterion[];
  alternatives: Alternative[];
  criteriaWeights: number[];
  alternativesAHPByCriteria: Record<string, { weights: number[] }>;
  hasAlternatives: boolean;
}

// 대안별 차트 색상 팔레트
const ALT_COLORS = [
  '#4f46e5', // indigo
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#db2777', // pink
  '#ea580c', // orange
];

export default function SensitivityAnalysis({
  criteria = [],
  alternatives = [],
  criteriaWeights = [],
  alternativesAHPByCriteria = {},
  hasAlternatives = false,
}: SensitivityAnalysisProps) {
  const isValidData = Boolean(hasAlternatives && alternatives.length >= 2 && criteria.length >= 2);

  const [selectedCritIdx, setSelectedCritIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const currentOrigCritWeight = criteriaWeights[selectedCritIdx] ?? 0;
  const [sliderWeight, setSliderWeight] = useState<number>(criteriaWeights[0] ?? 0);

  // 선택된 기준이 바뀔 때 슬라이더 값을 해당 기준의 원래 가중치로 동기화
  const handleSelectCrit = (idx: number) => {
    setSelectedCritIdx(idx);
    setSliderWeight(criteriaWeights[idx] ?? 0);
  };

  const handleReset = () => {
    setSliderWeight(currentOrigCritWeight);
  };

  // --- 민감도 수학 계산 ---
  const sensitivityData = useMemo(() => {
    if (!isValidData || !criteria[selectedCritIdx]) {
      return { lines: [], breakEvens: [] };
    }
    const selectedCrit = criteria[selectedCritIdx];
    const origW0 = criteriaWeights[selectedCritIdx] || 0.0001;

    // 대안별 선형 함수 W_j(x) = (a_j - b_j) * x + b_j
    // a_j: 선택된 기준 하에서 대안 j의 가중치
    // b_j: 선택된 기준을 제외한 나머지 기준들 하에서의 가중치 합
    const selectedAltWeights = alternativesAHPByCriteria[selectedCrit?.id]?.weights || [];

    const lines = alternatives.map((alt, j) => {
      const a_j = selectedAltWeights[j] || 0;

      let sumOther = 0;
      criteria.forEach((c, cIdx) => {
        if (cIdx !== selectedCritIdx) {
          const w_c = criteriaWeights[cIdx] || 0;
          const altW_c = alternativesAHPByCriteria[c.id]?.weights?.[j] || 0;
          sumOther += w_c * altW_c;
        }
      });

      const b_j = origW0 < 1 ? sumOther / (1 - origW0) : a_j;
      const slope = a_j - b_j;
      const intercept = b_j;

      // 슬라이더 가중치 x일 때의 대안 종합 가중치
      const currentSimulatedWeight = Math.max(0, Math.min(1, slope * sliderWeight + intercept));

      return {
        alt,
        color: ALT_COLORS[j % ALT_COLORS.length],
        a_j,
        b_j,
        slope,
        intercept,
        currentSimulatedWeight,
      };
    });

    // 교차점(순위 역전 분기점, Break-even points) 계산
    const breakEvens: Array<{
      critWeight: number;
      altA: string;
      altB: string;
      y: number;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const l1 = lines[i];
        const l2 = lines[j];
        const deltaSlope = l1.slope - l2.slope;
        if (Math.abs(deltaSlope) > 0.0001) {
          const xStar = (l2.intercept - l1.intercept) / deltaSlope;
          if (xStar >= 0 && xStar <= 1) {
            const yStar = l1.slope * xStar + l1.intercept;
            breakEvens.push({
              critWeight: xStar,
              altA: l1.alt.name,
              altB: l2.alt.name,
              y: yStar,
            });
          }
        }
      }
    }

    breakEvens.sort((a, b) => a.critWeight - b.critWeight);

    return { lines, breakEvens };
  }, [criteria, alternatives, criteriaWeights, alternativesAHPByCriteria, selectedCritIdx, sliderWeight]);

  // 시뮬레이션된 가중치 기준 대안 순위 정렬
  const simulatedRanks = [...sensitivityData.lines].sort(
    (a, b) => b.currentSimulatedWeight - a.currentSimulatedWeight
  );
  const currentWinner = simulatedRanks[0];

  // 기본 검증: 대안 평가가 없거나 대안/기준이 2개 미만인 경우
  if (!isValidData) {
    return (
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm text-center py-10">
        <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-800">민감도 분석 (Sensitivity Analysis)</h4>
        <p className="text-xs text-slate-500 mt-1">
          대안 민감도 분석은 2개 이상의 평가 기준과 대안이 평가된 설문에서만 제공됩니다.
        </p>
      </div>
    );
  }

  // --- 차트 SVG 좌표 매핑 ---
  const chartW = 600;
  const chartH = 320;
  const padLeft = 55;
  const padRight = 40;
  const padTop = 30;
  const padBottom = 45;

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const toSvgX = (weight: number) => padLeft + weight * plotW;
  const toSvgY = (weight: number) => padTop + plotH - weight * plotH;

  // 학술 해석 문장 생성
  const selectedCritName = criteria[selectedCritIdx]?.name || '선택된 기준';
  const origPercent = (currentOrigCritWeight * 100).toFixed(1);
  const sliderPercent = (sliderWeight * 100).toFixed(1);

  let breakEvenSentence = '';
  if (sensitivityData.breakEvens.length > 0) {
    const keyInversion = sensitivityData.breakEvens.find(
      be => Math.abs(be.critWeight - currentOrigCritWeight) > 0.05
    ) || sensitivityData.breakEvens[0];

    breakEvenSentence = `대안 민감도 분석(Sensitivity Analysis) 결과, '${selectedCritName}'의 중요도 가중치가 현재 ${origPercent}%에서 ${(keyInversion.critWeight * 100).toFixed(1)}% 수준으로 변동될 때, '${keyInversion.altA}'와(과) '${keyInversion.altB}' 간의 우선순위 역전(Rank Reversal) 현상이 발생하는 것으로 분석되었다.`;
  } else {
    const winnerName = currentWinner?.alt?.name || '최우선 대안';
    breakEvenSentence = `대안 민감도 분석(Sensitivity Analysis) 결과, '${selectedCritName}'의 가중치가 0%에서 100%까지 변동하더라도 최우선 대안인 '${winnerName}'의 1위 순위는 견고하게 유지되는 것으로 나타나, 평가 결과의 구조적 안정성을 확인하였다.`;
  }

  const fullAcademicText = `${breakEvenSentence} 이는 본 의사결정 모델에서 '${selectedCritName}' 기준의 중요도 변화가 최종 대안 선정에 미치는 민감도와 임계치를 정량적으로 입증하는 실증적 근거가 된다.`;

  // --- 고화질 PNG 다운로드 핸들러 ---
  const handleDownloadPNG = () => {
    if (!svgRef.current) return;
    setDownloading(true);

    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = typeof window !== 'undefined' ? (window.URL || window.webkitURL || window) : null;
      if (!URLObj) return;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const scale = 2.5;
        const canvas = document.createElement('canvas');
        canvas.width = chartW * scale;
        canvas.height = chartH * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);

        const pngURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngURL;
        link.download = `AHP_민감도분석_${selectedCritName}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URLObj.revokeObjectURL(blobURL);
        setDownloading(false);
      };
      image.src = blobURL;
    } catch (err) {
      console.error(err);
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            대안 민감도 분석 (Sensitivity Analysis) 시뮬레이터
            <span className="text-[11px] font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-100">
              학술지 심사용
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            특정 평가 기준의 중요도가 변화할 때 최종 대안들의 순위가 어떻게 변하고 역전되는지 실시간 검증합니다.
          </p>
        </div>

        {/* Criterion Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 shrink-0">분석 기준 선택:</label>
          <select
            value={selectedCritIdx}
            onChange={e => handleSelectCrit(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            {criteria.map((c, idx) => (
              <option key={c.id} value={idx}>
                {c.name} (현재: {((criteriaWeights[idx] || 0) * 100).toFixed(1)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-600" />
            '{selectedCritName}' 가중치 가상 조절 (What-If Simulation)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              가상 가중치: {sliderPercent}% (현재: {origPercent}%)
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-2xs"
              title="원래 가중치로 되돌리기"
            >
              <RotateCcw className="w-3 h-3" />
              리셋
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-semibold text-slate-500">0%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sliderWeight}
            onChange={e => setSliderWeight(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <span className="text-[11px] font-mono font-semibold text-slate-500">100%</span>
        </div>

        {/* Realtime Alternative Ranking Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-600 mr-1">시뮬레이션 대안 순위:</span>
          {simulatedRanks.map((item, idx) => (
            <div
              key={item.alt.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-bold text-slate-800">
                {idx + 1}위 {item.alt.name}
              </span>
              <span className="font-mono text-slate-600 font-semibold">
                {(item.currentSimulatedWeight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitivity Line Chart & Graph */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            성능 민감도 선 그래프 (Performance Sensitivity Graph)
          </span>
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-xl transition shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            {downloading ? '차트 생성 중...' : '논문용 차트 PNG 다운로드'}
          </button>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-200 p-4 flex justify-center">
          <svg
            ref={svgRef}
            width={chartW}
            height={chartH}
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="bg-white rounded-xl shadow-2xs"
            style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Background Grid Lines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(yVal => (
              <g key={`grid-y-${yVal}`}>
                <line
                  x1={padLeft}
                  y1={toSvgY(yVal)}
                  x2={chartW - padRight}
                  y2={toSvgY(yVal)}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={yVal === 0 ? undefined : '2 2'}
                />
                <text
                  x={padLeft - 8}
                  y={toSvgY(yVal) + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  {(yVal * 100).toFixed(0)}%
                </text>
              </g>
            ))}

            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(xVal => (
              <g key={`grid-x-${xVal}`}>
                <line
                  x1={toSvgX(xVal)}
                  y1={padTop}
                  x2={toSvgX(xVal)}
                  y2={padTop + plotH}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={toSvgX(xVal)}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  {(xVal * 100).toFixed(0)}%
                </text>
              </g>
            ))}

            {/* Current Actual Weight Line (Dashed Red/Indigo Line) */}
            <line
              x1={toSvgX(currentOrigCritWeight)}
              y1={padTop}
              x2={toSvgX(currentOrigCritWeight)}
              y2={padTop + plotH}
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text
              x={toSvgX(currentOrigCritWeight)}
              y={padTop - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#4f46e5"
            >
              현재 가중치 ({origPercent}%)
            </text>

            {/* Simulated Slider Weight Line (if moved) */}
            {Math.abs(sliderWeight - currentOrigCritWeight) > 0.005 && (
              <>
                <line
                  x1={toSvgX(sliderWeight)}
                  y1={padTop}
                  x2={toSvgX(sliderWeight)}
                  y2={padTop + plotH}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={toSvgX(sliderWeight)}
                  y={padTop + plotH + 34}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#dc2626"
                >
                  가상 ({sliderPercent}%)
                </text>
              </>
            )}

            {/* Alternative Linear Curves */}
            {sensitivityData.lines.map(line => {
              const x1 = toSvgX(0);
              const y1 = toSvgY(line.intercept);
              const x2 = toSvgX(1);
              const y2 = toSvgY(line.slope + line.intercept);

              return (
                <g key={`alt-line-${line.alt.id}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={line.color}
                    strokeWidth="2.5"
                  />
                  {/* Point at current simulated weight */}
                  <circle
                    cx={toSvgX(sliderWeight)}
                    cy={toSvgY(line.currentSimulatedWeight)}
                    r="4.5"
                    fill={line.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {/* Break-even Points Markers */}
            {sensitivityData.breakEvens.map((be, idx) => (
              <g key={`be-${idx}`}>
                <circle
                  cx={toSvgX(be.critWeight)}
                  cy={toSvgY(be.y)}
                  r="4"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              </g>
            ))}

            {/* Axis Titles */}
            <text
              x={padLeft + plotW / 2}
              y={chartH - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#475569"
            >
              '{selectedCritName}' 기준 중요도 가중치 (%)
            </text>
            <text
              x={14}
              y={padTop + plotH / 2}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#475569"
              transform={`rotate(-90, 14, ${padTop + plotH / 2})`}
            >
              대안 종합 우선순위 (%)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1">
          {sensitivityData.lines.map(line => (
            <div key={line.alt.id} className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: line.color }} />
              <span className="font-semibold text-slate-700">{line.alt.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="border-b-2 border-dashed border-indigo-500 w-3" />
            <span>현재 가중치 기준선</span>
          </div>
        </div>
      </div>

      {/* Academic Finding Text Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            논문 제4장(실증분석) 민감도 분석 표준 학술 문장
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullAcademicText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료!' : '문장 복사'}
          </button>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed font-sans indent-3">
          {fullAcademicText}
        </p>
      </div>
    </div>
  );
}
