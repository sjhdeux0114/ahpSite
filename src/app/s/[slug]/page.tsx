'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  checkRealtimeConsistency,
  RealtimeConsistencyCheck,
} from '@/lib/ahp/consistency';
import PairwiseItem, { PairItemData } from '@/components/ahp/PairwiseItem';
import ConsistencyTracker, { TrackerTab } from '@/components/ahp/ConsistencyTracker';
import ConsistencyAlertModal from '@/components/ahp/ConsistencyAlertModal';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';

interface CriterionData extends PairItemData {
  subcriteria?: PairItemData[];
}

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  criteria: CriterionData[];
  alternatives: PairItemData[];
  hasAlternatives: boolean;
  hasSubcriteria?: boolean;
  demographics?: Array<{
    id: string;
    title: string;
    type: 'select' | 'text';
    options: string[];
    required: boolean;
  }>;
}

export default function PublicSurveyPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Respondent info
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');

  // Demographic answers: { [questionId]: "선택값 또는 입력값" }
  const [demographicAnswers, setDemographicAnswers] = useState<Record<string, string>>({});

  // Answers state
  // criteriaAnswers: { "crit1_crit2": 3, ... }
  const [criteriaAnswers, setCriteriaAnswers] = useState<Record<string, number>>({});

  // subAnswers: { [critId]: { "sub1_sub2": 3, ... } }
  const [subAnswers, setSubAnswers] = useState<Record<string, Record<string, number>>>({});
  const [activeSubCritIndex, setActiveSubCritIndex] = useState<number>(0);

  // alternativeAnswers: { [criterionId]: { "alt1_alt2": 3, ... } }
  const [altAnswers, setAltAnswers] = useState<Record<string, Record<string, number>>>({});
  const [activeAltCritIndex, setActiveAltCritIndex] = useState<number>(0);

  // Active tracker tab: 'criteria' or 'sub_{critId}' or 'alt_{critId}'
  const [activeTrackerTabId, setActiveTrackerTabId] = useState<string>('criteria');

  // Modal alert state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentModalCheck, setCurrentModalCheck] = useState<RealtimeConsistencyCheck | null>(null);
  const [alertDismissedKeys, setAlertDismissedKeys] = useState<Set<string>>(new Set());

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`/api/public/survey/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setSurvey(data.survey);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  // Real-time consistency calculation for criteria
  const criteriaConsistency = useMemo(() => {
    if (!survey || !survey.criteria) return null;
    return checkRealtimeConsistency(survey.criteria, criteriaAnswers);
  }, [survey, criteriaAnswers]);

  // Real-time consistency for all subcriteria matrices
  const subConsistencies = useMemo(() => {
    if (!survey || !survey.criteria) return {};
    const map: Record<string, RealtimeConsistencyCheck> = {};
    survey.criteria.forEach(crit => {
      const subs = crit.subcriteria || [];
      if (subs.length >= 2) {
        map[crit.id] = checkRealtimeConsistency(subs, subAnswers[crit.id] || {});
      }
    });
    return map;
  }, [survey, subAnswers]);

  // Real-time consistency for all alternative matrices
  const altConsistencies = useMemo(() => {
    if (!survey || !survey.hasAlternatives || !survey.alternatives || survey.alternatives.length < 2) {
      return {};
    }
    const map: Record<string, RealtimeConsistencyCheck> = {};
    survey.criteria.forEach(crit => {
      map[crit.id] = checkRealtimeConsistency(survey.alternatives, altAnswers[crit.id] || {});
    });
    return map;
  }, [survey, altAnswers]);

  // Current active subcriteria criterion
  const criteriaWithSub = useMemo(() => {
    return (survey?.criteria || []).filter(c => (c.subcriteria || []).length >= 2);
  }, [survey]);

  const currentSubCrit = criteriaWithSub[activeSubCritIndex] || criteriaWithSub[0];
  const currentSubConsistency = currentSubCrit ? subConsistencies[currentSubCrit.id] : null;

  // Current active alternative criterion
  const currentAltCrit = survey?.criteria?.[activeAltCritIndex];
  const currentAltConsistency = currentAltCrit ? altConsistencies[currentAltCrit.id] : null;

  // Multi-step Tracker Tabs (Step 1 Criteria + Step 2 Subcriteria + Step 3 Alternatives)
  const trackerTabs = useMemo(() => {
    if (!survey || !criteriaConsistency) return [];
    const hasAnySubs = criteriaWithSub.length > 0;

    const list: TrackerTab[] = [
      {
        id: 'criteria',
        title: '1단계: 대분류 간 쌍대비교',
        shortTitle: '1단계: 대분류',
        check: criteriaConsistency,
      },
    ];

    // Subcriteria tabs
    if (hasAnySubs) {
      criteriaWithSub.forEach((crit, idx) => {
        const subs = crit.subcriteria || [];
        const check = subConsistencies[crit.id] || {
          totalPairs: (subs.length * (subs.length - 1)) / 2,
          answeredPairs: 0,
          isComplete: false,
          cr: 0,
          status: 'EXCELLENT' as const,
          isAcceptable: true,
          triadViolations: [],
          worstInconsistency: null,
          message: '',
        };
        list.push({
          id: `sub_${crit.id}`,
          title: `2단계: [${crit.name}] 세부영역 간 쌍대비교`,
          shortTitle: `2-${idx + 1}: ${crit.name}`,
          check,
        });
      });
    }

    // Alternatives tabs
    if (survey.hasAlternatives && survey.alternatives.length > 1) {
      const stepNum = hasAnySubs ? '3' : '2';
      survey.criteria.forEach((crit, idx) => {
        const check = altConsistencies[crit.id] || {
          totalPairs: (survey.alternatives.length * (survey.alternatives.length - 1)) / 2,
          answeredPairs: 0,
          isComplete: false,
          cr: 0,
          status: 'EXCELLENT' as const,
          isAcceptable: true,
          triadViolations: [],
          worstInconsistency: null,
          message: '',
        };
        list.push({
          id: `alt_${crit.id}`,
          title: `${stepNum}단계: [${crit.name}] 관점 대안 간 쌍대비교`,
          shortTitle: `${stepNum}-${idx + 1}: 대안`,
          check,
        });
      });
    }

    return list;
  }, [survey, criteriaConsistency, criteriaWithSub, subConsistencies, altConsistencies]);

  const handleSelectTrackerTab = (tabId: string) => {
    setActiveTrackerTabId(tabId);
    if (tabId === 'criteria') {
      document.getElementById('section-criteria')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tabId.startsWith('sub_')) {
      const critId = tabId.replace('sub_', '');
      const idx = criteriaWithSub.findIndex(c => c.id === critId);
      if (idx >= 0) {
        setActiveSubCritIndex(idx);
      }
      document.getElementById('section-subcriteria')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tabId.startsWith('alt_') || survey?.criteria.some(c => c.id === tabId)) {
      const critId = tabId.replace('alt_', '');
      const idx = survey?.criteria?.findIndex(c => c.id === critId);
      if (idx !== undefined && idx >= 0) {
        setActiveAltCritIndex(idx);
      }
      document.getElementById('section-alternatives')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle Criteria answer change
  const handleCriteriaChange = (pairKey: string, val: number) => {
    setActiveTrackerTabId('criteria');
    const updated = { ...criteriaAnswers, [pairKey]: val };
    setCriteriaAnswers(updated);

    if (survey) {
      const check = checkRealtimeConsistency(survey.criteria, updated);
      // Trigger warning modal if triad violation occurs or CR > 0.10 and not yet dismissed for this key
      const isSevere = check.triadViolations.length > 0 || (check.cr > 0.10 && check.answeredPairs >= 3);
      if (isSevere && !alertDismissedKeys.has(pairKey)) {
        setCurrentModalCheck(check);
        setModalOpen(true);
        setAlertDismissedKeys(prev => new Set(prev).add(pairKey));
      }
    }
  };

  // Handle Subcriteria answer change
  const handleSubChange = (critId: string, pairKey: string, val: number) => {
    setActiveTrackerTabId(`sub_${critId}`);
    const critMap = { ...(subAnswers[critId] || {}), [pairKey]: val };
    const updated = { ...subAnswers, [critId]: critMap };
    setSubAnswers(updated);

    const crit = survey?.criteria.find(c => c.id === critId);
    if (crit && crit.subcriteria) {
      const check = checkRealtimeConsistency(crit.subcriteria, critMap);
      const isSevere = check.triadViolations.length > 0 || (check.cr > 0.10 && check.answeredPairs >= 3);
      const stateKey = `sub_${critId}_${pairKey}`;
      if (isSevere && !alertDismissedKeys.has(stateKey)) {
        setCurrentModalCheck(check);
        setModalOpen(true);
        setAlertDismissedKeys(prev => new Set(prev).add(stateKey));
      }
    }
  };

  // Handle Alternative answer change
  const handleAltChange = (critId: string, pairKey: string, val: number) => {
    setActiveTrackerTabId(`alt_${critId}`);
    const critMap = { ...(altAnswers[critId] || {}), [pairKey]: val };
    const updated = { ...altAnswers, [critId]: critMap };
    setAltAnswers(updated);

    if (survey) {
      const check = checkRealtimeConsistency(survey.alternatives, critMap);
      const isSevere = check.triadViolations.length > 0 || (check.cr > 0.10 && check.answeredPairs >= 3);
      const stateKey = `alt_${critId}_${pairKey}`;
      if (isSevere && !alertDismissedKeys.has(stateKey)) {
        setCurrentModalCheck(check);
        setModalOpen(true);
        setAlertDismissedKeys(prev => new Set(prev).add(stateKey));
      }
    }
  };

  // Scroll to offending element
  const handleScrollToOffender = (pairKey: string) => {
    const el = document.getElementById(`pair-card-${pairKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Generate pair items list for criteria
  const criteriaPairs = useMemo(() => {
    if (!survey || !survey.criteria) return [];
    const pairs: Array<{ itemA: PairItemData; itemB: PairItemData; key: string }> = [];
    const n = survey.criteria.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          itemA: survey.criteria[i],
          itemB: survey.criteria[j],
          key: `${survey.criteria[i].id}_${survey.criteria[j].id}`,
        });
      }
    }
    return pairs;
  }, [survey]);

  // Generate pair items list for currently selected subcriteria criterion
  const currentSubPairs = useMemo(() => {
    if (!currentSubCrit || !currentSubCrit.subcriteria) return [];
    const subs = currentSubCrit.subcriteria;
    const pairs: Array<{ itemA: PairItemData; itemB: PairItemData; key: string }> = [];
    const k = subs.length;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        pairs.push({
          itemA: subs[i],
          itemB: subs[j],
          key: `${subs[i].id}_${subs[j].id}`,
        });
      }
    }
    return pairs;
  }, [currentSubCrit]);

  // Generate pair items list for alternatives
  const altPairs = useMemo(() => {
    if (!survey || !survey.alternatives) return [];
    const pairs: Array<{ itemA: PairItemData; itemB: PairItemData; key: string }> = [];
    const m = survey.alternatives.length;
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        pairs.push({
          itemA: survey.alternatives[i],
          itemB: survey.alternatives[j],
          key: `${survey.alternatives[i].id}_${survey.alternatives[j].id}`,
        });
      }
    }
    return pairs;
  }, [survey]);

  // Submission handler
  const handleSubmit = async () => {
    setSubmitError('');

    // Check completion of criteria
    if (criteriaPairs.length > Object.keys(criteriaAnswers).length) {
      setSubmitError('대분류 평가 기준 쌍대비교의 모든 문항에 응답해 주세요.');
      return;
    }

    // Check completion of subcriteria (if any)
    if (criteriaWithSub.length > 0) {
      for (const crit of criteriaWithSub) {
        const subs = crit.subcriteria || [];
        const expectedPairs = (subs.length * (subs.length - 1)) / 2;
        const ansCount = Object.keys(subAnswers[crit.id] || {}).length;
        if (ansCount < expectedPairs) {
          setSubmitError(`대분류 '${crit.name}'의 하위 세부영역 쌍대비교 문항에 모두 응답해 주세요.`);
          return;
        }
      }
    }

    // Check completion of alternatives
    if (survey?.hasAlternatives && survey.alternatives.length > 1) {
      for (const crit of survey.criteria) {
        const answersForCrit = altAnswers[crit.id] || {};
        if (altPairs.length > Object.keys(answersForCrit).length) {
          setSubmitError(`'${crit.name}' 기준 하위 대안 쌍대비교 문항에 모두 응답해 주세요.`);
          return;
        }
      }
    }

    // Check completion of required demographics
    if (survey?.demographics && survey.demographics.length > 0) {
      for (const demo of survey.demographics) {
        if (demo.required && !demographicAnswers[demo.id]) {
          setSubmitError(`인적사항 문항 중 '${demo.title}' 항목에 응답해 주세요.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/survey/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondentName: respondentName.trim() || undefined,
          respondentEmail: respondentEmail.trim() || undefined,
          demographics: demographicAnswers,
          answers: {
            criteria: criteriaAnswers,
            subcriteria: subAnswers,
            alternatives: altAnswers,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || '제출에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      setSubmitResult(data.crResults);
      setSubmitted(true);
    } catch {
      setSubmitError('서버와의 통신에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">AHP 설문지를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (notFound || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">설문을 찾을 수 없습니다</h2>
          <p className="text-sm text-slate-500">
            링크 주소를 다시 확인해 주시거나 설문 배포자에게 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // Survey is closed check
  if (survey.status === 'CLOSED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-5">
            <FileCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">배포가 종료된 설문입니다</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            '{survey.title}' 설문의 응답 수집이 마감되었습니다. 참여해 주셔서 감사합니다.
          </p>
          <div className="text-xs text-slate-400">AHP Decision Hub</div>
        </div>
      </div>
    );
  }

  // Submitted Thank you screen
  if (submitted) {
    const isPassing = submitResult?.isConsistent;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-lg w-full text-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">응답이 성공적으로 제출되었습니다!</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            소중한 의사결정 설문에 참여해 주셔서 진심으로 감사드립니다.
          </p>

          {/* Consistency feedback badge */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              응답 신뢰도 분석 결과
            </p>
            <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">평가 기준 일관성 비율(CR):</span>
              <span className="font-bold text-slate-900">
                {submitResult?.criteriaCR?.toFixed(4) ?? '0.0000'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2">
              <span className="text-slate-600">종합 신뢰성 판정:</span>
              <span className={`font-bold ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isPassing ? '✅ 신뢰 기준 충족 (CR ≤ 0.10)' : '⚠️ 일관성 주의'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400">AHP Decision Hub Powered by Saaty Method</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 shadow-xs py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span>AHP Decision Survey</span>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-full border border-indigo-100">
            실시간 일관성 검증 모드 활성
          </span>
        </div>
      </header>

      {/* Sticky Real-time Consistency Tracker (Supports Step 1 & all Step 2 Matrices) */}
      {trackerTabs.length > 0 && (
        <ConsistencyTracker
          tabs={trackerTabs}
          activeTabId={activeTrackerTabId}
          onSelectTab={handleSelectTrackerTab}
        />
      )}

      {/* Main Form Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Survey Title & Instructions Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              {survey.description}
            </p>
          )}

          {/* Saaty Scale Guide Box */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs sm:text-sm text-indigo-950">
            <h3 className="font-bold flex items-center gap-1.5 mb-1.5 text-indigo-900">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              쌍대비교(Pairwise Comparison) 응답 방법 안내
            </h3>
            <p className="text-indigo-800 leading-relaxed text-xs">
              제시된 두 항목 중 더 중요하다고 판단되는 항목 방향의 척도(1=동등, 3=약간 중요, 5=확실히 중요, 7=매우 중요, 9=절대적 중요)를 선택해 주세요.
              <br />
              <strong>💡 실시간 일관성 검사:</strong> 상단 게이지 바를 통해 1단계 평가 기준과 2단계 대안별 일관성(CR)을 실시간으로 전환하며 확인하실 수 있습니다.
            </p>
          </div>

          {/* Optional Respondent Info */}
          <div className="grid sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                응답자 이름 / 닉네임 (선택)
              </label>
              <input
                type="text"
                value={respondentName}
                onChange={e => setRespondentName(e.target.value)}
                placeholder="익명 제출 가능 (예: 홍길동)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                이메일 주소 (선택)
              </label>
              <input
                type="email"
                value={respondentEmail}
                onChange={e => setRespondentEmail(e.target.value)}
                placeholder="결과 공유 수신용 (선택)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* ================= SECTION 0: DEMOGRAPHICS ================= */}
        {survey.demographics && survey.demographics.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                i
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  응답자 인적사항 (프로필)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  통계 집계 및 분석을 위해 각 질문에 응답해 주세요.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {survey.demographics.map(demo => (
                <div key={demo.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    {demo.title} {demo.required && <span className="text-rose-500">*</span>}
                  </label>

                  {demo.type === 'select' ? (
                    <div className="flex flex-wrap gap-1.5">
                      {demo.options.map(opt => {
                        const isSelected = demographicAnswers[demo.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setDemographicAnswers(prev => ({ ...prev, [demo.id]: opt }))
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={demographicAnswers[demo.id] || ''}
                      onChange={e =>
                        setDemographicAnswers(prev => ({ ...prev, [demo.id]: e.target.value }))
                      }
                      placeholder="답변을 입력하세요"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION 1: CRITERIA PAIRWISE ================= */}
        <div id="section-criteria" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              1
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              평가 기준(Criteria) 간 중요도 비교
            </h2>
          </div>

          <div className="space-y-4">
            {criteriaPairs.map(pair => {
              const val = criteriaAnswers[pair.key];
              const isWorst =
                criteriaConsistency?.worstInconsistency?.itemA.id === pair.itemA.id &&
                criteriaConsistency?.worstInconsistency?.itemB.id === pair.itemB.id;

              return (
                <div key={pair.key} id={`pair-card-${pair.key}`}>
                  <PairwiseItem
                    itemA={pair.itemA}
                    itemB={pair.itemB}
                    pairKey={pair.key}
                    value={val}
                    onChange={handleCriteriaChange}
                    isWorstOffender={isWorst}
                    recommendedText={criteriaConsistency?.worstInconsistency?.recommendedRatingLabel}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 2: SUBCRITERIA PAIRWISE ================= */}
        {criteriaWithSub.length > 0 && (
          <div id="section-subcriteria" className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                2
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  대분류별 하위 세부영역(Sub-criteria) 간 중요도 비교
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 대분류 내에 속한 세부영역들 사이의 상대적 중요도를 1:1로 비교해 주세요.
                </p>
              </div>
            </div>

            {/* Tabs for each criterion with subcriteria */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {criteriaWithSub.map((crit, idx) => {
                const isActive = activeSubCritIndex === idx;
                const subs = crit.subcriteria || [];
                const totalPairsForSub = (subs.length * (subs.length - 1)) / 2;
                const ansCount = Object.keys(subAnswers[crit.id] || {}).length;
                const isDone = ansCount === totalPairsForSub && totalPairsForSub > 0;
                const critCheck = subConsistencies[crit.id];

                return (
                  <button
                    key={crit.id}
                    type="button"
                    onClick={() => {
                      setActiveSubCritIndex(idx);
                      setActiveTrackerTabId(`sub_${crit.id}`);
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-2 ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{crit.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-purple-700 text-white'
                          : isDone
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ansCount}/{totalPairsForSub}
                    </span>
                    {critCheck && critCheck.answeredPairs >= 3 && (
                      <span className={`text-[10px] font-mono ${critCheck.isAcceptable ? 'text-emerald-300' : 'text-rose-300'}`}>
                        (CR {critCheck.cr.toFixed(2)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Active Criterion Subcriteria Header */}
            {currentSubCrit && (
              <div className="bg-purple-50/80 p-4 rounded-2xl mb-4 border border-purple-100">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-0.5">
                  현재 평가 대분류
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  [{currentSubCrit.name}] 하위 세부영역 간 쌍대비교
                </h3>
                {currentSubCrit.description && (
                  <p className="text-xs text-slate-600 mt-1">{currentSubCrit.description}</p>
                )}
                {currentSubConsistency && (
                  <div className="mt-2 text-xs flex items-center gap-2 font-medium">
                    <span className="text-slate-500">현재 세부영역 CR:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        currentSubConsistency.isAcceptable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      CR {currentSubConsistency.cr.toFixed(3)}
                    </span>
                    <span className="text-slate-400">
                      ({Object.keys(subAnswers[currentSubCrit.id] || {}).length}/{currentSubPairs.length} 완료)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Subcriteria Pairwise Cards */}
            <div className="space-y-4">
              {currentSubPairs.map(pair => {
                const val = (subAnswers[currentSubCrit?.id || ''] || {})[pair.key];
                const isWorst =
                  currentSubConsistency?.worstInconsistency?.itemA.id === pair.itemA.id &&
                  currentSubConsistency?.worstInconsistency?.itemB.id === pair.itemB.id;

                return (
                  <div key={pair.key} id={`pair-card-${pair.key}`}>
                    <PairwiseItem
                      itemA={pair.itemA}
                      itemB={pair.itemB}
                      pairKey={pair.key}
                      value={val}
                      onChange={(k, v) => handleSubChange(currentSubCrit!.id, k, v)}
                      isWorstOffender={isWorst}
                      recommendedText={currentSubConsistency?.worstInconsistency?.recommendedRatingLabel}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= SECTION 3: ALTERNATIVES PAIRWISE (IF ENABLED) ================= */}
        {survey.hasAlternatives && survey.alternatives.length > 1 && (
          <div id="section-alternatives" className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {criteriaWithSub.length > 0 ? '3' : '2'}
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  각 평가 기준별 대안(Alternatives) 간 비교
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  해당 기준의 관점에서 대안들을 1:1로 비교해 주세요.
                </p>
              </div>
            </div>

            {/* Tabs for each criterion */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {survey.criteria.map((crit, idx) => {
                const isActive = activeAltCritIndex === idx;
                const ansCount = Object.keys(altAnswers[crit.id] || {}).length;
                const isDone = ansCount === altPairs.length && altPairs.length > 0;
                const critCheck = altConsistencies[crit.id];

                return (
                  <button
                    key={crit.id}
                    type="button"
                    onClick={() => {
                      setActiveAltCritIndex(idx);
                      setActiveTrackerTabId(crit.id);
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-2 ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{crit.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-indigo-700 text-white'
                          : isDone
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ansCount}/{altPairs.length}
                    </span>
                    {critCheck && critCheck.answeredPairs >= 3 && (
                      <span className={`text-[10px] font-mono ${critCheck.isAcceptable ? 'text-emerald-300' : 'text-rose-300'}`}>
                        (CR {critCheck.cr.toFixed(2)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Active Criterion Header */}
            {currentAltCrit && (

              <div className="bg-slate-100/80 p-4 rounded-2xl mb-4 border border-slate-200">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                  현재 평가 기준
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  [{currentAltCrit.name}] 기준 하에서의 대안 비교
                </h3>
                {currentAltCrit.description && (
                  <p className="text-xs text-slate-600 mt-1">{currentAltCrit.description}</p>
                )}
                {currentAltConsistency && (
                  <div className="mt-2 text-xs flex items-center gap-2 font-medium">
                    <span className="text-slate-500">현재 대안 CR:</span>
                    <span
                      className={`font-bold ${
                        currentAltConsistency.isAcceptable ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {currentAltConsistency.cr.toFixed(3)} ({currentAltConsistency.status})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Alternative Questions for the active criterion */}
            {currentAltCrit && (
              <div className="space-y-4">
                {altPairs.map(pair => {
                  const val = (altAnswers[currentAltCrit.id] || {})[pair.key];
                  const isWorst =
                    currentAltConsistency?.worstInconsistency?.itemA.id === pair.itemA.id &&
                    currentAltConsistency?.worstInconsistency?.itemB.id === pair.itemB.id;

                  return (
                    <div key={pair.key} id={`pair-card-${pair.key}`}>
                      <PairwiseItem
                        itemA={pair.itemA}
                        itemB={pair.itemB}
                        pairKey={pair.key}
                        value={val}
                        onChange={(k, v) => handleAltChange(currentAltCrit.id, k, v)}
                        isWorstOffender={isWorst}
                        recommendedText={currentAltConsistency?.worstInconsistency?.recommendedRatingLabel}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Final Submit Button */}
        <div className="flex items-center justify-end pt-4 pb-12">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {submitting ? '설문 제출 중...' : '설문 응답 제출하기'}
          </button>
        </div>
      </main>

      {/* Consistency Warning Modal */}
      <ConsistencyAlertModal
        isOpen={modalOpen}
        check={currentModalCheck}
        onClose={() => setModalOpen(false)}
        onScrollToOffender={handleScrollToOffender}
      />
    </div>
  );
}
