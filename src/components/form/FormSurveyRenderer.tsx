'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Send,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { FormAnswerMap, FormConfig, FormQuestion } from '@/lib/form/types';

interface FormSurveyRendererProps {
  slug: string;
  survey: {
    id: string;
    title: string;
    description?: string;
    status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
    formConfig: FormConfig;
  };
}

function resolveTargetQuestionIndex(questions: FormQuestion[], target: string): number {
  const norm = target.trim();
  const numTarget = /^\d+$/.test(norm) ? Number(norm) : NaN;
  return questions.findIndex(q => {
    if (q.id === norm) return true;
    if (q.numberLabel && q.numberLabel.trim() === norm) return true;
    if (!isNaN(numTarget) && q.numberLabel && /^\d+$/.test(q.numberLabel.trim())) {
      return Number(q.numberLabel.trim()) === numTarget;
    }
    return false;
  });
}

export default function FormSurveyRenderer({ slug, survey }: FormSurveyRendererProps) {
  const formConfig = survey.formConfig || { sections: [], questions: [] };
  const sections = formConfig.sections || [];
  const questions = formConfig.questions || [];

  const [answers, setAnswers] = useState<FormAnswerMap>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declinedByConsent, setDeclinedByConsent] = useState(false);

  // Load draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`form_survey_draft_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') setAnswers(parsed);
      }
    } catch {}
  }, [slug]);

  // Save draft
  useEffect(() => {
    if (submitted) return;
    try {
      localStorage.setItem(`form_survey_draft_${slug}`, JSON.stringify(answers));
    } catch {}
  }, [slug, answers, submitted]);

  const isQuestionAnswered = (q: FormQuestion): boolean => {
    const raw = answers[q.id];
    if (!raw) return false;
    if (q.type === 'short_text' || q.type === 'long_text') {
      return typeof raw === 'string' ? raw.trim().length > 0 : false;
    }
    if (q.type === 'matrix_single') {
      const rows = q.rows || [];
      if (typeof raw === 'object' && 'rows' in raw) {
        return rows.every(r => Boolean(raw.rows?.[r]));
      }
      return false;
    }
    if (q.type === 'multi_choice') {
      if (typeof raw === 'object' && 'values' in raw) {
        return raw.values.length > 0;
      }
      return false;
    }
    // single_choice / consent
    if (typeof raw === 'object' && 'value' in raw) {
      return Boolean(raw.value);
    }
    return typeof raw === 'string' && raw.length > 0;
  };

  // Compute visible questions following conditional branching / skip logic
  const { visibleQuestions, endedEarly, endedByConsent } = useMemo(() => {
    const result: FormQuestion[] = [];
    const visited = new Set<number>();
    let idx = 0;
    let ended = false;
    let byConsent = false;
    let hasUnansweredBranching = false;

    while (idx >= 0 && idx < questions.length) {
      if (visited.has(idx)) break;
      visited.add(idx);
      const q = questions[idx];
      result.push(q);

      const raw = answers[q.id];
      const selectedVal = typeof raw === 'string' ? raw : raw && 'value' in raw ? raw.value : '';

      if (q.branches && Object.keys(q.branches).length > 0) {
        if (selectedVal && q.branches[selectedVal]) {
          const target = q.branches[selectedVal];
          if (target === '__END__') {
            ended = true;
            byConsent = q.type === 'consent';
            break;
          }
          const targetIdx = resolveTargetQuestionIndex(questions, target);
          if (targetIdx > idx) {
            idx = targetIdx;
            continue;
          }
        } else if (!selectedVal) {
          hasUnansweredBranching = true;
        }
      }

      if (q.endOnOptions && selectedVal && q.endOnOptions.includes(selectedVal)) {
        ended = true;
        byConsent = q.type === 'consent';
        break;
      }

      if (q.nextQuestion && (!hasUnansweredBranching || isQuestionAnswered(q))) {
        if (q.nextQuestion === '__END__') {
          ended = true;
          break;
        }
        const targetIdx = resolveTargetQuestionIndex(questions, q.nextQuestion);
        if (targetIdx > idx) {
          idx = targetIdx;
          continue;
        }
      }

      idx++;
    }

    return { visibleQuestions: result, endedEarly: ended, endedByConsent: byConsent };
  }, [questions, answers]);

  const visibleQuestionIds = useMemo(
    () => new Set(visibleQuestions.map(q => q.id)),
    [visibleQuestions]
  );

  const setSingleAnswer = (qId: string, value: string, otherText?: string) => {
    setErrorMsg('');
    setAnswers(prev => ({
      ...prev,
      [qId]: { value, otherText },
    }));
  };

  const toggleMultiAnswer = (qId: string, option: string) => {
    setErrorMsg('');
    setAnswers(prev => {
      const curr = prev[qId];
      const existing =
        curr && typeof curr === 'object' && 'values' in curr && Array.isArray(curr.values)
          ? curr.values
          : [];
      const otherText =
        curr && typeof curr === 'object' && 'otherText' in curr ? curr.otherText : undefined;
      const next = existing.includes(option)
        ? existing.filter(v => v !== option)
        : [...existing, option];
      return {
        ...prev,
        [qId]: { values: next, otherText },
      };
    });
  };

  const setOtherText = (qId: string, text: string, isMulti: boolean) => {
    setAnswers(prev => {
      const curr = prev[qId];
      if (isMulti) {
        const values =
          curr && typeof curr === 'object' && 'values' in curr ? curr.values : ['__OTHER__'];
        return { ...prev, [qId]: { values, otherText: text } };
      }
      const value = curr && typeof curr === 'object' && 'value' in curr ? curr.value : '__OTHER__';
      return { ...prev, [qId]: { value, otherText: text } };
    });
  };

  const setMatrixAnswer = (qId: string, row: string, col: string) => {
    setErrorMsg('');
    setAnswers(prev => {
      const curr = prev[qId];
      const prevRows = curr && typeof curr === 'object' && 'rows' in curr ? curr.rows : {};
      return {
        ...prev,
        [qId]: { rows: { ...prevRows, [row]: col } },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validate only visible (non-skipped) required questions
    for (const q of visibleQuestions) {
      if (q.required && !isQuestionAnswered(q)) {
        const label = q.numberLabel ? `${q.numberLabel}. ${q.title}` : q.title;
        setErrorMsg(`필수 문항에 응답해 주세요: ${label}`);
        const el = document.getElementById(`form-q-${q.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Filter out answers for skipped questions
    const filteredAnswers: FormAnswerMap = {};
    for (const q of visibleQuestions) {
      if (answers[q.id] !== undefined) {
        filteredAnswers[q.id] = answers[q.id];
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/survey/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: filteredAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '응답 제출 중 오류가 발생했습니다.');
        setSubmitting(false);
        return;
      }
      try {
        localStorage.removeItem(`form_survey_draft_${slug}`);
      } catch {}
      setDeclinedByConsent(endedByConsent);
      setSubmitted(true);
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (survey.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">설문이 종료되었습니다</h1>
          <p className="text-sm text-slate-500">현재 이 설문은 응답을 받고 있지 않습니다.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-3xl border border-emerald-200 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            {declinedByConsent ? '설문이 종료되었습니다' : '응답이 제출되었습니다'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {declinedByConsent
              ? '참여에 동의하지 않으셔서 설문이 종료되었습니다. 응답해 주셔서 감사합니다.'
              : '소중한 응답에 진심으로 감사드립니다. 제출하신 내용은 안전하게 저장되었습니다.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
        {/* Header Card */}
        <div className="bg-white rounded-3xl border-t-8 border-t-emerald-600 border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            {formConfig.subtitle ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {formConfig.subtitle}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ClipboardList className="w-3.5 h-3.5" />
                일반 설문조사
              </span>
            )}
            {formConfig.meta && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {formConfig.meta}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {survey.title}
          </h1>

          {survey.description && (
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
              {survey.description}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-rose-600 font-medium">
            * 표시는 필수 응답 문항입니다.
          </div>
        </div>

        {/* Sections & Questions */}
        {sections.map(sec => {
          const secQuestions = questions.filter(
            q => q.sectionId === sec.id && visibleQuestionIds.has(q.id)
          );

          if (secQuestions.length === 0) return null;

          return (
            <div key={sec.id} className="space-y-4">
              {/* Section Banner */}
              <div className="bg-emerald-700 text-white rounded-2xl px-6 py-4 shadow-xs">
                <h2 className="text-base sm:text-lg font-bold">{sec.title}</h2>
                {sec.description && (
                  <p className="text-xs sm:text-sm text-emerald-100 mt-1.5 leading-relaxed whitespace-pre-line">
                    {sec.description}
                  </p>
                )}
              </div>

              {/* Questions */}
              {secQuestions.map(q => {
                const raw = answers[q.id];
                const otherLabel = q.otherLabel || '기타';

                return (
                  <div
                    key={q.id}
                    id={`form-q-${q.id}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {q.numberLabel && (
                          <span className="text-emerald-700 font-extrabold mr-2">{q.numberLabel}</span>
                        )}
                        {q.title}
                        {q.required ? (
                          <span className="text-rose-500 ml-1">*</span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-slate-400">(선택)</span>
                        )}
                      </h3>
                    </div>

                    {q.description && (
                      <p className="text-xs text-slate-500">{q.description}</p>
                    )}

                    {/* Short Text */}
                    {q.type === 'short_text' && (
                      <input
                        type="text"
                        value={typeof raw === 'string' ? raw : ''}
                        onChange={e => {
                          setErrorMsg('');
                          setAnswers(prev => ({ ...prev, [q.id]: e.target.value }));
                        }}
                        placeholder={q.placeholder || '답변을 입력해 주세요'}
                        className="w-full sm:max-w-md px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    )}

                    {/* Long Text */}
                    {q.type === 'long_text' && (
                      <textarea
                        rows={4}
                        value={typeof raw === 'string' ? raw : ''}
                        onChange={e => {
                          setErrorMsg('');
                          setAnswers(prev => ({ ...prev, [q.id]: e.target.value }));
                        }}
                        placeholder={q.placeholder || '자유롭게 작성해 주세요'}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    )}

                    {/* Single Choice / Consent */}
                    {(q.type === 'single_choice' || q.type === 'consent') && (
                      <div className="space-y-2 pt-1">
                        {(q.options || []).map(opt => {
                          const selectedVal =
                            typeof raw === 'string' ? raw : raw && 'value' in raw ? raw.value : '';
                          const checked = selectedVal === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={checked}
                                onChange={() => setSingleAnswer(q.id, opt)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          );
                        })}

                        {q.allowOther && (
                          <div
                            className={`p-3 rounded-xl border transition ${
                              raw && typeof raw === 'object' && 'value' in raw && raw.value === '__OTHER__'
                                ? 'bg-emerald-50 border-emerald-400'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={
                                  Boolean(
                                    raw && typeof raw === 'object' && 'value' in raw && raw.value === '__OTHER__'
                                  )
                                }
                                onChange={() =>
                                  setSingleAnswer(
                                    q.id,
                                    '__OTHER__',
                                    raw && typeof raw === 'object' && 'otherText' in raw ? raw.otherText : ''
                                  )
                                }
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm font-medium text-slate-700">{otherLabel}:</span>
                              <input
                                type="text"
                                value={
                                  raw && typeof raw === 'object' && 'otherText' in raw
                                    ? raw.otherText || ''
                                    : ''
                                }
                                onFocus={() => {
                                  if (!(raw && typeof raw === 'object' && 'value' in raw && raw.value === '__OTHER__')) {
                                    setSingleAnswer(q.id, '__OTHER__', '');
                                  }
                                }}
                                onChange={e => setOtherText(q.id, e.target.value, false)}
                                placeholder="직접 입력해 주세요"
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multi Choice */}
                    {q.type === 'multi_choice' && (
                      <div className="space-y-2 pt-1">
                        {(q.options || []).map(opt => {
                          const selectedVals =
                            raw && typeof raw === 'object' && 'values' in raw ? raw.values : [];
                          const checked = selectedVals.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMultiAnswer(q.id, opt)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          );
                        })}

                        {q.allowOther && (
                          <div className="p-3 rounded-xl border border-slate-200 bg-white">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  raw &&
                                    typeof raw === 'object' &&
                                    'values' in raw &&
                                    raw.values.includes('__OTHER__')
                                )}
                                onChange={() => toggleMultiAnswer(q.id, '__OTHER__')}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm font-medium text-slate-700">{otherLabel}:</span>
                              <input
                                type="text"
                                value={
                                  raw && typeof raw === 'object' && 'otherText' in raw
                                    ? raw.otherText || ''
                                    : ''
                                }
                                onChange={e => setOtherText(q.id, e.target.value, true)}
                                placeholder="직접 입력해 주세요"
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Matrix Single Choice */}
                    {q.type === 'matrix_single' && (
                      <div className="pt-2">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-2.5 px-3 text-left font-semibold text-slate-600">항목</th>
                                {(q.columns || []).map(col => (
                                  <th
                                    key={col}
                                    className="py-2.5 px-2 text-center font-semibold text-slate-700"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(q.rows || []).map(row => {
                                const chosen =
                                  raw && typeof raw === 'object' && 'rows' in raw ? raw.rows?.[row] : '';
                                return (
                                  <tr key={row} className="hover:bg-slate-50/70">
                                    <td className="py-3 px-3 font-semibold text-slate-800">{row}</td>
                                    {(q.columns || []).map(col => (
                                      <td key={col} className="py-3 px-2 text-center">
                                        <input
                                          type="radio"
                                          name={`q_${q.id}_${row}`}
                                          checked={chosen === col}
                                          onChange={() => setMatrixAnswer(q.id, row, col)}
                                          className="w-4 h-4 text-emerald-600 cursor-pointer"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Cards */}
                        <div className="sm:hidden space-y-3">
                          {(q.rows || []).map(row => {
                            const chosen =
                              raw && typeof raw === 'object' && 'rows' in raw ? raw.rows?.[row] : '';
                            return (
                              <div
                                key={row}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                              >
                                <div className="text-sm font-bold text-slate-800">{row}</div>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {(q.columns || []).map(col => (
                                    <label
                                      key={col}
                                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${
                                        chosen === col
                                          ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`m_q_${q.id}_${row}`}
                                        checked={chosen === col}
                                        onChange={() => setMatrixAnswer(q.id, row, col)}
                                        className="w-3.5 h-3.5 text-emerald-600"
                                      />
                                      <span>{col}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Early End Notice (consent decline or branch to __END__) */}
        {endedEarly && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            {endedByConsent
              ? '참여에 동의하지 않으셨으므로 이후 문항은 생략됩니다. 아래 제출하기 버튼을 눌러 설문을 종료해 주세요.'
              : '선택하신 응답에 따라 이후 문항이 생략되어 설문이 종료됩니다. 아래 제출하기 버튼을 눌러 완료해 주세요.'}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-base shadow-md transition"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? '제출 중...' : '설문 제출하기'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
