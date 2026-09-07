'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BarChartComponent from '@/components/analysis/BarChartComponent';
import MatrixTable from '@/components/analysis/MatrixTable';
import RadarChartComponent from '@/components/analysis/RadarChartComponent';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  PauseCircle,
  PlayCircle,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  Filter,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export default function SurveyAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlyValid, setOnlyValid] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = async (filterValid: boolean) => {
    try {
      const res = await fetch(`/api/surveys/${id}/responses?onlyValid=${filterValid}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(onlyValid);
  }, [id, onlyValid]);

  const handleToggleStatus = async () => {
    if (!data?.survey) return;
    const nextStatus = data.survey.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setStatusLoading(true);

    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          survey: { ...prev.survey, status: nextStatus },
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!data?.survey?.slug) return;
    const url = `${window.location.origin}/s/${data.survey.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!data?.survey) {
    return (
      <>
        <Navbar />
        <div className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">설문 데이터를 불러올 수 없습니다.</h2>
          <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </>
    );
  }

  const { survey, analysis, responses } = data;
  const isClosed = survey.status === 'CLOSED';

  // Criteria bar chart items
  const criteriaBarItems = survey.criteria.map((c: any, idx: number) => ({
    name: c.name,
    description: c.description,
    weight: analysis?.criteriaAHP?.weights[idx] || 0,
  }));

  // Subcriteria bar chart items
  const subcriteriaBarItems = (analysis?.allSubcriteria || []).map((s: any) => ({
    name: `${s.name} (${s.criterionName})`,
    description: `대분류: ${s.criterionName} | 국소 비중: ${(s.localWeight * 100).toFixed(1)}%`,
    weight: s.globalWeight || 0,
  }));

  // Alternative bar chart items
  const alternativeBarItems =
    survey.hasAlternatives && analysis?.finalAlternativeWeights
      ? survey.alternatives.map((a: any, idx: number) => ({
          name: a.name,
          description: a.description,
          weight: analysis.finalAlternativeWeights.alternativeWeights[idx] || 0,
        }))
      : [];

  const winningAlternative = alternativeBarItems.length > 0
    ? [...alternativeBarItems].sort((a, b) => b.weight - a.weight)[0]
    : null;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              대시보드로 돌아가기
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {survey.title}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isClosed
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isClosed ? '배포 중지됨' : '배포 중'}
              </span>
            </div>
            {survey.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">{survey.description}</p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Share Link Copy */}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">링크 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>설문 링크 복사</span>
                </>
              )}
            </button>

            {/* Toggle Status */}
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border shadow-xs ${
                isClosed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {isClosed ? (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>배포 재개</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4" />
                  <span>배포 중지</span>
                </>
              )}
            </button>

            {/* Excel Download */}
            <a
              href={`/api/surveys/${id}/export/excel`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel 다운로드</span>
            </a>

            {/* Word Download */}
            <a
              href={`/api/surveys/${id}/export/word`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Word 보고서 다운로드</span>
            </a>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">총 수집 응답</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {analysis?.totalResponses || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">명</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">신뢰 응답 (CR ≤ 0.1)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {analysis?.validResponsesCount || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">명</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {analysis?.hasSubcriteria ? '계층 종합 일관성(CR)' : '집단 일관성(CR)'}
              </span>
              {(analysis?.hasSubcriteria ? analysis?.isHierarchyConsistent : analysis?.criteriaAHP?.isConsistent) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold ${
                (analysis?.hasSubcriteria ? analysis?.isHierarchyConsistent : analysis?.criteriaAHP?.isConsistent)
                  ? 'text-slate-900'
                  : 'text-rose-600'
              }`}
            >
              {analysis?.hasSubcriteria
                ? analysis?.compositeCR?.toFixed(4) || '0.0000'
                : analysis?.criteriaAHP?.cr?.toFixed(4) || '0.0000'}
            </p>
            {analysis?.hasSubcriteria && (
              <span className="text-[11px] text-slate-400 block mt-0.5">
                (대분류 CR: {analysis?.criteriaAHP?.cr?.toFixed(4)})
              </span>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">분석 필터</span>
              <Filter className="w-4 h-4 text-indigo-500" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={onlyValid}
                onChange={e => setOnlyValid(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>신뢰 응답(CR ≤ 0.1)만 집계</span>
            </label>
          </div>
        </div>

        {/* Winner Highlight Banner if alternatives exist */}
        {winningAlternative && (
          <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-xl shadow-indigo-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-indigo-200 font-bold block mb-1">
                  AHP 종합 최우선 1위 대안
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {winningAlternative.name}
                </h2>
                {winningAlternative.description && (
                  <p className="text-xs text-indigo-200 mt-1">{winningAlternative.description}</p>
                )}
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/15 sm:pl-8 shrink-0">
              <span className="text-xs text-indigo-200 block uppercase">종합 기여 가중치</span>
              <span className="text-3xl sm:text-4xl font-black text-amber-300">
                {(winningAlternative.weight * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Subcriteria Rankings Chart (Full Width) */}
          {subcriteriaBarItems.length > 0 && (
            <div className="lg:col-span-2">
              <BarChartComponent
                title="하위 세부영역(Sub-criteria) 종합 전역 우선순위 (Global Weights)"
                items={subcriteriaBarItems}
                color="purple"
              />
            </div>
          )}

          {/* Criteria Weights Chart */}
          <BarChartComponent
            title="상위 대분류(Criteria) 중요도 가중치"
            items={criteriaBarItems}
            color="indigo"
          />

          {/* Alternative Rankings Chart */}
          {alternativeBarItems.length > 0 && (
            <BarChartComponent
              title="대안(Alternatives) 종합 우선순위 가중치"
              items={alternativeBarItems}
              color="emerald"
            />
          )}

          {/* Multi-criteria Radar Chart */}
          {survey.hasAlternatives &&
            analysis?.finalAlternativeWeights?.contributionMatrix &&
            survey.criteria.length >= 3 && (
              <div className="lg:col-span-2">
                <RadarChartComponent
                  criteria={survey.criteria}
                  alternatives={survey.alternatives}
                  contributionMatrix={analysis.finalAlternativeWeights.contributionMatrix}
                />
              </div>
            )}
        </div>

        {/* Hierarchical Breakdown Table if subcriteria exist */}
        {analysis?.hasSubcriteria && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm mb-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  AHP 다계층 (대분류 - 세부영역) 종합 분석표
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 대분류 내 상대적 국소 가중치(Local)와 전체 기준 종합 전역 가중치(Global) 산출 결과입니다.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-100 shrink-0">
                계층 종합 CR_H: {analysis?.compositeCR?.toFixed(4)} ({analysis?.isHierarchyConsistent ? '일관성 충족' : '기준치 초과'})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">대분류 (가중치)</th>
                    <th className="py-2.5 px-3 font-semibold">하위 세부영역</th>
                    <th className="py-2.5 px-3 font-semibold text-right">국소 가중치(Local)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">종합 전역 가중치(Global)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">전체 종합 순위</th>
                    <th className="py-2.5 px-3 font-semibold text-right">세부영역 CR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {survey.criteria.map((crit: any, cIdx: number) => {
                    const critW = analysis?.criteriaAHP?.weights[cIdx] || 0;
                    const subs = crit.subcriteria || [];
                    const subAHP = analysis?.subcriteriaAHPByCriteria?.[crit.id];

                    if (subs.length === 0) {
                      return (
                        <tr key={crit.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-bold text-indigo-900">{crit.name} ({(critW * 100).toFixed(2)}%)</td>
                          <td className="py-2.5 px-3 text-slate-400 italic" colSpan={5}>하위 세부영역 없음</td>
                        </tr>
                      );
                    }

                    return subs.map((sub: any, sIdx: number) => {
                      const localW = subAHP?.weights[sIdx] || 0;
                      const globalItem = analysis?.allSubcriteria?.find((it: any) => it.id === sub.id);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70">
                          {sIdx === 0 && (
                            <td
                              rowSpan={subs.length}
                              className="py-2.5 px-3 font-bold text-indigo-900 bg-slate-50/50 border-r border-slate-100 align-top"
                            >
                              <div>{crit.name}</div>
                              <div className="text-xs font-mono text-indigo-600 mt-0.5">
                                {(critW * 100).toFixed(2)}%
                              </div>
                              {crit.description && (
                                <div className="text-[11px] text-slate-400 font-normal mt-1">{crit.description}</div>
                              )}
                            </td>
                          )}
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {sub.name}
                            {sub.description && (
                              <span className="text-[11px] text-slate-400 font-normal block">{sub.description}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {(localW * 100).toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                            {globalItem ? `${(globalItem.globalWeight * 100).toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {globalItem && (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                globalItem.globalRank === 1
                                  ? 'bg-amber-100 text-amber-900'
                                  : globalItem.globalRank <= 3
                                  ? 'bg-indigo-100 text-indigo-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {globalItem.globalRank}
                              </span>
                            )}
                          </td>
                          {sIdx === 0 && (
                            <td
                              rowSpan={subs.length}
                              className="py-2.5 px-3 text-right font-mono text-xs border-l border-slate-100 align-middle"
                            >
                              <span className={`font-bold ${subAHP?.isConsistent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                CR {subAHP?.cr?.toFixed(4) || '-'}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pairwise Reciprocal Matrix Table */}
        {analysis?.criteriaAHP && (
          <div className="mb-8">
            <MatrixTable
              title="대분류(Criteria) 집단 기하평균 쌍대비교 행렬"
              items={survey.criteria}
              ahpResult={analysis.criteriaAHP}
            />
          </div>
        )}

        {/* Demographics Breakdown Summary if exists */}
        {survey.demographics && survey.demographics.length > 0 && responses.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm mb-8">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              응답자 인적사항 (프로필) 분포 현황
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {survey.demographics.map((demo: any) => {
                const countMap: Record<string, number> = {};
                responses.forEach((r: any) => {
                  const val = r.demographics?.[demo.id];
                  if (val) countMap[val] = (countMap[val] || 0) + 1;
                });

                return (
                  <div key={demo.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block mb-2">{demo.title}</span>
                    <div className="space-y-1">
                      {Object.keys(countMap).length === 0 ? (
                        <span className="text-xs text-slate-400">응답 데이터 없음</span>
                      ) : (
                        Object.entries(countMap).map(([opt, count]) => {
                          const pct = Math.round((count / responses.length) * 100);
                          return (
                            <div key={opt} className="flex items-center justify-between text-xs text-slate-600">
                              <span className="truncate max-w-[140px] font-medium">{opt}</span>
                              <span className="font-bold text-indigo-700">
                                {count}명 ({pct}%)
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual Respondents Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              응답자별 데이터 및 일관성 검증 내역
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              총 {responses.length}명 참여
            </span>
          </div>

          {responses.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              아직 수집된 응답이 없습니다. 설문 링크를 복사하여 응답자에게 배포하세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">응답자</th>
                    <th className="py-2.5 px-3 font-semibold">이메일</th>
                    {survey.demographics?.map((demo: any) => (
                      <th key={demo.id} className="py-2.5 px-3 font-semibold text-slate-700">
                        {demo.title}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold">응답 일시</th>
                    <th className="py-2.5 px-3 font-semibold text-right">기준 CR</th>
                    <th className="py-2.5 px-3 font-semibold text-center">신뢰도 통과 여부</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responses.map((resp: any, idx: number) => (
                    <tr key={resp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{resp.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{resp.email || '-'}</td>
                      {survey.demographics?.map((demo: any) => (
                        <td key={demo.id} className="py-2.5 px-3 text-slate-700 font-medium">
                          {resp.demographics?.[demo.id] || '-'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {new Date(resp.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {resp.criteriaCR.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            resp.isValid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {resp.isValid ? '적합 (CR ≤ 0.1)' : '부적합 (CR > 0.1)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </>
  );
}
