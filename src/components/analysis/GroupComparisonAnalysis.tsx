'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  GitCompare,
  Sparkles,
  Copy,
  Check,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
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
  const demographics = survey?.demographics || [];
  const criteria = survey?.criteria || [];
  const criteriaIds = criteria.map(c => c.id);

  const isValidData = Boolean(demographics.length > 0 && responses.length >= 2);

  const [selectedDemoId, setSelectedDemoId] = useState<string>(
    demographics[0]?.id || ''
  );
  const [groupAVal, setGroupAVal] = useState<string>('');
  const [groupBVal, setGroupBVal] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);

  // 선택된 인적사항 문항의 응답 통계
  const selectedDemo = demographics.find(d => d.id === selectedDemoId) || demographics[0];

  const optionCounts = useMemo(() => {
    if (!isValidData || !selectedDemo) return {};
    const counts: Record<string, number> = {};
    responses.forEach(r => {
      const val = r.demographics?.[selectedDemo.id]?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [isValidData, responses, selectedDemo]);

  const availableOptions = Object.keys(optionCounts);

  // 초기 그룹 설정 (가장 응답이 많은 상위 2개)
  const activeGroupA = groupAVal && availableOptions.includes(groupAVal)
    ? groupAVal
    : availableOptions[0] || '';
  const activeGroupB = groupBVal && availableOptions.includes(groupBVal) && groupBVal !== activeGroupA
    ? groupBVal
    : availableOptions.find(opt => opt !== activeGroupA) || availableOptions[1] || '';

  // 각 집단별 응답자 필터링
  const groupAResp = useMemo(() => {
    if (!isValidData || !selectedDemo || !activeGroupA) return [];
    return responses.filter(r => r.demographics?.[selectedDemo.id]?.trim() === activeGroupA);
  }, [isValidData, responses, selectedDemo, activeGroupA]);

  const groupBResp = useMemo(() => {
    if (!isValidData || !selectedDemo || !activeGroupB) return [];
    return responses.filter(r => r.demographics?.[selectedDemo.id]?.trim() === activeGroupB);
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

  const rankReversals = comparisonItems.filter(item => item.rankA !== item.rankB);

  const academicSentence1 = `'${selectedDemo.title || '인적사항'}' 특성에 따른 전문가 집단별 비교 분석을 위해, 응답자를 '${activeGroupA}' 집단(N=${groupAResp.length}명)과 '${activeGroupB}' 집단(N=${groupBResp.length}명)으로 구분하여 각각 독립적인 AHP 가중치를 산출하였다.`;

  let academicSentence2 = '';
  if (topCritA && topCritB) {
    if (topCritA.id === topCritB.id) {
      academicSentence2 = `분석 결과, 두 집단 모두 '${topCritA.name}'을 최우선 고려 요인(1위)으로 도출하여 핵심 요인에 대한 높은 공감대를 나타내었다(집단 '${activeGroupA}' 가중치: ${(topCritA.wA * 100).toFixed(1)}%, 집단 '${activeGroupB}' 가중치: ${(topCritB.wB * 100).toFixed(1)}%).`;
    } else {
      academicSentence2 = `분석 결과, '${activeGroupA}' 집단은 '${topCritA.name}'(${(topCritA.wA * 100).toFixed(1)}%)을 최우선 순위로 평가한 반면, '${activeGroupB}' 집단은 '${topCritB.name}'(${(topCritB.wB * 100).toFixed(1)}%)을 1순위로 평가하여 두 집단 간 뚜렷한 인식의 차이가 존재함을 확인하였다.`;
    }
  }

  let academicSentence3 = '';
  if (maxDiffItem) {
    const pDiff = Math.abs(maxDiffItem.diff * 100).toFixed(1);
    const favoredGroup = maxDiffItem.diff > 0 ? activeGroupA : activeGroupB;
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
              학계 vs 산업계 / 경력별 교차분석
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            인적사항(경력, 직무, 소속 등)에 따라 전문가 집단을 분할하고 독립적인 AHP 가중치 차이를 비교합니다.
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
                setSelectedDemoId(e.target.value);
                setGroupAVal('');
                setGroupBVal('');
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              {demographics.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Group Selector Boxes */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Group A */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              비교 집단 1 (Group A)
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
              {groupAResp.length}명 응답
            </span>
          </div>
          <select
            value={activeGroupA}
            onChange={e => setGroupAVal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {availableOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt} ({optionCounts[opt]}명)
              </option>
            ))}
          </select>
        </div>

        {/* Group B */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              비교 집단 2 (Group B)
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
              {groupBResp.length}명 응답
            </span>
          </div>
          <select
            value={activeGroupB}
            onChange={e => setGroupBVal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {availableOptions.map(opt => (
              <option key={opt} value={opt} disabled={opt === activeGroupA}>
                {opt} ({optionCounts[opt]}명) {opt === activeGroupA ? '(집단 1과 동일)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exception handling if same group or 0 responses */}
      {activeGroupA === activeGroupB ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>집단 1과 집단 2는 서로 다른 집단을 선택해야 비교 분석을 수행할 수 있습니다.</span>
        </div>
      ) : groupAResp.length === 0 || groupBResp.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-center py-6">
          선택한 집단 중 응답 데이터가 없는 집단이 있습니다. 다른 집단을 선택해주세요.
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
                          {activeGroupA}: {(item.wA * 100).toFixed(1)}% ({item.rankA}위)
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-emerald-700 font-bold">
                          {activeGroupB}: {(item.wB * 100).toFixed(1)}% ({item.rankB}위)
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
                  let text = `평가 기준\t[집단 1] ${activeGroupA} 가중치(%)\t순위\t[집단 2] ${activeGroupB} 가중치(%)\t순위\t가중치 차이(Δ)\t순위 변동\n`;
                  comparisonItems.forEach(item => {
                    const diffPct = (item.diff * 100).toFixed(2);
                    const rankChanged = item.rankA !== item.rankB ? '역전' : '동일';
                    text += `${item.name}\t${(item.wA * 100).toFixed(2)}%\t${item.rankA}\t${(item.wB * 100).toFixed(2)}%\t${item.rankB}\t${diffPct}%p\t${rankChanged}\n`;
                  });
                  text += `\n* 일관성 비율(CR): ${activeGroupA} CR = ${ahpGroupA?.cr.toFixed(4) || '-'}, ${activeGroupB} CR = ${ahpGroupB?.cr.toFixed(4) || '-'}`;
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
                      {activeGroupA} 가중치
                    </th>
                    <th className="py-2.5 px-3 text-center bg-indigo-50/30 text-indigo-900">순위</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-emerald-900">
                      {activeGroupB} 가중치
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
                      * 일관성 비율: '{activeGroupA}' CR = {ahpGroupA?.cr.toFixed(4) || '-'} ({ahpGroupA?.isConsistent ? '만족' : '초과'}) | '{activeGroupB}' CR = {ahpGroupB?.cr.toFixed(4) || '-'} ({ahpGroupB?.isConsistent ? '만족' : '초과'})
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
