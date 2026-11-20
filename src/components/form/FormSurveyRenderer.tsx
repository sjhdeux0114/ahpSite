'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Send,
  ClipboardList,
  Clock,
  Lock,
  Eye,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Type,
  RotateCcw,
} from 'lucide-react';
import {
  extractSingleValue,
  FormAnswerMap,
  FormConfig,
  FormQuestion,
} from '@/lib/form/types';

export interface FormSurveyAvailability {
  isBeforeStart?: boolean;
  isExpired?: boolean;
  isFull?: boolean;
  requiresAccessCode?: boolean;
  responseCount?: number;
  startAt?: string | null;
  endAt?: string | null;
  maxResponses?: number | null;
}

interface FormSurveyRendererProps {
  slug: string;
  survey: {
    id: string;
    title: string;
    description?: string;
    status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
    formConfig: FormConfig;
    availability?: FormSurveyAvailability;
  };
  previewMode?: boolean;
  onExitPreview?: () => void;
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

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function validatePattern(val: string, pattern?: FormQuestion['validationPattern']): string | null {
  if (!val || !pattern || pattern === 'none') return null;
  if (pattern === 'email') {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    return ok ? null : '올바른 이메일 주소를 입력해 주세요.';
  }
  if (pattern === 'phone') {
    const ok = /^[0-9+\-()\s]{7,20}$/.test(val.trim());
    return ok ? null : '올바른 전화번호 형식을 입력해 주세요.';
  }
  if (pattern === 'url') {
    const ok = /^https?:\/\/.+/.test(val.trim());
    return ok ? null : 'http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요.';
  }
  return null;
}

export default function FormSurveyRenderer({
  slug,
  survey,
  previewMode = false,
  onExitPreview,
}: FormSurveyRendererProps) {
  const formConfig = survey.formConfig || { sections: [], questions: [] };
  const sections = formConfig.sections || [];
  const questions = formConfig.questions || [];
  const settings = formConfig.settings || {};
  const availability = survey.availability || {};

  const [answers, setAnswers] = useState<FormAnswerMap>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declinedByConsent, setDeclinedByConsent] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Access code gate
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [verifiedAccessCode, setVerifiedAccessCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(
    previewMode || !availability.requiresAccessCode
  );
  const [codeError, setCodeError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Large text accessibility toggle
  const [largeText, setLargeText] = useState<boolean>(Boolean(settings.defaultLargeText));

  // Section paging
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  // Stable randomized options per question
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const map: Record<string, string[]> = {};
    for (const q of questions) {
      if (q.randomizeOptions && q.options && q.options.length > 1) {
        map[q.id] = shuffleArray(q.options);
      }
    }
    setShuffledOptionsMap(map);
  }, [questions.length]);

  const getDisplayOptions = (q: FormQuestion): string[] => {
    if (q.randomizeOptions && shuffledOptionsMap[q.id]) {
      return shuffledOptionsMap[q.id];
    }
    return q.options || [];
  };

