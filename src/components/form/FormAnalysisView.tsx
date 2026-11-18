'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { FormAnalysisSummary } from '@/lib/form/analysis';
import { FormConfig } from '@/lib/form/types';

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
  isOwner?: boolean;
  backHref?: string;
}

export default function FormAnalysisView({
  survey,
  formAnalysis,
  isOwner = false,
  backHref,
}: FormAnalysisViewProps) {
  const defaultBack = backHref || (isOwner ? '/dashboard' : '/');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {isOwner && (
          <a
            href={`/api/surveys/${survey.id}/export/excel`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition self-start"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel 내보내기 (.xlsx)</span>
          </a>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">총 참여 응답</span>
            <span className="text-2xl font-extrabold text-slate-900">{formAnalysis.totalResponses}명</span>
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

      {/* Question Summaries */}
      {formAnalysis.totalResponses === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">아직 수집된 응답이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-5">
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
                    {qs.numberLabel && <span className="text-emerald-700 mr-1.5">{qs.numberLabel}</span>}
                    {qs.title}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  응답 {qs.totalAnswered}명
                </span>
              </div>

              {/* Choice / Consent Bar Chart */}
              {qs.optionCounts && (
                <div className="space-y-2.5">
                  {qs.optionCounts.map(oc => (
                    <div key={oc.option} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{oc.option}</span>
                        <span className="font-mono font-bold text-slate-900">
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
                        {qs.otherTexts.map((t, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Matrix Breakdown Table */}
              {qs.matrixCounts && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3 text-left font-semibold">항목</th>
                        {qs.matrixCounts[0]?.columns.map(c => (
                          <th key={c.column} className="py-2 px-2 text-center font-semibold">
                            {c.column}
                          </th>
                        ))}
                        <th className="py-2 px-2 text-right font-semibold">응답</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {qs.matrixCounts.map(mr => (
                        <tr key={mr.row} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{mr.row}</td>
                          {mr.columns.map(col => (
                            <td key={col.column} className="py-2.5 px-2 text-center font-mono text-xs">
                              <span className="font-bold text-slate-900">{col.count}</span>
                              <span className="text-slate-400 ml-1">({col.percentage}%)</span>
                            </td>
                          ))}
                          <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500">
                            {mr.totalRowAnswered}명
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Text Responses */}
              {qs.textResponses && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {qs.textResponses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">작성된 응답이 없습니다.</p>
                  ) : (
                    qs.textResponses.map((tr, i) => (
                      <div
                        key={`${tr.responseId}_${i}`}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-line"
                      >
                        {tr.text}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
