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
              <span className="text-xs font-semibold uppercase tracking-wider">집단 일관성(CR)</span>
              {analysis?.criteriaAHP?.isConsistent ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold ${
                analysis?.criteriaAHP?.isConsistent ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {analysis?.criteriaAHP?.cr?.toFixed(4) || '0.0000'}
            </p>
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
          {/* Alternative Rankings Chart */}
          {alternativeBarItems.length > 0 && (
            <BarChartComponent
              title="대안(Alternatives) 종합 우선순위 가중치"
              items={alternativeBarItems}
              color="emerald"
            />
          )}

          {/* Criteria Weights Chart */}
          <BarChartComponent
            title="평가 기준(Criteria) 중요도 가중치"
            items={criteriaBarItems}
            color="indigo"
          />

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

        {/* Pairwise Reciprocal Matrix Table */}
        {analysis?.criteriaAHP && (
          <div className="mb-8">
            <MatrixTable
              title="기준(Criteria) 집단 기하평균 쌍대비교 행렬"
              items={survey.criteria}
              ahpResult={analysis.criteriaAHP}
            />
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
