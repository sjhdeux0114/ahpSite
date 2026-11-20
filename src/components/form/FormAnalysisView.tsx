'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Filter,
  Search,
  QrCode,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  ListChecks,
  Eye,
} from 'lucide-react';
import {
  analyzeFormResponses,
  filterFormResponses,
  formatFormAnswerText,
  FormAnalysisSummary,
  FormResponseRecord,
} from '@/lib/form/analysis';
import { FormConfig, getFormQuestionTypeLabel } from '@/lib/form/types';
import QrCodeModal from '@/components/common/QrCodeModal';

interface FormAnalysisViewProps {
  survey: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    status: string;
    formConfig: FormConfig;
  };
  formAnalysis: FormAnalysisSummary;
  responses?: FormResponseRecord[];
  isOwner?: boolean;
  backHref?: string;
}

const STACK_COLORS = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-slate-400',
];

export default function FormAnalysisView({
  survey,
  formAnalysis: initialAnalysis,
  responses: initialResponses = [],
  isOwner = false,
  backHref,
}: FormAnalysisViewProps) {
  const defaultBack = backHref || (isOwner ? '/dashboard' : '/');
  const questions = survey.formConfig?.questions || [];

  const [responses, setResponses] = useState<FormResponseRecord[]>(initialResponses);
  useEffect(() => {
    setResponses(initialResponses);
  }, [initialResponses]);

  const [activeTab, setActiveTab] = useState<'summary' | 'responses'>('summary');
  const [onlyValid, setOnlyValid] = useState<boolean>(true);
  const [filterQuestionId, setFilterQuestionId] = useState<string>('');
  const [filterOptionValue, setFilterOptionValue] = useState<string>('');
  const [textKeyword, setTextKeyword] = useState<string>('');
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponseRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Categorical questions available for Cross-Tab filtering
  const filterableQuestions = useMemo(
    () =>
      questions.filter(
        q =>
          q.type === 'single_choice' ||
          q.type === 'multi_choice' ||
          q.type === 'dropdown' ||
          q.type === 'consent' ||
          q.type === 'linear_scale'
      ),
    [questions]
  );

  const selectedFilterQuestion = useMemo(
    () => filterableQuestions.find(q => q.id === filterQuestionId),
    [filterableQuestions, filterQuestionId]
  );

  const selectedFilterOptions = useMemo(() => {
    if (!selectedFilterQuestion) return [];
    if (selectedFilterQuestion.type === 'linear_scale') {
      const min = selectedFilterQuestion.scaleMin ?? 1;
      const max = selectedFilterQuestion.scaleMax ?? 5;
      const arr: string[] = [];
      for (let i = min; i <= max; i++) arr.push(String(i));
      return arr;
    }
    const opts = [...(selectedFilterQuestion.options || [])];
    if (selectedFilterQuestion.allowOther) {
      opts.push(selectedFilterQuestion.otherLabel || '기타');
    }
    return opts;
  }, [selectedFilterQuestion]);

  const filteredResponses = useMemo(() => {
    if (responses.length === 0) return [];
    return filterFormResponses(responses, {
      onlyValid,
      questionId: filterQuestionId || undefined,
      optionValue: filterOptionValue || undefined,
    });
  }, [responses, onlyValid, filterQuestionId, filterOptionValue]);

  const formAnalysis = useMemo(() => {
    if (responses.length === 0) return initialAnalysis;
    return analyzeFormResponses(survey.formConfig, filteredResponses);
  }, [responses.length, initialAnalysis, survey.formConfig, filteredResponses]);

  const handleToggleValid = async (resp: FormResponseRecord) => {
    const nextValid = resp.isValid === false;
    setActionLoadingId(resp.id);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: resp.id, isValid: nextValid }),
      });
      if (res.ok) {
        setResponses(prev =>
          prev.map(r => (r.id === resp.id ? { ...r, isValid: nextValid } : r))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteResponse = async (resp: FormResponseRecord) => {
    if (!confirm('이 응답을 영구 삭제하시겠습니까?')) return;
    setActionLoadingId(resp.id);
    try {
      const res = await fetch(
        `/api/surveys/${survey.id}/responses?responseId=${encodeURIComponent(resp.id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setResponses(prev => prev.filter(r => r.id !== resp.id));
        if (selectedResponse?.id === resp.id) setSelectedResponse(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const surveyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/s/${survey.slug}` : '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title={survey.title}
        url={surveyUrl}
      />

      {/* Individual Response Detail Modal */}
      {selectedResponse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedResponse(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">개별 응답 상세 보기</h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedResponse.createdAt).toLocaleString('ko-KR')} ·{' '}
                  {selectedResponse.isValid === false ? '제외된 응답' : '유효 응답'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {questions.map(q => {
                const ansText = formatFormAnswerText(q, selectedResponse.answers?.[q.id]);
                return (
                  <div key={q.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-700 mb-1">
                      {q.numberLabel ? `${q.numberLabel}. ` : ''}
                      {q.title}
                    </div>
                    <div className="text-sm text-slate-900 font-medium">
                      {ansText || <span className="text-slate-400 italic">미응답</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href={defaultBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isOwner ? '대시보드로 돌아가기' : '홈으로'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              일반 설문 결과
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900">{survey.title}</h1>
          </div>
          {survey.formConfig?.subtitle && (
            <p className="text-xs text-slate-500 mt-1">{survey.formConfig.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>QR 코드</span>
          </button>
          {isOwner && (
            <a
              href={`/api/surveys/${survey.id}/export/excel`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel 내보내기 (.xlsx)</span>
            </a>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">분석 대상 응답</span>
            <span className="text-2xl font-extrabold text-slate-900">
              {formAnalysis.totalResponses}명
              {responses.length !== formAnalysis.totalResponses && (
                <span className="text-xs font-semibold text-slate-400 ml-1">
                  / 전체 {responses.length}명
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">동의 / 완료 응답</span>
            <span className="text-2xl font-extrabold text-emerald-700">{formAnalysis.consentedCount}명</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">미동의 조기 종료</span>
            <span className="text-2xl font-extrabold text-rose-600">{formAnalysis.declinedCount}명</span>
          </div>
        </div>
      </div>

      {/* Filter & Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'summary'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>문항별 요약 분석</span>
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setActiveTab('responses')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'responses'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>개별 응답 관리 ({responses.length})</span>
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyValid}
              onChange={e => setOnlyValid(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span>유효 응답만 집계 (제외된 응답 숨기기)</span>
          </label>
        </div>

        {/* Cross-Tab Group Filter */}
        {activeTab === 'summary' && filterableQuestions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              교차 분석 필터:
            </span>
            <select
              value={filterQuestionId}
              onChange={e => {
                setFilterQuestionId(e.target.value);
                setFilterOptionValue('');
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 max-w-xs"
            >
              <option value="">전체 응답자 (필터 없음)</option>
              {filterableQuestions.map(q => (
                <option key={q.id} value={q.id}>
                  {q.numberLabel ? `${q.numberLabel}. ` : ''}
                  {q.title.slice(0, 32)}
                </option>
              ))}
            </select>

            {filterQuestionId && (
              <select
                value={filterOptionValue}
                onChange={e => setFilterOptionValue(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold max-w-xs"
              >
                <option value="">선택지 고르기...</option>
                {selectedFilterOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {filterQuestionId && filterOptionValue && (
              <button
                type="button"
                onClick={() => {
                  setFilterQuestionId('');
                  setFilterOptionValue('');
                }}
                className="text-xs text-rose-600 hover:underline font-semibold ml-1"
              >
                필터 초기화
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Question Summaries */}
      {activeTab === 'summary' && (
        <>
          {formAnalysis.totalResponses === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                {responses.length > 0
                  ? '선택한 필터 조건에 해당하는 응답이 없습니다.'
                  : '아직 수집된 응답이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Keyword filter for text responses */}
              {formAnalysis.questionSummaries.some(q => q.textResponses && q.textResponses.length > 0) && (
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={textKeyword}
                    onChange={e => setTextKeyword(e.target.value)}
                    placeholder="주관식 / 숫자 응답 키워드 검색..."
                    className="flex-1 text-xs outline-none bg-transparent"
                  />
                  {textKeyword && (
                    <button
                      type="button"
                      onClick={() => setTextKeyword('')}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      지우기
                    </button>
                  )}
                </div>
              )}

              {formAnalysis.questionSummaries.map(qs => (
                <div
                  key={qs.questionId}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {qs.sectionTitle}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">
                        {qs.numberLabel ? `${qs.numberLabel}. ` : ''}
                        {qs.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                        {getFormQuestionTypeLabel(qs.type)}
                      </span>
                      <span className="font-semibold text-slate-700">응답 {qs.totalAnswered}명</span>
                    </div>
                  </div>

                  {/* Linear Scale Stats Banner */}
                  {qs.scaleStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                      <div>
                        <span className="text-[11px] text-slate-500 block">평균 점수</span>
                        <span className="text-lg font-extrabold text-emerald-700">{qs.scaleStats.mean}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">표준편차</span>
                        <span className="text-lg font-extrabold text-slate-800">{qs.scaleStats.stdDev}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">최소~최대</span>
                        <span className="text-sm font-bold text-slate-700">
                          {qs.totalAnswered > 0 ? `${qs.scaleStats.min} ~ ${qs.scaleStats.max}` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">척도 범위</span>
                        <span className="text-xs font-semibold text-slate-600">
                          {qs.scaleStats.scaleMin}({qs.scaleStats.scaleMinLabel || '최소'}) ~{' '}
                          {qs.scaleStats.scaleMax}({qs.scaleStats.scaleMaxLabel || '최대'})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Number Stats Banner */}
                  {qs.numberStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                      <div>
                        <span className="text-[11px] text-slate-500 block">평균</span>
                        <span className="text-lg font-extrabold text-indigo-700">
                          {qs.numberStats.mean} {qs.numberStats.unit || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">중앙값</span>
                        <span className="text-lg font-extrabold text-slate-800">
                          {qs.numberStats.median} {qs.numberStats.unit || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">최솟값</span>
                        <span className="text-base font-bold text-slate-700">
                          {qs.numberStats.min} {qs.numberStats.unit || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">최댓값</span>
                        <span className="text-base font-bold text-slate-700">
                          {qs.numberStats.max} {qs.numberStats.unit || ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Option Counts (single_choice, multi_choice, dropdown, consent, linear_scale) */}
                  {qs.optionCounts && (
                    <div className="space-y-2.5">
                      {qs.optionCounts.map(oc => (
                        <div key={oc.option} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{oc.option}</span>
                            <span className="font-bold text-slate-700">
                              {oc.count}명 ({oc.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${oc.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {qs.otherTexts && qs.otherTexts.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 block mb-1.5">
                            기타 직접입력 ({qs.otherTexts.length}건)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {qs.otherTexts.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ranking Stats */}
                  {qs.rankingStats && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="py-2 px-3 text-left font-semibold text-slate-600">종합 순위</th>
                            <th className="py-2 px-3 text-left font-semibold text-slate-600">항목</th>
                            <th className="py-2 px-3 text-center font-semibold text-slate-600">평균 순위</th>
                            <th className="py-2 px-3 text-center font-semibold text-slate-600">1순위 선택</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {qs.rankingStats.map((rk, idx) => (
                            <tr key={rk.option}>
                              <td className="py-2.5 px-3 font-extrabold text-emerald-700">{idx + 1}위</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{rk.option}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {rk.avgRank > 0 ? `${rk.avgRank}위` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600">
                                {rk.firstPlaceCount}명
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Matrix Counts with Stacked Bar */}
                  {qs.matrixCounts && (
                    <div className="space-y-4">
                      {/* Stacked bar summary */}
                      <div className="space-y-2.5">
                        {qs.matrixCounts.map(mr => (
                          <div key={mr.row} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{mr.row}</span>
                              <span className="text-slate-500">응답 {mr.totalRowAnswered}명</span>
                            </div>
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                              {mr.columns.map((c, cIdx) =>
                                c.percentage > 0 ? (
                                  <div
                                    key={c.column}
                                    title={`${c.column}: ${c.count}명 (${c.percentage}%)`}
                                    className={`${STACK_COLORS[cIdx % STACK_COLORS.length]} h-full transition-all`}
                                    style={{ width: `${c.percentage}%` }}
                                  />
                                ) : null
                              )}
                            </div>
                          </div>
                        ))}
                        {qs.matrixCounts[0] && (
                          <div className="flex flex-wrap gap-3 pt-1">
                            {qs.matrixCounts[0].columns.map((c, cIdx) => (
                              <span key={c.column} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                                <span className={`w-2.5 h-2.5 rounded-full ${STACK_COLORS[cIdx % STACK_COLORS.length]}`} />
                                {c.column}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="py-2 px-3 text-left font-semibold text-slate-600">항목</th>
                              {qs.matrixCounts[0]?.columns.map(c => (
                                <th key={c.column} className="py-2 px-2 text-center font-semibold text-slate-700">
                                  {c.column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {qs.matrixCounts.map(mr => (
                              <tr key={mr.row}>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{mr.row}</td>
                                {mr.columns.map(c => (
                                  <td key={c.column} className="py-2.5 px-2 text-center text-slate-700">
                                    <span className="font-bold">{c.count}</span>
                                    <span className="text-slate-400 ml-1">({c.percentage}%)</span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Text / Date / Time / Number Responses */}
                  {qs.textResponses && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {(() => {
                        const kw = textKeyword.trim().toLowerCase();
                        const list = kw
                          ? qs.textResponses.filter(t => t.text.toLowerCase().includes(kw))
                          : qs.textResponses;
                        if (list.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 italic">
                              {kw ? '검색어와 일치하는 응답이 없습니다.' : '제출된 응답이 없습니다.'}
                            </p>
                          );
                        }
                        return list.map(tr => (
                          <div
                            key={tr.responseId}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800"
                          >
                            <p className="whitespace-pre-line">{tr.text}</p>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              {new Date(tr.createdAt).toLocaleString('ko-KR')}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Individual Response Management (Owner only) */}
      {activeTab === 'responses' && isOwner && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {responses.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">아직 수집된 응답이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">응답 일시</th>
                    <th className="py-3 px-4 font-bold">상태</th>
                    <th className="py-3 px-4 font-bold">주요 응답 미리보기</th>
                    <th className="py-3 px-4 font-bold text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responses.map((resp, idx) => {
                    const isValid = resp.isValid !== false;
                    const firstPreview = questions
                      .slice(0, 2)
                      .map(q => formatFormAnswerText(q, resp.answers?.[q.id]))
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={resp.id} className={isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/30'}>
                        <td className="py-3 px-4 font-mono text-slate-500">{responses.length - idx}</td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {new Date(resp.createdAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-3 px-4">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              유효
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                              <ShieldAlert className="w-3 h-3" />
                              제외됨
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {firstPreview || '-'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedResponse(resp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>상세</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === resp.id}
                            onClick={() => handleToggleValid(resp)}
                            className={`px-2.5 py-1 rounded-lg font-semibold ${
                              isValid
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isValid ? '제외하기' : '유효로 복원'}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === resp.id}
                            onClick={() => handleDeleteResponse(resp)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 inline-flex items-center"
                            title="응답 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
