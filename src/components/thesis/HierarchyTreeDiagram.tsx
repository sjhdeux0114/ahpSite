'use client';

import { useState, useRef } from 'react';
import {
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  Palette,
  Eye,
  EyeOff,
  Check,
  FileCode,
} from 'lucide-react';

interface SubCriterion {
  id: string;
  name: string;
  localWeight?: number;
  globalWeight?: number;
}

interface Criterion {
  id: string;
  name: string;
  weight?: number;
  subcriteria?: SubCriterion[];
}

interface Alternative {
  id: string;
  name: string;
  weight?: number;
}

interface HierarchyTreeDiagramProps {
  title: string;
  criteria: Criterion[];
  alternatives?: Alternative[];
  hasAlternatives?: boolean;
  hasSubcriteria?: boolean;
}

export default function HierarchyTreeDiagram({
  title,
  criteria,
  alternatives = [],
  hasAlternatives = false,
  hasSubcriteria = true,
}: HierarchyTreeDiagramProps) {
  const [theme, setTheme] = useState<'grayscale' | 'indigo'>('grayscale');
  const [showWeights, setShowWeights] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- 레이아웃 좌표 계산 ---
  const nodeWidth = 170;
  const nodeHeight = 50;
  const xGap = 16;
  const yGap = 70;

  // 1. 세부영역 리프 노드 또는 대분류 노드 계산
  // 각 대분류가 차지하는 폭(가로) 계산
  const critLayouts = criteria.map(c => {
    const subCount = hasSubcriteria && c.subcriteria && c.subcriteria.length > 0 ? c.subcriteria.length : 1;
    const width = subCount * nodeWidth + (subCount - 1) * xGap;
    return { criterion: c, width, subCount };
  });

  const totalContentWidth = Math.max(
    critLayouts.reduce((sum, item) => sum + item.width + xGap, -xGap),
    hasAlternatives && alternatives.length > 0
      ? alternatives.length * nodeWidth + (alternatives.length - 1) * xGap
      : 0,
    300
  );

  const svgPadding = 40;
  const svgWidth = totalContentWidth + svgPadding * 2;

  // 레벨별 Y 좌표
  const yGoal = svgPadding;
  const yCrit = yGoal + nodeHeight + yGap;
  const ySub = hasSubcriteria ? yCrit + nodeHeight + yGap : yCrit;
  const yAlt = hasAlternatives && alternatives.length > 0 ? ySub + nodeHeight + yGap : ySub;
  const svgHeight = yAlt + nodeHeight + svgPadding;

  // Goal 노드 X
  const goalX = svgWidth / 2 - 130;
  const goalWidth = 260;

  // Criteria & Subcriteria 좌표 계산
  let currentCritX = svgPadding + (totalContentWidth - critLayouts.reduce((sum, item) => sum + item.width + xGap, -xGap)) / 2;

  const critNodes: Array<{
    id: string;
    name: string;
    weight?: number;
    x: number;
    y: number;
    centerX: number;
    subNodes: Array<{
      id: string;
      name: string;
      localWeight?: number;
      globalWeight?: number;
      x: number;
      y: number;
      centerX: number;
    }>;
  }> = [];

  critLayouts.forEach(({ criterion, width, subCount }) => {
    const critCenterX = currentCritX + width / 2;
    const critNodeX = critCenterX - nodeWidth / 2;

    const subNodes: Array<{
      id: string;
      name: string;
      localWeight?: number;
      globalWeight?: number;
      x: number;
      y: number;
      centerX: number;
    }> = [];

    if (hasSubcriteria && criterion.subcriteria && criterion.subcriteria.length > 0) {
      let subX = currentCritX;
      criterion.subcriteria.forEach(sub => {
        subNodes.push({
          id: sub.id,
          name: sub.name,
          localWeight: sub.localWeight,
          globalWeight: sub.globalWeight,
          x: subX,
          y: ySub,
          centerX: subX + nodeWidth / 2,
        });
        subX += nodeWidth + xGap;
      });
    }

    critNodes.push({
      id: criterion.id,
      name: criterion.name,
      weight: criterion.weight,
      x: critNodeX,
      y: yCrit,
      centerX: critCenterX,
      subNodes,
    });

    currentCritX += width + xGap;
  });

  // Alternatives 노드 좌표
  const altNodes: Array<{
    id: string;
    name: string;
    weight?: number;
    x: number;
    y: number;
    centerX: number;
  }> = [];

  if (hasAlternatives && alternatives.length > 0) {
    const altTotalWidth = alternatives.length * nodeWidth + (alternatives.length - 1) * xGap;
    let altX = (svgWidth - altTotalWidth) / 2;
    alternatives.forEach(alt => {
      altNodes.push({
        id: alt.id,
        name: alt.name,
        weight: alt.weight,
        x: altX,
        y: yAlt,
        centerX: altX + nodeWidth / 2,
      });
      altX += nodeWidth + xGap;
    });
  }

  // --- 테마 스타일 매핑 ---
  const isGrayscale = theme === 'grayscale';
  const styles = isGrayscale
    ? {
        bg: '#ffffff',
        lineColor: '#64748b',
        goalBox: { fill: '#f8fafc', stroke: '#0f172a', text: '#0f172a', subtext: '#475569' },
        critBox: { fill: '#f1f5f9', stroke: '#1e293b', text: '#0f172a', badge: '#334155' },
        subBox: { fill: '#ffffff', stroke: '#475569', text: '#1e293b', badge: '#64748b' },
        altBox: { fill: '#f8fafc', stroke: '#0f172a', text: '#0f172a', badge: '#1e293b' },
      }
    : {
        bg: '#ffffff',
        lineColor: '#818cf8',
        goalBox: { fill: '#4f46e5', stroke: '#3730a3', text: '#ffffff', subtext: '#c7d2fe' },
        critBox: { fill: '#e0e7ff', stroke: '#6366f1', text: '#1e1b4b', badge: '#4338ca' },
        subBox: { fill: '#ffffff', stroke: '#a5b4fc', text: '#1e293b', badge: '#4f46e5' },
        altBox: { fill: '#ecfdf5', stroke: '#10b981', text: '#064e3b', badge: '#059669' },
      };

  // --- SVG 다운로드 핸들러 ---
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AHP_연구모형도_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- 고해상도 PNG (300DPI급 2x Canvas) 다운로드 핸들러 ---
  const handleDownloadPNG = () => {
    if (!svgRef.current) return;
    setDownloading(true);

    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const scale = 2.5; // 고해상도 2.5배 확대 렌더링
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 배경 흰색 채우기
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);

        const pngURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngURL;
        link.download = `AHP_연구모형도_${Date.now()}.png`;
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
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            AHP 연구 모형도 (계층 다이어그램)
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              논문 제3장/4장용
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            목표-대분류-세부영역-대안 계층 구조를 자동으로 시각화하며, 논문 인쇄용 300DPI 고해상도 이미지로 다운로드할 수 있습니다.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <button
              type="button"
              onClick={() => setTheme('grayscale')}
              className={`px-3 py-1.5 rounded-lg transition ${
                isGrayscale ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              논문용 흑백
            </button>
            <button
              type="button"
              onClick={() => setTheme('indigo')}
              className={`px-3 py-1.5 rounded-lg transition ${
                !isGrayscale ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              발표용 컬러
            </button>
          </div>

          {/* Show Weights Toggle */}
          <button
            type="button"
            onClick={() => setShowWeights(!showWeights)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showWeights
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title="가중치(%) 수치 표시 여부를 전환합니다."
          >
            {showWeights ? (
              <>
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                가중치 표시 ON
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                가중치 숨김
              </>
            )}
          </button>

          {/* Download SVG */}
          <button
            type="button"
            onClick={handleDownloadSVG}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition"
            title="벡터 원본 파일(SVG)로 다운로드합니다."
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            SVG
          </button>

          {/* Download High-Res PNG */}
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            title="논문 삽입용 300 DPI급 고해상도 PNG 이미지를 다운로드합니다."
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? '생성 중...' : '고화질 PNG 다운로드'}
          </button>
        </div>
      </div>

      {/* SVG Canvas Container with Scroll */}
      <div className="w-full overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-200 p-4 flex justify-center">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="bg-white rounded-xl shadow-xs"
          style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          {/* Definitions: Marker Arrow */}
          <defs>
            <marker
              id={`arrow-${theme}`}
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill={styles.lineColor} />
            </marker>
          </defs>

          {/* --- 1. Connecting Lines --- */}
          {/* Goal -> Criteria */}
          {critNodes.map(c => (
            <path
              key={`line-goal-${c.id}`}
              d={`M ${svgWidth / 2} ${yGoal + nodeHeight} C ${svgWidth / 2} ${yGoal + nodeHeight + yGap * 0.5}, ${c.centerX} ${yCrit - yGap * 0.5}, ${c.centerX} ${yCrit}`}
              fill="none"
              stroke={styles.lineColor}
              strokeWidth="1.5"
              markerEnd={`url(#arrow-${theme})`}
            />
          ))}

          {/* Criteria -> Subcriteria */}
          {hasSubcriteria &&
            critNodes.map(c =>
              c.subNodes.map(s => (
                <path
                  key={`line-crit-sub-${s.id}`}
                  d={`M ${c.centerX} ${yCrit + nodeHeight} C ${c.centerX} ${yCrit + nodeHeight + yGap * 0.5}, ${s.centerX} ${ySub - yGap * 0.5}, ${s.centerX} ${ySub}`}
                  fill="none"
                  stroke={styles.lineColor}
                  strokeWidth="1.2"
                  markerEnd={`url(#arrow-${theme})`}
                />
              ))
            )}

          {/* Subcriteria (or Criteria) -> Alternatives */}
          {hasAlternatives &&
            altNodes.length > 0 &&
            (hasSubcriteria
              ? critNodes.flatMap(c => c.subNodes).map(s =>
                  altNodes.map(a => (
                    <line
                      key={`line-sub-alt-${s.id}-${a.id}`}
                      x1={s.centerX}
                      y1={ySub + nodeHeight}
                      x2={a.centerX}
                      y2={yAlt}
                      stroke={styles.lineColor}
                      strokeWidth="0.6"
                      strokeDasharray="3 3"
                      opacity="0.4"
                    />
                  ))
                )
              : critNodes.map(c =>
                  altNodes.map(a => (
                    <line
                      key={`line-crit-alt-${c.id}-${a.id}`}
                      x1={c.centerX}
                      y1={yCrit + nodeHeight}
                      x2={a.centerX}
                      y2={yAlt}
                      stroke={styles.lineColor}
                      strokeWidth="0.8"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                  ))
                ))}

          {/* --- 2. Level Labels (Left Side) --- */}
          <text x="15" y={yGoal + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
            [1단계: 목표]
          </text>
          <text x="15" y={yCrit + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
            [2단계: 대분류]
          </text>
          {hasSubcriteria && (
            <text x="15" y={ySub + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
              [3단계: 세부영역]
            </text>
          )}
          {hasAlternatives && altNodes.length > 0 && (
            <text x="15" y={yAlt + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
              [{hasSubcriteria ? '4단계' : '3단계'}: 대안]
            </text>
          )}

          {/* --- 3. Level 1: Goal Box --- */}
          <g>
            <rect
              x={goalX}
              y={yGoal}
              width={goalWidth}
              height={nodeHeight}
              rx="8"
              fill={styles.goalBox.fill}
              stroke={styles.goalBox.stroke}
              strokeWidth="2"
            />
            <text
              x={svgWidth / 2}
              y={yGoal + 22}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill={styles.goalBox.subtext || '#475569'}
              letterSpacing="0.05em"
            >
              DECISION GOAL (의사결정 목표)
            </text>
            <text
              x={svgWidth / 2}
              y={yGoal + 38}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill={styles.goalBox.text}
            >
              {title.length > 28 ? `${title.slice(0, 27)}...` : title}
            </text>
          </g>

          {/* --- 4. Level 2: Criteria Boxes --- */}
          {critNodes.map((c, idx) => (
            <g key={c.id}>
              <rect
                x={c.x}
                y={c.y}
                width={nodeWidth}
                height={nodeHeight}
                rx="7"
                fill={styles.critBox.fill}
                stroke={styles.critBox.stroke}
                strokeWidth="1.6"
              />
              <text
                x={c.centerX}
                y={c.y + (showWeights && c.weight !== undefined ? 20 : 28)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill={styles.critBox.text}
              >
                {c.name.length > 18 ? `${c.name.slice(0, 17)}...` : c.name}
              </text>
              {showWeights && c.weight !== undefined && (
                <text
                  x={c.centerX}
                  y={c.y + 36}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={styles.critBox.badge}
                >
                  가중치: {(c.weight * 100).toFixed(1)}%
                </text>
              )}
            </g>
          ))}

          {/* --- 5. Level 3: Subcriteria Boxes --- */}
          {hasSubcriteria &&
            critNodes.map(c =>
              c.subNodes.map(s => (
                <g key={s.id}>
                  <rect
                    x={s.x}
                    y={s.y}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="6"
                    fill={styles.subBox.fill}
                    stroke={styles.subBox.stroke}
                    strokeWidth="1.2"
                  />
                  <text
                    x={s.centerX}
                    y={s.y + (showWeights && s.localWeight !== undefined ? 19 : 28)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="semibold"
                    fill={styles.subBox.text}
                  >
                    {s.name.length > 18 ? `${s.name.slice(0, 17)}...` : s.name}
                  </text>
                  {showWeights && s.localWeight !== undefined && (
                    <text
                      x={s.centerX}
                      y={s.y + 34}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={styles.subBox.badge}
                    >
                      L: {(s.localWeight * 100).toFixed(1)}% | G:{' '}
                      {((s.globalWeight || 0) * 100).toFixed(1)}%
                    </text>
                  )}
                </g>
              ))
            )}

          {/* --- 6. Level 4: Alternatives Boxes --- */}
          {hasAlternatives &&
            altNodes.map(a => (
              <g key={a.id}>
                <rect
                  x={a.x}
                  y={a.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="6"
                  fill={styles.altBox.fill}
                  stroke={styles.altBox.stroke}
                  strokeWidth="1.6"
                />
                <text
                  x={a.centerX}
                  y={a.y + (showWeights && a.weight !== undefined ? 20 : 28)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill={styles.altBox.text}
                >
                  {a.name.length > 18 ? `${a.name.slice(0, 17)}...` : a.name}
                </text>
                {showWeights && a.weight !== undefined && (
                  <text
                    x={a.centerX}
                    y={a.y + 36}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={styles.altBox.badge}
                  >
                    우선순위: {(a.weight * 100).toFixed(2)}%
                  </text>
                )}
              </g>
            ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <strong>Tip</strong>: 논문 제출 시에는 <strong>'논문용 흑백'</strong> 테마를, 학위 심사 및 학회 구두발표 시에는 <strong>'발표용 컬러'</strong>를 사용하세요.
        </span>
        <span>
          L: 로컬 가중치(대분류 내 기여도), G: 글로벌 가중치(전체 종합 기여도)
        </span>
      </div>
    </div>
  );
}
