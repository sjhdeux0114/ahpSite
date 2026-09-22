'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  GitCompare,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import {
  buildMatrix,
  aggregateGroupMatrices,
  calculateAHP,
  AHPResult,
} from '@/lib/ahp/calculator';

interface DemographicQuestion {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
}

interface Criterion {
  id: string;
  name: string;
  description?: string;
}

interface ResponseItem {
  id: string;
  name?: string;
  demographics: Record<string, string>;
  answers: {
    criteria?: Record<string, number>;
    subcriteria?: Record<string, Record<string, number>>;
    alternatives?: Record<string, Record<string, number>>;
  };
  isValid: boolean;
}

interface GroupComparisonAnalysisProps {
  survey: {
    id: string;
    title: string;
    criteria: Criterion[];
    demographics?: DemographicQuestion[];
  };
  responses: ResponseItem[];
}

export default function GroupComparisonAnalysis({
  survey,
  responses = [],
}: GroupComparisonAnalysisProps) {
  const demographics: DemographicQuestion[] = Array.isArray(survey?.demographics)
    ? survey.demographics
    : typeof survey?.demographics === 'string'
      ? (() => { try { return JSON.parse(survey.demographics); } catch { return []; } })()
      : [];
  const criteria: Criterion[] = Array.isArray(survey?.criteria)
    ? survey.criteria
    : typeof survey?.criteria === 'string'
      ? (() => { try { return JSON.parse(survey.criteria); } catch { return []; } })()
      : [];
  const criteriaIds = criteria.map(c => c.id);

  const isValidData = Boolean(demographics.length > 0 && responses.length >= 2);

  const [selectedDemoId, setSelectedDemoId] = useState<string>(
    demographics[0]?.id || ''
  );

  // 선택된 인적사항 문항의 응답 통계
  const selectedDemo = demographics.find(d => d.id === selectedDemoId) || demographics[0];

  const optionCounts = useMemo(() => {
    if (!isValidData || !selectedDemo) return {};
    const counts: Record<string, number> = {};
    if (Array.isArray(selectedDemo.options)) {
      selectedDemo.options.forEach(opt => {
        counts[opt] = 0;
      });
    }
    responses.forEach(r => {
      const val = r.demographics?.[selectedDemo.id]?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [isValidData, responses, selectedDemo]);

  const availableOptions = Object.keys(optionCounts);

  // 복수 선택 상태 (배열)
  const [selectedGroupA, setSelectedGroupA] = useState<string[]>(() => {
    const first = demographics[0];
    const opts = first?.options || [];
    return opts.length > 0 ? [opts[0]] : [];
  });

  const [selectedGroupB, setSelectedGroupB] = useState<string[]>(() => {
    const first = demographics[0];
    const opts = first?.options || [];
    return opts.length > 1 ? [opts[1]] : [];
  });

  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);

  // 유효한 활성 선택 항목 계산
  const activeGroupA = useMemo(() => {
    const valid = selectedGroupA.filter(opt => availableOptions.includes(opt));
    if (valid.length > 0) return valid;
    return availableOptions[0] ? [availableOptions[0]] : [];
  }, [selectedGroupA, availableOptions]);

  const activeGroupB = useMemo(() => {
    const valid = selectedGroupB.filter(opt => availableOptions.includes(opt));
    if (valid.length > 0) return valid;
    const remaining = availableOptions.filter(opt => !activeGroupA.includes(opt));
    return remaining[0] ? [remaining[0]] : [];
  }, [selectedGroupB, availableOptions, activeGroupA]);

  // 복수 선택 토글 핸들러
  const toggleGroupA = (opt: string) => {
    if (activeGroupA.includes(opt)) {
      // 이미 선택되어 있으면 제거 (최소 1개 유지는 UI에서 안내)
      setSelectedGroupA(prev => prev.filter(x => x !== opt));
    } else {
      // 선택 추가 및 GroupB에 중복이 있으면 GroupB에서 제거하여 상호 배타성 유지
      setSelectedGroupB(b => b.filter(x => x !== opt));
      setSelectedGroupA(prev => [...prev, opt]);
    }
  };

  const toggleGroupB = (opt: string) => {
    if (activeGroupB.includes(opt)) {
      setSelectedGroupB(prev => prev.filter(x => x !== opt));
    } else {
      setSelectedGroupA(a => a.filter(x => x !== opt));
      setSelectedGroupB(prev => [...prev, opt]);
    }
  };

  // 초기화 핸들러
  const handleResetGroups = () => {
    if (availableOptions.length >= 2) {
      setSelectedGroupA([availableOptions[0]]);
      setSelectedGroupB([availableOptions[1]]);
    } else if (availableOptions.length === 1) {
      setSelectedGroupA([availableOptions[0]]);
      setSelectedGroupB([]);
    }
  };

  // 각 집단별 라벨 문자열
  const labelGroupA = activeGroupA.length > 0 ? activeGroupA.join(', ') : '선택 없음';
  const labelGroupB = activeGroupB.length > 0 ? activeGroupB.join(', ') : '선택 없음';

  // 각 집단별 응답자 필터링 (복수 선택 항목 중 하나라도 일치하면 포함)
  const groupAResp = useMemo(() => {
    if (!isValidData || !selectedDemo || activeGroupA.length === 0) return [];
    return responses.filter(r => {
      const val = r.demographics?.[selectedDemo.id]?.trim();
      return val && activeGroupA.includes(val);
    });
  }, [isValidData, responses, selectedDemo, activeGroupA]);

  const groupBResp = useMemo(() => {
    if (!isValidData || !selectedDemo || activeGroupB.length === 0) return [];
    return responses.filter(r => {
      const val = r.demographics?.[selectedDemo.id]?.trim();
      return val && activeGroupB.includes(val);
    });
  }, [isValidData, responses, selectedDemo, activeGroupB]);

  // 각 집단별 독립적 AHP 계산
  const ahpGroupA: AHPResult | null = useMemo(() => {
    if (!isValidData || groupAResp.length === 0) return null;
    const matrices = groupAResp.map(r => buildMatrix(criteriaIds, r.answers?.criteria || {}));
    const agg = aggregateGroupMatrices(matrices);
    return calculateAHP(agg);
  }, [isValidData, groupAResp, criteriaIds]);

  const ahpGroupB: AHPResult | null = useMemo(() => {
    if (!isValidData || groupBResp.length === 0) return null;
    const matrices = groupBResp.map(r => buildMatrix(criteriaIds, r.answers?.criteria || {}));
    const agg = aggregateGroupMatrices(matrices);
    return calculateAHP(agg);
  }, [isValidData, groupBResp, criteriaIds]);

  // 두 집단의 순위 및 가중치 비교표 데이터 구성
  const comparisonItems = useMemo(() => {
    if (!ahpGroupA || !ahpGroupB) return [];

    const list = criteria.map((c, idx) => {
      const wA = ahpGroupA.weights[idx] || 0;
      const wB = ahpGroupB.weights[idx] || 0;
      const diff = wA - wB;

      return {
        id: c.id,
        name: c.name,
        wA,
        wB,
        diff,
        rankA: 0,
        rankB: 0,
      };
    });

    // 순위 매기기
    const sortedA = [...list].sort((a, b) => b.wA - a.wA);
    sortedA.forEach((item, i) => {
      item.rankA = i + 1;
    });

    const sortedB = [...list].sort((a, b) => b.wB - a.wB);
    sortedB.forEach((item, i) => {
      item.rankB = i + 1;
    });

    return list;
  }, [criteria, ahpGroupA, ahpGroupB]);

  // 기본 검증: 인적사항 문항이 없거나 응답자가 부족한 경우
  if (!isValidData || !selectedDemo) {
    return (
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm text-center py-10">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-800">전문가 집단별 비교 분석기 (Group Comparison)</h4>
        <p className="text-xs text-slate-500 mt-1">
          {demographics.length === 0
            ? '등록된 인적사항(프로필) 문항이 없어 집단별 비교 분석을 수행할 수 없습니다.'
            : '집단별 비교 분석을 위해 최소 2명 이상의 응답 데이터가 필요합니다.'}
        </p>
      </div>
    );
  }

  // 학술 해석 문장 생성
  const topCritA = [...comparisonItems].sort((a, b) => b.wA - a.wA)[0];
  const topCritB = [...comparisonItems].sort((a, b) => b.wB - a.wB)[0];
  const maxDiffItem = [...comparisonItems].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  const academicSentence1 = `'${selectedDemo.title || '인적사항'}' 특성에 따른 전문가 집단별 비교 분석을 위해, 응답자를 '${labelGroupA}' 집단(N=${groupAResp.length}명)과 '${labelGroupB}' 집단(N=${groupBResp.length}명)으로 구분하여 각각 독립적인 AHP 가중치를 산출하였다.`;

  let academicSentence2 = '';
  if (topCritA && topCritB) {
    if (topCritA.id === topCritB.id) {
      academicSentence2 = `분석 결과, 두 집단 모두 '${topCritA.name}'을 최우선 고려 요인(1위)으로 도출하여 핵심 요인에 대한 높은 공감대를 나타내었다(집단 '${labelGroupA}' 가중치: ${(topCritA.wA * 100).toFixed(1)}%, 집단 '${labelGroupB}' 가중치: ${(topCritB.wB * 100).toFixed(1)}%).`;
    } else {
      academicSentence2 = `분석 결과, '${labelGroupA}' 집단은 '${topCritA.name}'(${(topCritA.wA * 100).toFixed(1)}%)을 최우선 순위로 평가한 반면, '${labelGroupB}' 집단은 '${topCritB.name}'(${(topCritB.wB * 100).toFixed(1)}%)을 1순위로 평가하여 두 집단 간 뚜렷한 인식의 차이가 존재함을 확인하였다.`;
    }
  }

  let academicSentence3 = '';
  if (maxDiffItem) {
    const pDiff = Math.abs(maxDiffItem.diff * 100).toFixed(1);
    const favoredGroup = maxDiffItem.diff > 0 ? labelGroupA : labelGroupB;
    academicSentence3 = `평가 항목 중 가장 큰 시각 차이를 보인 항목은 '${maxDiffItem.name}'으로 두 집단 간 ${pDiff}%p의 가중치 격차를 나타내었으며, '${favoredGroup}' 집단에서 상대적으로 더 높은 중요도를 부여한 것으로 분석되었다.`;
  }

  const fullAcademicText = `${academicSentence1} ${academicSentence2} ${academicSentence3} 이는 향후 정책 수립 및 의사결정 실행 시 대상 집단의 특성에 맞춘 차별화된 전략적 접근이 필요함을 시사한다.`;

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            전문가 집단별 비교 분석기 (Group Comparison)
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              다중 선택 교차분석 지원
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            인적사항(경력, 직무, 소속 등) 항목을 복수로 선택하여 묶음 집단을 구성하고 독립적인 AHP 가중치 차이를 비교합니다.
          </p>
        </div>

        {/* Filter Selection Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Demographic Question Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 shrink-0">분석 기준 문항:</label>
            <select
              value={selectedDemoId}
              onChange={e => {
                const newId = e.target.value;
                setSelectedDemoId(newId);
                const newDemo = demographics.find(d => d.id === newId);
                const opts = newDemo?.options || [];
                setSelectedGroupA(opts.length > 0 ? [opts[0]] : []);
                setSelectedGroupB(opts.length > 1 ? [opts[1]] : []);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              {demographics.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetGroups}
            title="기본 1:1 비교로 재설정"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">초기화</span>
          </button>
        </div>
      </div>

      {/* Group Multi-Selector Boxes */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Group A Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              비교 집단 1 (Group A)
              <span className="text-[11px] font-normal text-indigo-600 ml-0.5">
                (복수 선택 가능)
              </span>
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              총 {groupAResp.length}명 응답
            </span>
          </div>

          {/* Option Selector Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>클릭하여 집단에 포함할 항목을 선택/해제하세요:</span>
              <span className="font-bold text-indigo-600">{activeGroupA.length}개 선택됨</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableOptions.map(opt => {
                const isSelected = activeGroupA.includes(opt);
                const isInOther = activeGroupB.includes(opt);
                const count = optionCounts[opt] || 0;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleGroupA(opt)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600 hover:bg-indigo-700'
                        : isInOther
                        ? 'bg-white/60 text-slate-400 border border-dashed border-slate-300 hover:border-indigo-300 hover:text-slate-600'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-white text-indigo-600 font-black'
                          : 'border border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span>{opt}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected
                          ? 'bg-indigo-700 text-indigo-100 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}명
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Summary */}
          {activeGroupA.length > 0 && (
            <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-tight">
              <span className="font-bold">포함된 항목:</span> {labelGroupA}
            </div>
          )}
        </div>

        {/* Group B Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              비교 집단 2 (Group B)
              <span className="text-[11px] font-normal text-emerald-600 ml-0.5">
                (복수 선택 가능)
              </span>
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              총 {groupBResp.length}명 응답
            </span>
          </div>

          {/* Option Selector Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>클릭하여 집단에 포함할 항목을 선택/해제하세요:</span>
              <span className="font-bold text-emerald-600">{activeGroupB.length}개 선택됨</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableOptions.map(opt => {
                const isSelected = activeGroupB.includes(opt);
                const isInOther = activeGroupA.includes(opt);
                const count = optionCounts[opt] || 0;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleGroupB(opt)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs border border-emerald-600 hover:bg-emerald-700'
                        : isInOther
                        ? 'bg-white/60 text-slate-400 border border-dashed border-slate-300 hover:border-emerald-300 hover:text-slate-600'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-white text-emerald-600 font-black'
                          : 'border border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span>{opt}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected
                          ? 'bg-emerald-700 text-emerald-100 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}명
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Summary */}
          {activeGroupB.length > 0 && (
            <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 leading-tight">
              <span className="font-bold">포함된 항목:</span> {labelGroupB}
            </div>
          )}
        </div>
      </div>

      {/* Exception handling if empty selection or 0 responses */}
      {activeGroupA.length === 0 || activeGroupB.length === 0 ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>집단 1과 집단 2에 각각 최소 1개 이상의 항목을 선택해 주세요.</span>
        </div>
      ) : groupAResp.length === 0 || groupBResp.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-center py-6">
          선택한 항목 중 실제 응답자가 0명인 집단이 있습니다. 응답이 수집된 항목을 선택해주세요.
        </div>
      ) : (
        <>
          {/* Side-by-side Comparative Bar Chart */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-indigo-600" />
              집단 간 대분류 가중치 비교 그래프
            </h4>

            <div className="space-y-3.5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              {comparisonItems.map(item => {
                const maxVal = Math.max(...comparisonItems.map(i => Math.max(i.wA, i.wB)), 0.01);
                const pctA = Math.round((item.wA / maxVal) * 100);
                const pctB = Math.round((item.wB / maxVal) * 100);

                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        {item.name}
                        {item.rankA !== item.rankB && (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            순위 변동
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-indigo-700 font-bold">
                          [집단 1] {(item.wA * 100).toFixed(1)}% ({item.rankA}위)
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-emerald-700 font-bold">
                          [집단 2] {(item.wB * 100).toFixed(1)}% ({item.rankB}위)
                        </span>
                      </div>
                    </div>

                    {/* Bars */}
                    <div className="space-y-1">
                      {/* Bar A */}
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${pctA}%` }}
                        />
                      </div>
                      {/* Bar B */}
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${pctB}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* APA Three-line Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                &lt;표&gt; 전문가 집단별 AHP 가중치 및 순위 비교표 (APA 양식)
              </span>
              <button
                type="button"
                onClick={() => {
                  let text = `평가 기준\t[집단 1] ${labelGroupA} 가중치(%)\t순위\t[집단 2] ${labelGroupB} 가중치(%)\t순위\t가중치 차이(Δ)\t순위 변동\n`;
                  comparisonItems.forEach(item => {
                    const diffPct = (item.diff * 100).toFixed(2);
                    const rankChanged = item.rankA !== item.rankB ? '역전' : '동일';
                    text += `${item.name}\t${(item.wA * 100).toFixed(2)}%\t${item.rankA}\t${(item.wB * 100).toFixed(2)}%\t${item.rankB}\t${diffPct}%p\t${rankChanged}\n`;
                  });
                  text += `\n* 일관성 비율(CR): [집단 1: ${labelGroupA}] CR = ${ahpGroupA?.cr.toFixed(4) || '-'}, [집단 2: ${labelGroupB}] CR = ${ahpGroupB?.cr.toFixed(4) || '-'}`;
                  navigator.clipboard.writeText(text);
                  setCopiedTable(true);
                  setTimeout(() => setCopiedTable(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedTable ? '복사됨!' : '비교표 한글/워드 복사'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border-t-2 border-b-2 border-slate-900 font-sans">
                <thead>
                  <tr className="border-b border-slate-900 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">평가 기준</th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50/30 text-indigo-900">
                      [집단 1] {labelGroupA} 가중치
                    </th>
                    <th className="py-2.5 px-3 text-center bg-indigo-50/30 text-indigo-900">순위</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-emerald-900">
                      [집단 2] {labelGroupB} 가중치
                    </th>
                    <th className="py-2.5 px-3 text-center bg-emerald-50/30 text-emerald-900">순위</th>
                    <th className="py-2.5 px-3 text-right">차이 (Δ)</th>
                    <th className="py-2.5 px-3 text-center">순위 비교</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparisonItems.map(item => {
                    const diffPct = (item.diff * 100).toFixed(2);
                    const isDiffBig = Math.abs(item.diff) >= 0.05;
                    const isRankFlipped = item.rankA !== item.rankB;

                    return (
                      <tr key={item.id} className={isRankFlipped ? 'bg-amber-50/30' : ''}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/10">
                          {(item.wA * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700 bg-indigo-50/10">
                          {item.rankA}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/10">
                          {(item.wB * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700 bg-emerald-50/10">
                          {item.rankB}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            isDiffBig ? 'text-purple-700' : 'text-slate-600'
                          }`}
                        >
                          {item.diff > 0 ? `+${diffPct}` : diffPct}%p
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isRankFlipped ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <ArrowUpDown className="w-3 h-3" />
                              순위 역전
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">일치</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-900 bg-slate-50 text-[11px] font-semibold text-slate-700">
                    <td colSpan={7} className="py-2 px-3">
                      * 일관성 비율: [집단 1: {labelGroupA}] CR = {ahpGroupA?.cr.toFixed(4) || '-'} ({ahpGroupA?.isConsistent ? '만족' : '초과'}) | [집단 2: {labelGroupB}] CR = {ahpGroupB?.cr.toFixed(4) || '-'} ({ahpGroupB?.isConsistent ? '만족' : '초과'})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Academic Finding Text Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                논문 제4장(실증분석) 집단별 비교 분석 표준 학술 문장
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(fullAcademicText);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-2xs"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? '복사 완료!' : '문장 복사'}
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans indent-3">
              {fullAcademicText}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
