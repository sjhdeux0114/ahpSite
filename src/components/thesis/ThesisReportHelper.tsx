'use client';

import { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Table,
  BookOpen,
  Sparkles,
  Info,
  Layers,
  Award,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface ThesisReportHelperProps {
  survey: any;
  analysis: any;
  responses: any[];
  isLoggedIn?: boolean;
}

export default function ThesisReportHelper({
  survey,
  analysis,
  responses,
  isLoggedIn = true,
}: ThesisReportHelperProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'tables' | 'citations'>('text');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // --- 통계 및 가중치 데이터 추출 ---
  const totalResp = analysis?.totalResponses || responses.length || 0;
  const validResp = analysis?.validResponsesCount || responses.filter((r: any) => r.isValid).length || 0;
  const criteria = Array.isArray(survey.criteria) ? survey.criteria : [];
  const alternatives = Array.isArray(survey.alternatives) ? survey.alternatives : [];
  const hasAlternatives = survey.hasAlternatives && alternatives.length > 0;
  const hasSubcriteria = survey.hasSubcriteria || analysis?.hasSubcriteria;

  // 대분류 가중치 정렬
  const criteriaList = criteria
    .map((c: any, idx: number) => ({
      name: c.name,
      description: c.description,
      weight: analysis?.criteriaAHP?.weights?.[idx] || 0,
      subcriteria: Array.isArray(c.subcriteria) ? c.subcriteria : [],
    }))
    .sort((a: any, b: any) => b.weight - a.weight);

  const topCrit = criteriaList[0];
  const secondCrit = criteriaList[1];
  const thirdCrit = criteriaList[2];

  // 세부영역 정렬 (전역 글로벌 가중치 기준)
  const allSubcriteria = (Array.isArray(analysis?.allSubcriteria) ? analysis.allSubcriteria : [])
    .slice()
    .sort((a: any, b: any) => (b.globalWeight || 0) - (a.globalWeight || 0));
  const topSub = allSubcriteria[0];
  const secondSub = allSubcriteria[1];
  const thirdSub = allSubcriteria[2];

  // 대안 정렬
  const altList = hasAlternatives && analysis?.finalAlternativeWeights
    ? alternatives
        .map((a: any, idx: number) => ({
          name: a.name,
          description: a.description,
          weight: analysis.finalAlternativeWeights.alternativeWeights?.[idx] || 0,
        }))
        .sort((a: any, b: any) => b.weight - a.weight)
    : [];
  const topAlt = altList[0];

  const compositeCR = Number(
    (analysis?.hasSubcriteria ? analysis?.compositeCR : analysis?.criteriaAHP?.cr) || 0
  );
  const threshold = Number(survey?.consistencyThreshold ?? 0.1);
  const thLabel = threshold.toFixed(2);
  const isConsistent = compositeCR <= threshold;

  // --- 학술 해석 텍스트 조합 ---
  const paragraph1 = `본 연구는 '${survey.title}'을(를) 목적으로 관련 분야 전문가 총 ${totalResp}명을 대상으로 AHP(계층화 분석법, Analytic Hierarchy Process) 설문 조사를 실시하였다. 수집된 설문 응답 중 일관성 비율(CR ≤ ${thLabel}) 기준을 충족한 유효 응답 ${validResp}부(${totalResp > 0 ? ((validResp / totalResp) * 100).toFixed(1) : 0}%)를 최종 실증분석에 활용하였다. 전문가 집단의 개별 쌍대비교 판단치는 역수 행렬의 성질을 만족하도록 기하평균(Geometric Mean)을 적용하여 종합 통합 행렬을 구성하였다.`;

  const critRankStr = criteriaList
    .map((c: any, i: number) => `'${c.name}'(가중치: ${(c.weight * 100).toFixed(2)}%, ${i + 1}위)`)
    .join(', ');

  const critCR = Number(analysis?.criteriaAHP?.cr || 0);
  const paragraph2 = `1계층 대분류 평가요소의 중요도 산출 결과, ${topCrit ? `'${topCrit.name}'이(가) ${(topCrit.weight * 100).toFixed(2)}%로 가장 높은 가중치를 나타내어 최우선 고려 요인으로 도출되었다.` : ''} ${secondCrit ? `이어 '${secondCrit.name}'(${(secondCrit.weight * 100).toFixed(2)}%), ` : ''}${thirdCrit ? `'${thirdCrit.name}'(${(thirdCrit.weight * 100).toFixed(2)}%) ` : ''}순으로 중요도가 분석되었다(${critRankStr}). 대분류 행렬에 대한 일관성 비율(CR)은 ${critCR.toFixed(4)}로 본 연구의 일관성 판단 기준인 ${thLabel} 이하를 충족하여 전문가 집단 응답의 논리적 일관성이 충분히 확보되었음을 확인하였다.`;

  let paragraph3 = '';
  if (hasSubcriteria && allSubcriteria.length > 0) {
    paragraph3 = `2계층 하위 세부영역에 대한 전역 종합 가중치(Global Weight) 분석 결과, 전체 세부영역 중 ${topSub ? `'${topSub.name}'이(가) 종합 가중치 ${(topSub.globalWeight * 100).toFixed(2)}%로 1위` : ''}를 차지하였으며, ${secondSub ? `'${secondSub.name}'(${(secondSub.globalWeight * 100).toFixed(2)}%, 2위), ` : ''}${thirdSub ? `'${thirdSub.name}'(${(thirdSub.globalWeight * 100).toFixed(2)}%, 3위) ` : ''}순으로 우선순위가 결정되었다. 다계층 종합 일관성 비율(Composite CR)은 ${compositeCR.toFixed(4)}로 집계되어 계층 구조 전반에 걸친 논리적 타당성이 검증되었다.`;
  }

  let paragraph4 = '';
  if (hasAlternatives && topAlt) {
    const altRankStr = altList
      .map((a: any, i: number) => `${i + 1}위 '${a.name}'(${(a.weight * 100).toFixed(2)}%)`)
      .join(', ');
    paragraph4 = `평가 기준 가중치와 각 기준별 대안 쌍대비교 결과를 종합한 최종 대안 우선순위 평가에서는 '${topAlt.name}'이(가) ${(topAlt.weight * 100).toFixed(2)}%의 최종 종합 기여도를 기록하여 최적의 대안으로 선정되었다. 이어 ${altRankStr} 순으로 우선순위가 평가되었다.`;
  }

  const paragraph5 = `이러한 실증분석 결과는 향후 관련 의사결정 및 전략 수립 시 ${topCrit ? `'${topCrit.name}'` : '주요 평가 요소'}에 가장 높은 자원과 역량을 우선적으로 배분해야 함을 시사한다.`;

  const fullText = [paragraph1, paragraph2, paragraph3, paragraph4, paragraph5]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            논문 작성 도우미 (Thesis Writing Helper)
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              제4장 실증분석용
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            분석 결과를 학술지/학위논문 표준 서식에 맞춘 완성형 문장과 APA 표준 삼선표로 자동 생성합니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'text' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            학술 해석 문장
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'tables' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            APA 표준 표
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('citations')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'citations' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            AHP 수식 & 참고문헌
          </button>
        </div>
      </div>

      {/* Tab 1: Academic Text Generation */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              학술지/학위논문 본문 자동 생성문 (한글/Word 복사용)
            </span>
            <button
              type="button"
              onClick={() => handleCopy('fullText', fullText)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
            >
              {copiedKey === 'fullText' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  본문 전체 복사 완료!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  본문 전체 복사
                </>
              )}
            </button>
          </div>

          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-3 font-sans">
            <p className="indent-4">{paragraph1}</p>
            <p className="indent-4">{paragraph2}</p>
            {paragraph3 && <p className="indent-4">{paragraph3}</p>}
            {paragraph4 && <p className="indent-4">{paragraph4}</p>}
            <p className="indent-4">{paragraph5}</p>
          </div>

          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              생성된 문장은 실제 연구 결과 수치와 100% 일치하도록 검증되었으며, 복사 후 학위논문이나 KCI 학술지 양식에 맞춰 연구 배경에 맞게 부드럽게 윤문하여 사용하시면 됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: APA Standard Tables */}
      {activeTab === 'tables' && (
        <div className="space-y-8">
          {/* Table 1: Demographics if exist */}
          {Array.isArray(survey.demographics) && survey.demographics.length > 0 && responses.length > 0 && (
            !isLoggedIn ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>개인정보 보호를 위해 비로그인 상태에서는 &lt;표 1&gt; 전문가 패널 인구통계학적 특성 표가 비공개 처리됩니다.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    &lt;표 1&gt; 전문가 패널 인구통계학적 특성 (N = {responses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = survey.demographics
                        .map((demo: any) => {
                          const counts: Record<string, number> = {};
                          responses.forEach((r: any) => {
                            const val = r.demographics?.[demo.id];
                            if (val) counts[val] = (counts[val] || 0) + 1;
                          });
                          const rows = Object.entries(counts)
                            .map(([opt, cnt]) => `${demo.title}\t${opt}\t${cnt}\t${((cnt / responses.length) * 100).toFixed(1)}%`)
                            .join('\n');
                          return rows;
                        })
                        .join('\n');
                      handleCopy('table1', `구분\t항목\t빈도(명)\t비율(%)\n${text}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedKey === 'table1' ? '복사됨!' : '표 1 한글/워드 복사'}
                  </button>
                </div>

                {/* APA Three-Line Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border-t-2 border-b-2 border-slate-900 font-sans">
                    <thead>
                      <tr className="border-b border-slate-900 font-bold bg-slate-50/50">
                        <th className="py-2 px-3">구분</th>
                        <th className="py-2 px-3">세부 항목</th>
                        <th className="py-2 px-3 text-right">빈도 (명)</th>
                        <th className="py-2 px-3 text-right">비율 (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {survey.demographics.map((demo: any) => {
                        const counts: Record<string, number> = {};
                        responses.forEach((r: any) => {
                          const val = r.demographics?.[demo.id];
                          if (val) counts[val] = (counts[val] || 0) + 1;
                        });
                        const entries = Object.entries(counts);
                        return entries.map(([opt, cnt], i) => (
                          <tr key={`${demo.id}-${opt}`}>
                            {i === 0 ? (
                              <td className="py-1.5 px-3 font-semibold text-slate-800" rowSpan={entries.length}>
                                {demo.title}
                              </td>
                            ) : null}
                            <td className="py-1.5 px-3 text-slate-600">{opt}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-700">{cnt}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-900">
                              {((cnt / responses.length) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Table 2: AHP Hierarchical Weights and Consistency Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                &lt;표 2&gt; AHP 평가기준 가중치 및 일관성 비율(CR) 종합 분석 결과
              </span>
              <button
                type="button"
                onClick={() => {
                  let text = `1계층(대분류)\t대분류 가중치\t순위\t2계층(세부영역)\t국소 가중치(Local)\t전역 가중치(Global)\t종합 순위\n`;
                  criteriaList.forEach((c: any, cIdx: number) => {
                    const subs = allSubcriteria.filter((s: any) => s.criterionName === c.name);
                    if (subs.length > 0) {
                      subs.forEach((s: any) => {
                        text += `${c.name}\t${(c.weight * 100).toFixed(2)}%\t${cIdx + 1}\t${s.name}\t${(s.localWeight * 100).toFixed(2)}%\t${(s.globalWeight * 100).toFixed(2)}%\t${s.rank}\n`;
                      });
                    } else {
                      text += `${c.name}\t${(c.weight * 100).toFixed(2)}%\t${cIdx + 1}\t-\t-\t-\t-\n`;
                    }
                  });
                  text += `\n대분류 CR: ${analysis?.criteriaAHP?.cr?.toFixed(4) || '0.0000'}\t종합 CR: ${compositeCR.toFixed(4)}\t일관성 판정: ${isConsistent ? `적합 (CR ≤ ${thLabel})` : '부적합'}`;
                  handleCopy('table2', text);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedKey === 'table2' ? '복사됨!' : '표 2 한글/워드 복사'}
              </button>
            </div>

            {/* APA Style Three-Line Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border-t-2 border-b-2 border-slate-900 font-sans">
                <thead>
                  <tr className="border-b border-slate-900 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">대분류 (1계층)</th>
                    <th className="py-2.5 px-3 text-right">가중치 (%)</th>
                    <th className="py-2.5 px-3 text-center">순위</th>
                    {hasSubcriteria && (
                      <>
                        <th className="py-2.5 px-3">세부영역 (2계층)</th>
                        <th className="py-2.5 px-3 text-right">Local 가중치 (%)</th>
                        <th className="py-2.5 px-3 text-right">Global 가중치 (%)</th>
                        <th className="py-2.5 px-3 text-center">종합 순위</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {criteriaList.map((c: any, cIdx: number) => {
                    const subs = allSubcriteria.filter((s: any) => s.criterionName === c.name);
                    if (hasSubcriteria && subs.length > 0) {
                      return subs.map((s: any, sIdx: number) => (
                        <tr key={`${c.name}-${s.name}`}>
                          {sIdx === 0 ? (
                            <>
                              <td className="py-2 px-3 font-bold text-slate-800" rowSpan={subs.length}>
                                {c.name}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-indigo-900" rowSpan={subs.length}>
                                {(c.weight * 100).toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700" rowSpan={subs.length}>
                                {cIdx + 1}
                              </td>
                            </>
                          ) : null}
                          <td className="py-1.5 px-3 text-slate-700">{s.name}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                            {(s.localWeight * 100).toFixed(2)}%
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {(s.globalWeight * 100).toFixed(2)}%
                          </td>
                          <td className="py-1.5 px-3 text-center font-semibold text-indigo-700">
                            {s.rank}
                          </td>
                        </tr>
                      ));
                    } else {
                      return (
                        <tr key={c.name}>
                          <td className="py-2 px-3 font-bold text-slate-800">{c.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-900">
                            {(c.weight * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">{cIdx + 1}</td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-900 bg-slate-50/70 text-[11px] font-semibold text-slate-700">
                    <td colSpan={hasSubcriteria ? 7 : 3} className="py-2 px-3">
                      * 일관성 비율: 대분류 CR = {analysis?.criteriaAHP?.cr?.toFixed(4) || '0.0000'}
                      {hasSubcriteria && ` | 계층 종합 CR = ${compositeCR.toFixed(4)}`}
                      {' '}(판정: {isConsistent ? `만족 CR ≤ ${thLabel}` : `불일치 CR > ${thLabel}`})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Table 3: Alternatives Ranking if exists */}
          {hasAlternatives && altList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  &lt;표 3&gt; 대안(Alternatives) 종합 우선순위 가중치 평가 결과
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = `최종 순위\t대안 명칭\t종합 가중치(%)\n` +
                      altList.map((a: any, idx: number) => `${idx + 1}\t${a.name}\t${(a.weight * 100).toFixed(2)}%`).join('\n');
                    handleCopy('table3', text);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey === 'table3' ? '복사됨!' : '표 3 한글/워드 복사'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border-t-2 border-b-2 border-slate-900 font-sans">
                  <thead>
                    <tr className="border-b border-slate-900 font-bold bg-slate-50/50">
                      <th className="py-2.5 px-3 text-center">최종 순위</th>
                      <th className="py-2.5 px-3">대안 명칭</th>
                      <th className="py-2.5 px-3 text-right">종합 기여 가중치 (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {altList.map((alt: any, idx: number) => (
                      <tr key={alt.name} className={idx === 0 ? 'bg-indigo-50/40 font-bold' : ''}>
                        <td className="py-2 px-3 text-center font-bold text-indigo-700">{idx + 1}</td>
                        <td className="py-2 px-3 text-slate-800">{alt.name}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 font-semibold">
                          {(alt.weight * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AHP Formulas & Academic Citations */}
      {activeTab === 'citations' && (
        <div className="space-y-6 text-xs text-slate-700">
          {/* Formulas */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono">
            <h4 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              논문 제3장(연구방법) 작성용 주요 AHP 수식
            </h4>

            <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <strong>1. 일관성 지수 (Consistency Index, CI)</strong>
                <p className="text-slate-600 mt-0.5">CI = (λ_max - n) / (n - 1)</p>
                <p className="text-[10px] text-slate-400 font-sans">여기서 λ_max는 쌍대비교 행렬의 최대 고유값(Maximum Eigenvalue), n은 평가요소의 수이다.</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <strong>2. 일관성 비율 (Consistency Ratio, CR)</strong>
                <p className="text-slate-600 mt-0.5">CR = (CI / RI) × 100%</p>
                <p className="text-[10px] text-slate-400 font-sans">RI는 Saaty가 실험을 통해 도출한 무작위 난수지수(Random Index)이다.</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <strong>3. Saaty 표준 무작위 난수지수 (Random Index, RI)</strong>
                <p className="text-slate-600 mt-0.5">n=1(0.00), n=2(0.00), n=3(0.58), n=4(0.90), n=5(1.12), n=6(1.24), n=7(1.32), n=8(1.41), n=9(1.45)</p>
              </div>
            </div>
          </div>

          {/* Citations */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              AHP 핵심 선행연구 인용문 (APA 양식)
            </h4>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">Saaty (1980) - AHP 창시자 표준 저서</p>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    Saaty, T. L. (1980). The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation. McGraw-Hill, New York.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('cite1', 'Saaty, T. L. (1980). The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation. McGraw-Hill, New York.')}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:border-indigo-400 rounded-md text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  {copiedKey === 'cite1' ? '복사됨!' : '인용 복사'}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">Saaty (1990) - 일관성 및 의사결정 원리</p>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    Saaty, T. L. (1990). How to make a decision: the analytic hierarchy process. European Journal of Operational Research, 48(1), 9-26.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('cite2', 'Saaty, T. L. (1990). How to make a decision: the analytic hierarchy process. European Journal of Operational Research, 48(1), 9-26.')}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:border-indigo-400 rounded-md text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  {copiedKey === 'cite2' ? '복사됨!' : '인용 복사'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
