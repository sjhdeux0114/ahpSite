'use client';

import { useState, useRef } from 'react';
import {
  Download,
  Layers,
  Eye,
  EyeOff,
  FileCode,
  Sparkles,
  Columns,
  Rows,
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
  const [layoutMode, setLayoutMode] = useState<'a4_vertical' | 'wide_horizontal'>('a4_vertical');
  const [theme, setTheme] = useState<'grayscale' | 'indigo'>('grayscale');
  const [showWeights, setShowWeights] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const isGrayscale = theme === 'grayscale';
  const isA4Vertical = layoutMode === 'a4_vertical';

  // --- 테마 스타일 매핑 ---
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

  // =========================================================================
  // 모드 1: A4 논문 세로 최적화 (좌 -> 우 흐름, Left-to-Right)
  // 대분류와 세부영역이 많을 때 세로로 길어져 A4 본문에 쏙 들어감!
  // =========================================================================
  const vNodeW = 185;
  const vNodeH = 48;
  const vGapX = 55;
  const vSubGapY = 10;
  const vCritGroupGapY = 22;
  const vPadding = 45;
  const vHeaderH = 35; // 상단 단계 헤더 높이

  // X 좌표 (열별)
  const vXGoal = vPadding;
  const vXCrit = vXGoal + vNodeW + vGapX;
  const vXSub = vXCrit + vNodeW + vGapX;
  const vXAlt = hasAlternatives && alternatives.length > 0 ? vXSub + vNodeW + vGapX : vXSub;

  let vSvgWidth = vPadding * 2 + vNodeW * 2 + vGapX;
  if (hasSubcriteria) vSvgWidth += vNodeW + vGapX;
  if (hasAlternatives && alternatives.length > 0) vSvgWidth += vNodeW + vGapX;

  // Y 좌표 계산
  interface VSubNode {
    id: string;
    name: string;
    localWeight?: number;
    globalWeight?: number;
    x: number;
    y: number;
    centerY: number;
  }

  interface VCritNode {
    id: string;
    name: string;
    weight?: number;
    x: number;
    y: number;
    centerY: number;
    subNodes: VSubNode[];
  }

  let vCurrentY = vPadding + vHeaderH;
  const vCritNodes: VCritNode[] = [];

  criteria.forEach(crit => {
    const subs = hasSubcriteria && crit.subcriteria && crit.subcriteria.length > 0 ? crit.subcriteria : [];
    const subCount = subs.length > 0 ? subs.length : 1;
    const groupStartY = vCurrentY;

    const subNodes: VSubNode[] = [];
    if (subs.length > 0) {
      subs.forEach(sub => {
        subNodes.push({
          id: sub.id,
          name: sub.name,
          localWeight: sub.localWeight,
          globalWeight: sub.globalWeight,
          x: vXSub,
          y: vCurrentY,
          centerY: vCurrentY + vNodeH / 2,
        });
        vCurrentY += vNodeH + vSubGapY;
      });
      vCurrentY = vCurrentY - vSubGapY; // 마지막 gap 제거
    } else {
      vCurrentY += vNodeH;
    }

    const groupEndY = vCurrentY;
    const critCenterY = (groupStartY + groupEndY) / 2;
    const critY = critCenterY - vNodeH / 2;

    vCritNodes.push({
      id: crit.id,
      name: crit.name,
      weight: crit.weight,
      x: vXCrit,
      y: critY,
      centerY: critCenterY,
      subNodes,
    });

    vCurrentY += vCritGroupGapY;
  });

  const vTotalContentH = vCurrentY - vCritGroupGapY - (vPadding + vHeaderH);
  const vSvgHeight = Math.max(vCurrentY - vCritGroupGapY + vPadding, 400);

  // Goal 노드 Y (전체 트리의 세로 중앙)
  const vGoalCenterY = vPadding + vHeaderH + vTotalContentH / 2;
  const vGoalY = vGoalCenterY - vNodeH / 2;

  // Alternatives 노드 Y (전체 높이 범위 내 균등 분할)
  interface VAltNode {
    id: string;
    name: string;
    weight?: number;
    x: number;
    y: number;
    centerY: number;
  }

  const vAltNodes: VAltNode[] = [];
  if (hasAlternatives && alternatives.length > 0) {
    const altTotalH = alternatives.length * vNodeH + (alternatives.length - 1) * vSubGapY;
    let altStartY = vPadding + vHeaderH + (vTotalContentH - altTotalH) / 2;
    if (altStartY < vPadding + vHeaderH) altStartY = vPadding + vHeaderH;

    alternatives.forEach(alt => {
      vAltNodes.push({
        id: alt.id,
        name: alt.name,
        weight: alt.weight,
        x: vXAlt,
        y: altStartY,
        centerY: altStartY + vNodeH / 2,
      });
      altStartY += vNodeH + vSubGapY;
    });
  }

  // =========================================================================
  // 모드 2: 와이드 가로형 (상 -> 하 흐름, Top-Down)
  // 대분류가 적을 때 한눈에 시원하게 펼쳐봄
  // =========================================================================
  const hNodeW = 170;
  const hNodeH = 50;
  const hGapX = 16;
  const hGapY = 70;

  const critLayouts = criteria.map(c => {
    const subCount = hasSubcriteria && c.subcriteria && c.subcriteria.length > 0 ? c.subcriteria.length : 1;
    const width = subCount * hNodeW + (subCount - 1) * hGapX;
    return { criterion: c, width, subCount };
  });

  const hTotalContentWidth = Math.max(
    critLayouts.reduce((sum, item) => sum + item.width + hGapX, -hGapX),
    hasAlternatives && alternatives.length > 0
      ? alternatives.length * hNodeW + (alternatives.length - 1) * hGapX
      : 0,
    300
  );

  const hPadding = 40;
  const hSvgWidth = hTotalContentWidth + hPadding * 2;
  const hYGoal = hPadding;
  const hYCrit = hYGoal + hNodeH + hGapY;
  const hYSub = hasSubcriteria ? hYCrit + hNodeH + hGapY : hYCrit;
  const hYAlt = hasAlternatives && alternatives.length > 0 ? hYSub + hNodeH + hGapY : hYSub;
  const hSvgHeight = hYAlt + hNodeH + hPadding;

  const hGoalX = hSvgWidth / 2 - 130;
  const hGoalWidth = 260;

  let hCurrentCritX = hPadding + (hTotalContentWidth - critLayouts.reduce((sum, item) => sum + item.width + hGapX, -hGapX)) / 2;
  const hCritNodes: Array<{
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

  critLayouts.forEach(({ criterion, width }) => {
    const critCenterX = hCurrentCritX + width / 2;
    const critNodeX = critCenterX - hNodeW / 2;
    const subNodes: any[] = [];

    if (hasSubcriteria && criterion.subcriteria && criterion.subcriteria.length > 0) {
      let subX = hCurrentCritX;
      criterion.subcriteria.forEach(sub => {
        subNodes.push({
          id: sub.id,
          name: sub.name,
          localWeight: sub.localWeight,
          globalWeight: sub.globalWeight,
          x: subX,
          y: hYSub,
          centerX: subX + hNodeW / 2,
        });
        subX += hNodeW + hGapX;
      });
    }

    hCritNodes.push({
      id: criterion.id,
      name: criterion.name,
      weight: criterion.weight,
      x: critNodeX,
      y: hYCrit,
      centerX: critCenterX,
      subNodes,
    });

    hCurrentCritX += width + hGapX;
  });

  const hAltNodes: any[] = [];
  if (hasAlternatives && alternatives.length > 0) {
    const altTotalWidth = alternatives.length * hNodeW + (alternatives.length - 1) * hGapX;
    let altX = (hSvgWidth - altTotalWidth) / 2;
    alternatives.forEach(alt => {
      hAltNodes.push({
        id: alt.id,
        name: alt.name,
        weight: alt.weight,
        x: altX,
        y: hYAlt,
        centerX: altX + hNodeW / 2,
      });
      altX += hNodeW + hGapX;
    });
  }

  // 활성화된 모드에 따른 뷰박스 크기
  const finalSvgWidth = isA4Vertical ? vSvgWidth : hSvgWidth;
  const finalSvgHeight = isA4Vertical ? vSvgHeight : hSvgHeight;

  // --- SVG 다운로드 핸들러 ---
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AHP_연구모형도_${layoutMode}_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- 고해상도 PNG (300DPI급 Canvas) 다운로드 핸들러 ---
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
        const scale = 2.5; // 2.5배 고해상도 확대
        const canvas = document.createElement('canvas');
        canvas.width = finalSvgWidth * scale;
        canvas.height = finalSvgHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 흰색 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);

        const pngURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngURL;
        link.download = `AHP_연구모형도_${layoutMode === 'a4_vertical' ? 'A4세로형' : '와이드형'}_${Date.now()}.png`;
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            AHP 연구 모형도 (계층 다이어그램)
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              A4 논문 최적화
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            대분류와 세부영역이 많을 때 A4 세로 용지에 쏙 들어가도록 설계된 학술지 전용 계층 구조도입니다.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Orientation Selector */}
          <div className="inline-flex rounded-xl bg-indigo-50/80 p-1 text-xs font-semibold text-slate-700 border border-indigo-200/80">
            <button
              type="button"
              onClick={() => setLayoutMode('a4_vertical')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isA4Vertical
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-indigo-900 hover:bg-white/60'
              }`}
              title="A4 용지 세로 비율에 최적화되어 대분류가 많아도 글자가 깨지지 않습니다."
            >
              <Columns className="w-3.5 h-3.5" />
              A4 논문용 (세로)
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('wide_horizontal')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                !isA4Vertical
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-indigo-900 hover:bg-white/60'
              }`}
              title="대분류가 3~4개 이하일 때 유용한 가로 와이드형입니다."
            >
              <Rows className="w-3.5 h-3.5" />
              와이드형 (가로)
            </button>
          </div>

          {/* Theme Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <button
              type="button"
              onClick={() => setTheme('grayscale')}
              className={`px-3 py-1.5 rounded-lg transition ${
                isGrayscale ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              논문용 흑백
            </button>
            <button
              type="button"
              onClick={() => setTheme('indigo')}
              className={`px-3 py-1.5 rounded-lg transition ${
                !isGrayscale ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
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
          >
            {showWeights ? (
              <>
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                가중치 ON
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
            title="출판용 무손실 벡터 원본(SVG) 다운로드"
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
            title="논문 삽입용 300 DPI급 고화질 PNG 다운로드"
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
          width={finalSvgWidth}
          height={finalSvgHeight}
          viewBox={`0 0 ${finalSvgWidth} ${finalSvgHeight}`}
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

          {/* ============================================================= */}
          {/* RENDER MODE 1: A4 VERTICAL (좌 -> 우 흐름)                    */}
          {/* ============================================================= */}
          {isA4Vertical ? (
            <g>
              {/* Top Column Headers */}
              <text x={vXGoal + vNodeW / 2} y={vPadding + 10} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="middle">
                [1단계: 연구 목표]
              </text>
              <text x={vXCrit + vNodeW / 2} y={vPadding + 10} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="middle">
                [2단계: 대분류]
              </text>
              {hasSubcriteria && (
                <text x={vXSub + vNodeW / 2} y={vPadding + 10} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="middle">
                  [3단계: 세부영역]
                </text>
              )}
              {hasAlternatives && vAltNodes.length > 0 && (
                <text x={vXAlt + vNodeW / 2} y={vPadding + 10} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="middle">
                  [{hasSubcriteria ? '4단계' : '3단계'}: 대안]
                </text>
              )}

              {/* Connecting Lines: Goal -> Criteria */}
              {vCritNodes.map(c => (
                <path
                  key={`vline-goal-${c.id}`}
                  d={`M ${vXGoal + vNodeW} ${vGoalCenterY} C ${vXGoal + vNodeW + vGapX * 0.5} ${vGoalCenterY}, ${c.x - vGapX * 0.5} ${c.centerY}, ${c.x} ${c.centerY}`}
                  fill="none"
                  stroke={styles.lineColor}
                  strokeWidth="1.5"
                  markerEnd={`url(#arrow-${theme})`}
                />
              ))}

              {/* Connecting Lines: Criteria -> Subcriteria */}
              {hasSubcriteria &&
                vCritNodes.map(c =>
                  c.subNodes.map(s => (
                    <path
                      key={`vline-crit-sub-${s.id}`}
                      d={`M ${c.x + vNodeW} ${c.centerY} C ${c.x + vNodeW + vGapX * 0.5} ${c.centerY}, ${s.x - vGapX * 0.5} ${s.centerY}, ${s.x} ${s.centerY}`}
                      fill="none"
                      stroke={styles.lineColor}
                      strokeWidth="1.2"
                      markerEnd={`url(#arrow-${theme})`}
                    />
                  ))
                )}

              {/* Connecting Lines: Subcriteria (or Criteria) -> Alternatives */}
              {hasAlternatives &&
                vAltNodes.length > 0 &&
                (hasSubcriteria
                  ? vCritNodes.flatMap(c => c.subNodes).map(s =>
                      vAltNodes.map(a => (
                        <line
                          key={`vline-sub-alt-${s.id}-${a.id}`}
                          x1={s.x + vNodeW}
                          y1={s.centerY}
                          x2={a.x}
                          y2={a.centerY}
                          stroke={styles.lineColor}
                          strokeWidth="0.6"
                          strokeDasharray="3 3"
                          opacity="0.3"
                        />
                      ))
                    )
                  : vCritNodes.map(c =>
                      vAltNodes.map(a => (
                        <line
                          key={`vline-crit-alt-${c.id}-${a.id}`}
                          x1={c.x + vNodeW}
                          y1={c.centerY}
                          x2={a.x}
                          y2={a.centerY}
                          stroke={styles.lineColor}
                          strokeWidth="0.8"
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      ))
                    ))}

              {/* Level 1: Goal Box */}
              <g>
                <rect
                  x={vXGoal}
                  y={vGoalY}
                  width={vNodeW}
                  height={vNodeH}
                  rx="8"
                  fill={styles.goalBox.fill}
                  stroke={styles.goalBox.stroke}
                  strokeWidth="2"
                />
                <text
                  x={vXGoal + vNodeW / 2}
                  y={vGoalY + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={styles.goalBox.subtext || '#475569'}
                  letterSpacing="0.05em"
                >
                  DECISION GOAL (목표)
                </text>
                <text
                  x={vXGoal + vNodeW / 2}
                  y={vGoalY + 34}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill={styles.goalBox.text}
                >
                  {title.length > 18 ? `${title.slice(0, 17)}...` : title}
                </text>
              </g>

              {/* Level 2: Criteria Boxes */}
              {vCritNodes.map((c, idx) => (
                <g key={c.id}>
                  <rect
                    x={c.x}
                    y={c.y}
                    width={vNodeW}
                    height={vNodeH}
                    rx="7"
                    fill={styles.critBox.fill}
                    stroke={styles.critBox.stroke}
                    strokeWidth="1.6"
                  />
                  <text
                    x={c.x + vNodeW / 2}
                    y={c.y + (showWeights && c.weight !== undefined ? 18 : 28)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={styles.critBox.text}
                  >
                    {c.name.length > 18 ? `${c.name.slice(0, 17)}...` : c.name}
                  </text>
                  {showWeights && c.weight !== undefined && (
                    <text
                      x={c.x + vNodeW / 2}
                      y={c.y + 34}
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

              {/* Level 3: Subcriteria Boxes */}
              {hasSubcriteria &&
                vCritNodes.map(c =>
                  c.subNodes.map(s => (
                    <g key={s.id}>
                      <rect
                        x={s.x}
                        y={s.y}
                        width={vNodeW}
                        height={vNodeH}
                        rx="6"
                        fill={styles.subBox.fill}
                        stroke={styles.subBox.stroke}
                        strokeWidth="1.2"
                      />
                      <text
                        x={s.x + vNodeW / 2}
                        y={s.y + (showWeights && s.localWeight !== undefined ? 18 : 28)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="semibold"
                        fill={styles.subBox.text}
                      >
                        {s.name.length > 18 ? `${s.name.slice(0, 17)}...` : s.name}
                      </text>
                      {showWeights && s.localWeight !== undefined && (
                        <text
                          x={s.x + vNodeW / 2}
                          y={s.y + 33}
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

              {/* Level 4: Alternatives Boxes */}
              {hasAlternatives &&
                vAltNodes.map(a => (
                  <g key={a.id}>
                    <rect
                      x={a.x}
                      y={a.y}
                      width={vNodeW}
                      height={vNodeH}
                      rx="6"
                      fill={styles.altBox.fill}
                      stroke={styles.altBox.stroke}
                      strokeWidth="1.6"
                    />
                    <text
                      x={a.x + vNodeW / 2}
                      y={a.y + (showWeights && a.weight !== undefined ? 18 : 28)}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill={styles.altBox.text}
                    >
                      {a.name.length > 18 ? `${a.name.slice(0, 17)}...` : a.name}
                    </text>
                    {showWeights && a.weight !== undefined && (
                      <text
                        x={a.x + vNodeW / 2}
                        y={a.y + 34}
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
            </g>
          ) : (
            /* ============================================================= */
            /* RENDER MODE 2: WIDE HORIZONTAL (상 -> 하 흐름)                 */
            /* ============================================================= */
            <g>
              {/* Connecting Lines: Goal -> Criteria */}
              {hCritNodes.map(c => (
                <path
                  key={`hline-goal-${c.id}`}
                  d={`M ${hSvgWidth / 2} ${hYGoal + hNodeH} C ${hSvgWidth / 2} ${hYGoal + hNodeH + hGapY * 0.5}, ${c.centerX} ${hYCrit - hGapY * 0.5}, ${c.centerX} ${hYCrit}`}
                  fill="none"
                  stroke={styles.lineColor}
                  strokeWidth="1.5"
                  markerEnd={`url(#arrow-${theme})`}
                />
              ))}

              {/* Connecting Lines: Criteria -> Subcriteria */}
              {hasSubcriteria &&
                hCritNodes.map(c =>
                  c.subNodes.map(s => (
                    <path
                      key={`hline-crit-sub-${s.id}`}
                      d={`M ${c.centerX} ${hYCrit + hNodeH} C ${c.centerX} ${hYCrit + hNodeH + hGapY * 0.5}, ${s.centerX} ${hYSub - hGapY * 0.5}, ${s.centerX} ${hYSub}`}
                      fill="none"
                      stroke={styles.lineColor}
                      strokeWidth="1.2"
                      markerEnd={`url(#arrow-${theme})`}
                    />
                  ))
                )}

              {/* Connecting Lines: Subcriteria (or Criteria) -> Alternatives */}
              {hasAlternatives &&
                hAltNodes.length > 0 &&
                (hasSubcriteria
                  ? hCritNodes.flatMap(c => c.subNodes).map(s =>
                      hAltNodes.map(a => (
                        <line
                          key={`hline-sub-alt-${s.id}-${a.id}`}
                          x1={s.centerX}
                          y1={hYSub + hNodeH}
                          x2={a.centerX}
                          y2={hYAlt}
                          stroke={styles.lineColor}
                          strokeWidth="0.6"
                          strokeDasharray="3 3"
                          opacity="0.35"
                        />
                      ))
                    )
                  : hCritNodes.map(c =>
                      hAltNodes.map(a => (
                        <line
                          key={`hline-crit-alt-${c.id}-${a.id}`}
                          x1={c.centerX}
                          y1={hYCrit + hNodeH}
                          x2={a.centerX}
                          y2={hYAlt}
                          stroke={styles.lineColor}
                          strokeWidth="0.8"
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      ))
                    ))}

              {/* Left Stage Labels */}
              <text x="15" y={hYGoal + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
                [1단계: 목표]
              </text>
              <text x="15" y={hYCrit + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
                [2단계: 대분류]
              </text>
              {hasSubcriteria && (
                <text x="15" y={hYSub + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
                  [3단계: 세부영역]
                </text>
              )}
              {hasAlternatives && hAltNodes.length > 0 && (
                <text x="15" y={hYAlt + 30} fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="start">
                  [{hasSubcriteria ? '4단계' : '3단계'}: 대안]
                </text>
              )}

              {/* Goal Box */}
              <g>
                <rect
                  x={hGoalX}
                  y={hYGoal}
                  width={hGoalWidth}
                  height={hNodeH}
                  rx="8"
                  fill={styles.goalBox.fill}
                  stroke={styles.goalBox.stroke}
                  strokeWidth="2"
                />
                <text
                  x={hSvgWidth / 2}
                  y={hYGoal + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={styles.goalBox.subtext || '#475569'}
                  letterSpacing="0.05em"
                >
                  DECISION GOAL (목표)
                </text>
                <text
                  x={hSvgWidth / 2}
                  y={hYGoal + 36}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill={styles.goalBox.text}
                >
                  {title.length > 28 ? `${title.slice(0, 27)}...` : title}
                </text>
              </g>

              {/* Criteria Boxes */}
              {hCritNodes.map(c => (
                <g key={c.id}>
                  <rect
                    x={c.x}
                    y={c.y}
                    width={hNodeW}
                    height={hNodeH}
                    rx="7"
                    fill={styles.critBox.fill}
                    stroke={styles.critBox.stroke}
                    strokeWidth="1.6"
                  />
                  <text
                    x={c.centerX}
                    y={c.y + (showWeights && c.weight !== undefined ? 19 : 28)}
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
                      y={c.y + 35}
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

              {/* Subcriteria Boxes */}
              {hasSubcriteria &&
                hCritNodes.map(c =>
                  c.subNodes.map(s => (
                    <g key={s.id}>
                      <rect
                        x={s.x}
                        y={s.y}
                        width={hNodeW}
                        height={hNodeH}
                        rx="6"
                        fill={styles.subBox.fill}
                        stroke={styles.subBox.stroke}
                        strokeWidth="1.2"
                      />
                      <text
                        x={s.centerX}
                        y={s.y + (showWeights && s.localWeight !== undefined ? 18 : 28)}
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
                          y={s.y + 33}
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

              {/* Alternatives Boxes */}
              {hasAlternatives &&
                hAltNodes.map(a => (
                  <g key={a.id}>
                    <rect
                      x={a.x}
                      y={a.y}
                      width={hNodeW}
                      height={hNodeH}
                      rx="6"
                      fill={styles.altBox.fill}
                      stroke={styles.altBox.stroke}
                      strokeWidth="1.6"
                    />
                    <text
                      x={a.centerX}
                      y={a.y + (showWeights && a.weight !== undefined ? 19 : 28)}
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
                        y={a.y + 35}
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
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <strong>논문 권장 사항</strong>: 대분류나 세부영역이 4개 이상일 때는 <strong>'A4 논문용 (세로)'</strong> 모드가 한글/워드 본문 너비에 딱 맞게 삽입됩니다.
        </span>
        <span>
          L: 로컬 가중치(대분류 내 기여도), G: 글로벌 가중치(전체 종합 기여도)
        </span>
      </div>
    </div>
  );
}