  // Duplicate check & draft load
  useEffect(() => {
    if (previewMode) return;
    try {
      if (settings.preventDuplicate) {
        const done = localStorage.getItem(`form_survey_submitted_${slug}`);
        if (done === 'true') {
          setAlreadySubmitted(true);
          return;
        }
      }
      const saved = localStorage.getItem(`form_survey_draft_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') setAnswers(parsed);
      }
    } catch {}
  }, [slug, previewMode, settings.preventDuplicate]);

  // Save draft
  useEffect(() => {
    if (submitted || previewMode) return;
    try {
      localStorage.setItem(`form_survey_draft_${slug}`, JSON.stringify(answers));
    } catch {}
  }, [slug, answers, submitted, previewMode]);

  const isQuestionAnswered = (q: FormQuestion): boolean => {
    const raw = answers[q.id];
    if (raw === undefined || raw === null) return false;
    if (
      q.type === 'short_text' ||
      q.type === 'long_text' ||
      q.type === 'number' ||
      q.type === 'date' ||
      q.type === 'time' ||
      q.type === 'dropdown'
    ) {
      return extractSingleValue(raw).trim().length > 0;
    }
    if (q.type === 'linear_scale') {
      return extractSingleValue(raw).trim().length > 0;
    }
    if (q.type === 'ranking') {
      if (typeof raw === 'object' && 'ranked' in raw && Array.isArray(raw.ranked)) {
        return raw.ranked.length > 0;
      }
      return false;
    }
    if (q.type === 'matrix_single') {
      const rows = q.rows || [];
      if (typeof raw === 'object' && 'rows' in raw) {
        return rows.every(r => Boolean(raw.rows?.[r]));
      }
      return false;
    }
    if (q.type === 'matrix_multi') {
      const rows = q.rows || [];
      if (typeof raw === 'object' && 'rowsMulti' in raw) {
        return rows.every(r => (raw.rowsMulti?.[r] || []).length > 0);
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

  const validateQuestion = (q: FormQuestion): string | null => {
    const label = q.numberLabel ? `${q.numberLabel}. ${q.title}` : q.title;
    const answered = isQuestionAnswered(q);
    if (q.required && !answered) {
      return `필수 문항에 응답해 주세요: ${label}`;
    }
    if (!answered) return null;

    const raw = answers[q.id];
    if (q.type === 'short_text' || q.type === 'long_text') {
      const text = extractSingleValue(raw).trim();
      if (q.minLength && text.length < q.minLength) {
        return `[${label}] 최소 ${q.minLength}자 이상 입력해 주세요.`;
      }
      if (q.maxLength && text.length > q.maxLength) {
        return `[${label}] 최대 ${q.maxLength}자 이하로 입력해 주세요.`;
      }
      const pErr = validatePattern(text, q.validationPattern);
      if (pErr) return `[${label}] ${pErr}`;
    }

    if (q.type === 'number') {
      const num = Number(extractSingleValue(raw));
      if (Number.isNaN(num)) {
        return `[${label}] 올바른 숫자를 입력해 주세요.`;
      }
      if (typeof q.minNumber === 'number' && num < q.minNumber) {
        return `[${label}] ${q.minNumber} 이상의 값을 입력해 주세요.`;
      }
      if (typeof q.maxNumber === 'number' && num > q.maxNumber) {
        return `[${label}] ${q.maxNumber} 이하의 값을 입력해 주세요.`;
      }
    }

    if (q.type === 'multi_choice') {
      const count =
        raw && typeof raw === 'object' && 'values' in raw && Array.isArray(raw.values)
          ? raw.values.length
          : 0;
      if (q.minSelect && count < q.minSelect) {
        return `[${label}] 최소 ${q.minSelect}개 이상 선택해 주세요.`;
      }
      if (q.maxSelect && count > q.maxSelect) {
        return `[${label}] 최대 ${q.maxSelect}개까지 선택할 수 있습니다.`;
      }
    }

    if (q.type === 'ranking' && q.required) {
      const ranked =
        raw && typeof raw === 'object' && 'ranked' in raw && Array.isArray(raw.ranked)
          ? raw.ranked
          : [];
      const expected = (q.options || []).length;
      if (ranked.length < expected) {
        return `[${label}] 모든 항목(${expected}개)의 순위를 지정해 주세요.`;
      }
    }

    return null;
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

      const selectedVal = extractSingleValue(answers[q.id]);

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

  // Active sections that contain at least 1 visible question
  const activeSections = useMemo(() => {
    return sections.filter(sec =>
      questions.some(q => q.sectionId === sec.id && visibleQuestionIds.has(q.id))
    );
  }, [sections, questions, visibleQuestionIds]);

  const isSectionPaging = settings.pagingMode === 'section' && activeSections.length > 1;
  const safeSectionIdx = Math.min(currentSectionIdx, Math.max(0, activeSections.length - 1));
  const displayedSections = isSectionPaging
    ? activeSections.slice(safeSectionIdx, safeSectionIdx + 1)
    : activeSections;

  const answeredCount = visibleQuestions.filter(isQuestionAnswered).length;
  const progressPct =
    visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;

  // Handlers
  const setTextAnswer = (qId: string, value: string) => {
    setErrorMsg('');
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const setSingleAnswer = (qId: string, value: string, otherText?: string) => {
    setErrorMsg('');
    setAnswers(prev => ({
      ...prev,
      [qId]: { value, otherText },
    }));
  };

  const toggleMultiAnswer = (qId: string, option: string, maxSelect?: number) => {
    setErrorMsg('');
    setAnswers(prev => {
      const curr = prev[qId];
      const existing =
        curr && typeof curr === 'object' && 'values' in curr && Array.isArray(curr.values)
          ? curr.values
          : [];
      const otherText =
        curr && typeof curr === 'object' && 'otherText' in curr ? curr.otherText : undefined;
      if (!existing.includes(option) && maxSelect && existing.length >= maxSelect) {
        setErrorMsg(`최대 ${maxSelect}개까지만 선택할 수 있습니다.`);
        return prev;
      }
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

  const setScaleAnswer = (qId: string, scale: number) => {
    setErrorMsg('');
    setAnswers(prev => ({ ...prev, [qId]: { scale } }));
  };

  const toggleRankingOption = (qId: string, option: string) => {
    setErrorMsg('');
    setAnswers(prev => {
      const curr = prev[qId];
      const ranked =
        curr && typeof curr === 'object' && 'ranked' in curr && Array.isArray(curr.ranked)
          ? [...curr.ranked]
          : [];
      const idx = ranked.indexOf(option);
      if (idx >= 0) {
        ranked.splice(idx, 1);
      } else {
        ranked.push(option);
      }
      return { ...prev, [qId]: { ranked } };
    });
  };

  const moveRankingItem = (qId: string, option: string, dir: -1 | 1) => {
    setAnswers(prev => {
      const curr = prev[qId];
      const ranked =
        curr && typeof curr === 'object' && 'ranked' in curr && Array.isArray(curr.ranked)
          ? [...curr.ranked]
          : [];
      const idx = ranked.indexOf(option);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= ranked.length) return prev;
      [ranked[idx], ranked[target]] = [ranked[target], ranked[idx]];
      return { ...prev, [qId]: { ranked } };
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

  const toggleMatrixMultiAnswer = (qId: string, row: string, col: string) => {
    setErrorMsg('');
    setAnswers(prev => {
      const curr = prev[qId];
      const prevRows =
        curr && typeof curr === 'object' && 'rowsMulti' in curr ? curr.rowsMulti : {};
      const existing = prevRows[row] || [];
      const next = existing.includes(col)
        ? existing.filter(c => c !== col)
        : [...existing, col];
      return {
        ...prev,
        [qId]: { rowsMulti: { ...prevRows, [row]: next } },
      };
    });
  };

  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    if (!accessCodeInput.trim()) {
      setCodeError('참여 코드를 입력해 주세요.');
      return;
    }
    setVerifyingCode(true);
    try {
      const res = await fetch(`/api/public/survey/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', accessCode: accessCodeInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setVerifiedAccessCode(accessCodeInput.trim());
        setCodeVerified(true);
      } else {
        setCodeError(data.error || '참여 코드가 올바르지 않습니다.');
      }
    } catch {
      setCodeError('네트워크 오류가 발생했습니다.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleNextSection = () => {
    setErrorMsg('');
    const currentSec = activeSections[safeSectionIdx];
    if (currentSec) {
      const secQuestions = questions.filter(
        q => q.sectionId === currentSec.id && visibleQuestionIds.has(q.id)
      );
      for (const q of secQuestions) {
        const err = validateQuestion(q);
        if (err) {
          setErrorMsg(err);
          document.getElementById(`form-q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }
    setCurrentSectionIdx(prev => Math.min(activeSections.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevSection = () => {
    setErrorMsg('');
    setCurrentSectionIdx(prev => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    for (const q of visibleQuestions) {
      const err = validateQuestion(q);
      if (err) {
        setErrorMsg(err);
        document.getElementById(`form-q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (previewMode) {
      setDeclinedByConsent(endedByConsent);
      setSubmitted(true);
      return;
    }

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
        body: JSON.stringify({
          answers: filteredAnswers,
          accessCode: verifiedAccessCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '응답 제출 중 오류가 발생했습니다.');
        setSubmitting(false);
        return;
      }
      try {
        localStorage.removeItem(`form_survey_draft_${slug}`);
        if (settings.preventDuplicate) {
          localStorage.setItem(`form_survey_submitted_${slug}`, 'true');
        }
      } catch {}
      setDeclinedByConsent(endedByConsent);
      setSubmitted(true);
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // Non-active / Schedule / Full / Duplicate / Access Code Gates
  if (!previewMode && survey.status !== 'ACTIVE') {
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

  if (!previewMode && availability.isBeforeStart) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <Clock className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">아직 설문 시작 전입니다</h1>
          <p className="text-sm text-slate-500">
            {availability.startAt
              ? `시작 일시: ${new Date(availability.startAt).toLocaleString('ko-KR')}`
              : '곧 응답 참여가 시작됩니다.'}
          </p>
        </div>
      </div>
    );
  }

  if (!previewMode && (availability.isExpired || availability.isFull)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">설문이 마감되었습니다</h1>
          <p className="text-sm text-slate-500">
            {availability.isFull
              ? '목표 응답 인원에 도달하여 설문이 마감되었습니다.'
              : '설문 참여 기간이 종료되었습니다.'}
          </p>
        </div>
      </div>
    );
  }

  if (!previewMode && alreadySubmitted) {
    return (
      <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-emerald-200 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">이미 참여하셨습니다</h1>
          <p className="text-sm text-slate-500">이 설문은 1회만 참여할 수 있습니다. 감사합니다.</p>
        </div>
      </div>
    );
  }

  if (!codeVerified) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-6">
        <form
          onSubmit={handleVerifyAccessCode}
          className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">{survey.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              참여 코드를 입력해야 설문에 응답할 수 있습니다.
            </p>
          </div>
          <input
            type="password"
            value={accessCodeInput}
            onChange={e => setAccessCodeInput(e.target.value)}
            placeholder="참여 코드 입력"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {codeError && <p className="text-xs text-rose-600 font-semibold">{codeError}</p>}
          <button
            type="submit"
            disabled={verifyingCode}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition"
          >
            {verifyingCode ? '확인 중...' : '설문 시작하기'}
          </button>
        </form>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-3xl border border-emerald-200 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {declinedByConsent ? '설문이 종료되었습니다' : '응답이 제출되었습니다'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {declinedByConsent
              ? '참여에 동의하지 않으셔서 설문이 종료되었습니다. 응답해 주셔서 감사합니다.'
              : settings.thankYouMessage?.trim() ||
                '소중한 응답에 진심으로 감사드립니다. 제출하신 내용은 안전하게 저장되었습니다.'}
          </p>
          {previewMode && (
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setCurrentSectionIdx(0);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>미리보기 다시 테스트</span>
              </button>
              {onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  미리보기 닫기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const textSizeQ = largeText ? 'text-lg sm:text-xl' : 'text-base';
  const textSizeOpt = largeText ? 'text-base sm:text-lg' : 'text-sm';
  const paddingOpt = largeText ? 'p-4' : 'p-3';

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6">
      {previewMode && (
        <div className="max-w-3xl mx-auto mb-4 px-4 py-3 rounded-2xl bg-indigo-900 text-white flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Eye className="w-4 h-4 text-indigo-300" />
            <span>미리보기 모드입니다. 제출해도 실제 응답은 저장되지 않습니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setCurrentSectionIdx(0);
                setErrorMsg('');
              }}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold"
            >
              초기화
            </button>
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="px-3 py-1 rounded-lg bg-white text-indigo-900 text-xs font-bold"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
        {/* Header Card */}
        <div className="bg-white rounded-3xl border-t-8 border-t-emerald-600 border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {formConfig.subtitle ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {formConfig.subtitle}
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" />
                  설문조사
                </span>
              )}
              {formConfig.meta && (
                <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formConfig.meta}
                </span>
              )}
            </div>

            {settings.allowLargeTextToggle !== false && (
              <button
                type="button"
                onClick={() => setLargeText(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  largeText
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>{largeText ? '기본 글씨' : '큰 글씨 모드'}</span>
              </button>
            )}
          </div>

          <h1 className={`${largeText ? 'text-3xl' : 'text-2xl sm:text-3xl'} font-extrabold text-slate-900 mb-3`}>
            {survey.title}
          </h1>
          {survey.description && (
            <p className={`${largeText ? 'text-base' : 'text-sm'} text-slate-600 leading-relaxed whitespace-pre-line`}>
              {survey.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {isSectionPaging
                  ? `섹션 ${safeSectionIdx + 1} / ${activeSections.length}`
                  : `응답 진행률 (${answeredCount} / ${visibleQuestions.length}문항)`}
              </span>
              <span className="font-bold text-emerald-700">{progressPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>* 표시는 필수 응답 문항입니다.</span>
            <span>임시저장 자동 지원</span>
          </div>
        </div>

        {/* Sections & Questions */}
        {displayedSections.map(sec => {
          const secQuestions = questions.filter(
            q => q.sectionId === sec.id && visibleQuestionIds.has(q.id)
          );
          if (secQuestions.length === 0) return null;

          return (
            <div key={sec.id} className="space-y-4">
              {/* Section Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
                <h2 className={`${largeText ? 'text-xl' : 'text-lg'} font-extrabold text-slate-900`}>
                  {sec.title}
                </h2>
                {sec.description && (
                  <p className={`${largeText ? 'text-base' : 'text-sm'} text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line`}>
                    {sec.description}
                  </p>
                )}
              </div>

              {/* Question Cards */}
              {secQuestions.map(q => {
                const raw = answers[q.id];
                const otherLabel = q.otherLabel || '기타';
                const displayOptions = getDisplayOptions(q);

                return (
                  <div
                    key={q.id}
                    id={`form-q-${q.id}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4"
                  >
                    <div>
                      <div className="flex items-start gap-2">
                        {q.numberLabel && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold shrink-0 mt-0.5">
                            {q.numberLabel}
                          </span>
                        )}
                        <h3 className={`${textSizeQ} font-bold text-slate-900 leading-snug`}>
                          {q.title}
                          {q.required && <span className="text-rose-500 ml-1">*</span>}
                        </h3>
                      </div>
                      {q.description && (
                        <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-line">
                          {q.description}
                        </p>
                      )}
                      {q.type === 'multi_choice' && (q.minSelect || q.maxSelect) && (
                        <p className="text-xs text-emerald-700 font-semibold mt-1">
                          {q.minSelect ? `최소 ${q.minSelect}개` : ''}
                          {q.minSelect && q.maxSelect ? ' ~ ' : ''}
                          {q.maxSelect ? `최대 ${q.maxSelect}개` : ''} 선택 가능
                        </p>
                      )}
                    </div>

                    {/* Short Text */}
                    {q.type === 'short_text' && (
                      <input
                        type="text"
                        value={extractSingleValue(raw)}
                        onChange={e => setTextAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder || '답변을 입력해 주세요'}
                        maxLength={q.maxLength || undefined}
                        className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${textSizeOpt} transition`}
                      />
                    )}

                    {/* Long Text */}
                    {q.type === 'long_text' && (
                      <textarea
                        rows={4}
                        value={extractSingleValue(raw)}
                        onChange={e => setTextAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder || '자유롭게 의견을 작성해 주세요'}
                        maxLength={q.maxLength || undefined}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${textSizeOpt} transition`}
                      />
                    )}

                    {/* Number */}
                    {q.type === 'number' && (
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          type="number"
                          value={extractSingleValue(raw)}
                          min={q.minNumber}
                          max={q.maxNumber}
                          onChange={e => setTextAnswer(q.id, e.target.value)}
                          placeholder={q.placeholder || '숫자 입력'}
                          className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none ${textSizeOpt}`}
                        />
                        {q.unit && <span className="text-sm font-semibold text-slate-600 shrink-0">{q.unit}</span>}
                      </div>
                    )}

                    {/* Date */}
                    {q.type === 'date' && (
                      <input
                        type="date"
                        value={extractSingleValue(raw)}
                        onChange={e => setTextAnswer(q.id, e.target.value)}
                        className={`max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none ${textSizeOpt}`}
                      />
                    )}

                    {/* Time */}
                    {q.type === 'time' && (
                      <input
                        type="time"
                        value={extractSingleValue(raw)}
                        onChange={e => setTextAnswer(q.id, e.target.value)}
                        className={`max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none ${textSizeOpt}`}
                      />
                    )}

                    {/* Dropdown */}
                    {q.type === 'dropdown' && (
                      <select
                        value={extractSingleValue(raw)}
                        onChange={e => setTextAnswer(q.id, e.target.value)}
                        className={`w-full max-w-md px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none ${textSizeOpt}`}
                      >
                        <option value="">선택해 주세요</option>
                        {displayOptions.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Linear Scale (Likert) */}
                    {q.type === 'linear_scale' && (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                          {Array.from(
                            { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                            (_, i) => (q.scaleMin ?? 1) + i
                          ).map(num => {
                            const selected = Number(extractSingleValue(raw)) === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setScaleAnswer(q.id, num)}
                                className={`flex-1 min-w-[44px] py-3 rounded-xl border font-bold transition ${
                                  selected
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                } ${textSizeOpt}`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                        {(q.scaleMinLabel || q.scaleMaxLabel) && (
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                            <span>{q.scaleMinLabel || ''}</span>
                            <span>{q.scaleMaxLabel || ''}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ranking */}
                    {q.type === 'ranking' && (
                      <div className="space-y-2.5">
                        <p className="text-xs text-slate-500">
                          원하는 항목을 순서대로 클릭해 1위부터 순위를 매기세요. (화살표로 순서 조정 가능)
                        </p>
                        {(() => {
                          const ranked: string[] =
                            raw && typeof raw === 'object' && 'ranked' in raw && Array.isArray(raw.ranked)
                              ? raw.ranked
                              : [];
                          return (
                            <div className="space-y-2">
                              {displayOptions.map(opt => {
                                const rankIdx = ranked.indexOf(opt);
                                const isRanked = rankIdx >= 0;
                                return (
                                  <div
                                    key={opt}
                                    className={`flex items-center justify-between gap-3 ${paddingOpt} rounded-xl border transition ${
                                      isRanked
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleRankingOption(q.id, opt)}
                                      className="flex items-center gap-3 flex-1 text-left"
                                    >
                                      <span
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                          isRanked
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                      >
                                        {isRanked ? `${rankIdx + 1}위` : '-'}
                                      </span>
                                      <span className={`${textSizeOpt} font-medium`}>{opt}</span>
                                    </button>
                                    {isRanked && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          disabled={rankIdx === 0}
                                          onClick={() => moveRankingItem(q.id, opt, -1)}
                                          className="p-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 disabled:opacity-30"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={rankIdx === ranked.length - 1}
                                          onClick={() => moveRankingItem(q.id, opt, 1)}
                                          className="p-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 disabled:opacity-30"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Single Choice & Consent */}
                    {(q.type === 'single_choice' || q.type === 'consent') && (
                      <div className="space-y-2">
                        {displayOptions.map(opt => {
                          const currentVal = extractSingleValue(raw);
                          const checked = currentVal === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 ${paddingOpt} rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
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
                              <span className={textSizeOpt}>{opt}</span>
                            </label>
                          );
                        })}

                        {q.allowOther && (
                          <div
                            className={`${paddingOpt} rounded-xl border transition ${
                              extractSingleValue(raw) === '__OTHER__'
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={extractSingleValue(raw) === '__OTHER__'}
                                onChange={() =>
                                  setSingleAnswer(
                                    q.id,
                                    '__OTHER__',
                                    raw && typeof raw === 'object' && 'otherText' in raw
                                      ? raw.otherText
                                      : ''
                                  )
                                }
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className={`${textSizeOpt} font-medium text-slate-700`}>{otherLabel}:</span>
                              <input
                                type="text"
                                value={
                                  raw && typeof raw === 'object' && 'otherText' in raw
                                    ? raw.otherText || ''
                                    : ''
                                }
                                onFocus={() => {
                                  if (extractSingleValue(raw) !== '__OTHER__') {
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
                      <div className="space-y-2">
                        {displayOptions.map(opt => {
                          const selectedValues =
                            raw && typeof raw === 'object' && 'values' in raw && Array.isArray(raw.values)
                              ? raw.values
                              : [];
                          const checked = selectedValues.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 ${paddingOpt} rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMultiAnswer(q.id, opt, q.maxSelect)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className={textSizeOpt}>{opt}</span>
                            </label>
                          );
                        })}

                        {q.allowOther && (
                          <div className={`${paddingOpt} rounded-xl border border-slate-200 bg-white`}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  raw &&
                                    typeof raw === 'object' &&
                                    'values' in raw &&
                                    raw.values.includes('__OTHER__')
                                )}
                                onChange={() => toggleMultiAnswer(q.id, '__OTHER__', q.maxSelect)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className={`${textSizeOpt} font-medium text-slate-700`}>{otherLabel}:</span>
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

                    {/* Matrix Single / Multi Choice */}
                    {(q.type === 'matrix_single' || q.type === 'matrix_multi') && (
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
                                const singleChosen =
                                  raw && typeof raw === 'object' && 'rows' in raw ? raw.rows?.[row] : '';
                                const multiChosen =
                                  raw && typeof raw === 'object' && 'rowsMulti' in raw
                                    ? raw.rowsMulti?.[row] || []
                                    : [];
                                return (
                                  <tr key={row} className="hover:bg-slate-50/70">
                                    <td className="py-3 px-3 font-semibold text-slate-800">{row}</td>
                                    {(q.columns || []).map(col => (
                                      <td key={col} className="py-3 px-2 text-center">
                                        {q.type === 'matrix_single' ? (
                                          <input
                                            type="radio"
                                            name={`q_${q.id}_${row}`}
                                            checked={singleChosen === col}
                                            onChange={() => setMatrixAnswer(q.id, row, col)}
                                            className="w-4 h-4 text-emerald-600 cursor-pointer"
                                          />
                                        ) : (
                                          <input
                                            type="checkbox"
                                            checked={multiChosen.includes(col)}
                                            onChange={() => toggleMatrixMultiAnswer(q.id, row, col)}
                                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                                          />
                                        )}
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
                            const singleChosen =
                              raw && typeof raw === 'object' && 'rows' in raw ? raw.rows?.[row] : '';
                            const multiChosen =
                              raw && typeof raw === 'object' && 'rowsMulti' in raw
                                ? raw.rowsMulti?.[row] || []
                                : [];
                            return (
                              <div
                                key={row}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                              >
                                <div className="text-sm font-bold text-slate-800">{row}</div>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {(q.columns || []).map(col => {
                                    const checked =
                                      q.type === 'matrix_single'
                                        ? singleChosen === col
                                        : multiChosen.includes(col);
                                    return (
                                      <label
                                        key={col}
                                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${
                                          checked
                                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900'
                                            : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <input
                                          type={q.type === 'matrix_single' ? 'radio' : 'checkbox'}
                                          name={q.type === 'matrix_single' ? `m_q_${q.id}_${row}` : undefined}
                                          checked={checked}
                                          onChange={() =>
                                            q.type === 'matrix_single'
                                              ? setMatrixAnswer(q.id, row, col)
                                              : toggleMatrixMultiAnswer(q.id, row, col)
                                          }
                                          className="w-3.5 h-3.5 text-emerald-600"
                                        />
                                        <span>{col}</span>
                                      </label>
                                    );
                                  })}
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

        {/* Early End Notice */}
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

        {/* Navigation / Submit Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 pb-10">
          {isSectionPaging && safeSectionIdx > 0 ? (
            <button
              type="button"
              onClick={handlePrevSection}
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전 섹션</span>
            </button>
          ) : (
            <div />
          )}

          {isSectionPaging && safeSectionIdx < activeSections.length - 1 && !endedEarly ? (
            <button
              type="button"
              onClick={handleNextSection}
              className="inline-flex items-center gap-1.5 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md transition"
            >
              <span>다음 섹션</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-base shadow-md transition"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? '제출 중...' : previewMode ? '미리보기 제출 테스트' : '설문 제출하기'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
