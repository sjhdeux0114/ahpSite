'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Info,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface CriterionData extends PairItemData {
  subcriteria?: PairItemData[];
}

interface DemographicQuestion {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
  required: boolean;
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
  demographics?: DemographicQuestion[];
}

export type StepType = 'intro' | 'criteria' | 'subcriteria' | 'alternatives' | 'review';

export interface WizardStep {
  id: string; // 'intro' | 'criteria' | `sub_${crit.id}` | `alt_${crit.id}` | 'review'
  type: StepType;
  stepIndex: number;
  badge: string; // '안내', '1단계', '2-1단계', '2-2단계', '검토'
  shortTitle: string; // '안내', '1. 대분류', '2-1. 기술성', '2-2. 경제성', '제출'
  title: string;
  description?: string;
  criterion?: CriterionData;
  totalPairs: number;
  answeredPairs: number;
  isComplete: boolean;
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

  // alternativeAnswers: { [criterionId]: { "alt1_alt2": 3, ... } }
  const [altAnswers, setAltAnswers] = useState<Record<string, Record<string, number>>>({});

  // Wizard active step index
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Validation / navigation error message
  const [stepError, setStepError] = useState<string>('');

  // Scale guide collapsible state
  const [showScaleGuide, setShowScaleGuide] = useState<boolean>(false);

  // Modal alert state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentModalCheck, setCurrentModalCheck] = useState<RealtimeConsistencyCheck | null>(null);
  const [alertDismissedKeys, setAlertDismissedKeys] = useState<Set<string>>(new Set());

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  // Ref to container for smooth scrolling
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Load draft from localStorage if available
  useEffect(() => {
    if (!slug) return;
    try {
      const saved = localStorage.getItem(`ahp_survey_draft_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.respondentName) setRespondentName(parsed.respondentName);
        if (parsed.respondentEmail) setRespondentEmail(parsed.respondentEmail);
        if (parsed.demographicAnswers) setDemographicAnswers(parsed.demographicAnswers);
        if (parsed.criteriaAnswers) setCriteriaAnswers(parsed.criteriaAnswers);
        if (parsed.subAnswers) setSubAnswers(parsed.subAnswers);
        if (parsed.altAnswers) setAltAnswers(parsed.altAnswers);
        if (typeof parsed.stepIndex === 'number') setCurrentStepIndex(parsed.stepIndex);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [slug]);

  // Fetch survey data
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

  // Save draft to localStorage on change
  useEffect(() => {
    if (!slug || loading || submitted) return;
    try {
      localStorage.setItem(
        `ahp_survey_draft_${slug}`,
        JSON.stringify({
          respondentName,
          respondentEmail,
          demographicAnswers,
          criteriaAnswers,
          subAnswers,
          altAnswers,
          stepIndex: currentStepIndex,
        })
      );
    } catch {
      // Ignore localStorage write errors
    }
  }, [
    slug,
    respondentName,
    respondentEmail,
    demographicAnswers,
    criteriaAnswers,
    subAnswers,
    altAnswers,
    currentStepIndex,
    loading,
    submitted,
  ]);

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

  // Criteria with at least 2 subcriteria
  const criteriaWithSub = useMemo(() => {
    return (survey?.criteria || []).filter(c => (c.subcriteria || []).length >= 2);
  }, [survey]);

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

  // Map of subcriteria pairs by criterion ID
  const subPairsMap = useMemo(() => {
    const map: Record<string, Array<{ itemA: PairItemData; itemB: PairItemData; key: string }>> = {};
    criteriaWithSub.forEach(crit => {
      const subs = crit.subcriteria || [];
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
      map[crit.id] = pairs;
    });
    return map;
  }, [criteriaWithSub]);

  // Alternative pairs list
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

  // Demographics completion check
  const demographicsComplete = useMemo(() => {
    if (!survey?.demographics || survey.demographics.length === 0) return true;
    return survey.demographics.every(d => !d.required || !!demographicAnswers[d.id]);
  }, [survey, demographicAnswers]);

  // ================= DYNAMIC WIZARD STEPS DEFINITION =================
  const steps = useMemo<WizardStep[]>(() => {
    if (!survey) return [];
    const list: WizardStep[] = [];
    let idx = 0;

    // Step 0: Intro & Demographics
    list.push({
      id: 'intro',
      type: 'intro',
      stepIndex: idx++,
      badge: '설문 개요',
      shortTitle: '안내/정보',
      title: survey.title,
      description: survey.description,
      totalPairs: 0,
      answeredPairs: 0,
      isComplete: demographicsComplete,
    });

    // Step 1: Criteria Pairwise
    const criteriaAnswered = Object.keys(criteriaAnswers).length;
    list.push({
      id: 'criteria',
      type: 'criteria',
      stepIndex: idx++,
      badge: '1단계',
      shortTitle: '1. 대분류',
      title: '1단계: 평가 기준(대분류) 간 중요도 비교',
      description: '전체 목표를 달성하기 위해 각 대분류 기준들 사이의 상대적 중요도를 1:1로 비교해 주세요.',
      totalPairs: criteriaPairs.length,
      answeredPairs: criteriaAnswered,
      isComplete: criteriaPairs.length > 0 && criteriaAnswered >= criteriaPairs.length,
    });

    // Step 2-1 ... 2-k: Subcriteria Pairwise for each Criterion
    const hasAnySubs = criteriaWithSub.length > 0;
    if (hasAnySubs) {
      criteriaWithSub.forEach((crit, subIdx) => {
        const pairs = subPairsMap[crit.id] || [];
        const answered = Object.keys(subAnswers[crit.id] || {}).length;
        list.push({
          id: `sub_${crit.id}`,
          type: 'subcriteria',
          stepIndex: idx++,
          badge: `2-${subIdx + 1}단계`,
          shortTitle: `2-${subIdx + 1}. ${crit.name}`,
          title: `2-${subIdx + 1}단계: [${crit.name}] 하위 세부영역 간 중요도 비교`,
          description: crit.description || `'${crit.name}' 대분류에 속한 세부영역 간 상대적 중요도를 1:1로 비교해 주세요.`,
          criterion: crit,
          totalPairs: pairs.length,
          answeredPairs: answered,
          isComplete: pairs.length > 0 && answered >= pairs.length,
        });
      });
    }

    // Step 3-1 ... 3-m: Alternatives Pairwise (if alternatives exist)
    if (survey.hasAlternatives && survey.alternatives.length > 1) {
      const stepNum = hasAnySubs ? '3' : '2';
      survey.criteria.forEach((crit, altIdx) => {
        const answered = Object.keys(altAnswers[crit.id] || {}).length;
        list.push({
          id: `alt_${crit.id}`,
          type: 'alternatives',
          stepIndex: idx++,
          badge: `${stepNum}-${altIdx + 1}단계`,
          shortTitle: `${stepNum}-${altIdx + 1}. 대안 (${crit.name})`,
          title: `${stepNum}-${altIdx + 1}단계: [${crit.name}] 관점 대안 간 비교`,
          description: crit.description || `'${crit.name}' 기준의 관점에서 각 대안들의 적합도 및 중요도를 1:1로 비교해 주세요.`,
          criterion: crit,
          totalPairs: altPairs.length,
          answeredPairs: answered,
          isComplete: altPairs.length > 0 && answered >= altPairs.length,
        });
      });
    }

    // Final Step: Review & Submit
    const allPreviousComplete = list.every(s => s.isComplete);
    list.push({
      id: 'review',
      type: 'review',
      stepIndex: idx++,
      badge: '최종 제출',
      shortTitle: '검토/제출',
      title: '설문 응답 검토 및 최종 제출',
      description: '모든 단계의 응답 내역과 일관성 검사 결과를 확인하신 후 제출해 주세요.',
      totalPairs: 0,
      answeredPairs: 0,
      isComplete: allPreviousComplete,
    });

    return list;
  }, [
    survey,
    demographicsComplete,
    criteriaAnswers,
    criteriaPairs,
    criteriaWithSub,
    subPairsMap,
    subAnswers,
    altAnswers,
    altPairs,
  ]);

  // Current active step
  const currentStep = steps[currentStepIndex] || steps[0];

  // Tracker Tabs for ConsistencyTracker (Criteria, Subcriteria, Alternatives)
  const trackerTabs = useMemo<TrackerTab[]>(() => {
    if (!survey || !criteriaConsistency) return [];
    const hasAnySubs = criteriaWithSub.length > 0;

    const list: TrackerTab[] = [
      {
        id: 'criteria',
        title: '1단계: 대분류 간 쌍대비교',
        shortTitle: '1. 대분류',
        check: criteriaConsistency,
      },
    ];

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
          title: `2-${idx + 1}단계: [${crit.name}] 세부영역 간 쌍대비교`,
          shortTitle: `2-${idx + 1}. ${crit.name}`,
          check,
        });
      });
    }

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
          title: `${stepNum}-${idx + 1}단계: [${crit.name}] 관점 대안 간 비교`,
          shortTitle: `${stepNum}-${idx + 1}. 대안`,
          check,
        });
      });
    }

    return list;
  }, [survey, criteriaConsistency, criteriaWithSub, subConsistencies, altConsistencies]);

  // Determine active tracker tab id
  const activeTrackerTabId = useMemo(() => {
    if (!currentStep) return 'criteria';
    if (currentStep.type === 'criteria' || currentStep.type === 'subcriteria' || currentStep.type === 'alternatives') {
      return currentStep.id;
    }
    return 'criteria';
  }, [currentStep]);

  // Navigate to step
  const navigateToStep = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    setStepError('');
    setCurrentStepIndex(targetIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate by step ID
  const navigateToStepById = (stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx >= 0) {
      navigateToStep(idx);
    }
  };

  // Next step handler with validation
  const handleNextStep = () => {
    setStepError('');

    if (currentStep.type === 'intro') {
      // Validate demographics
      if (survey?.demographics && survey.demographics.length > 0) {
        for (const demo of survey.demographics) {
          if (demo.required && !demographicAnswers[demo.id]) {
            setStepError(`인적사항 중 '${demo.title}' 항목을 입력 또는 선택해 주세요.`);
            return;
          }
        }
      }
    } else if (currentStep.type === 'criteria') {
      const answered = Object.keys(criteriaAnswers).length;
      if (answered < criteriaPairs.length) {
        setStepError(`1단계 대분류 비교의 모든 문항에 응답해 주세요. (미응답: ${criteriaPairs.length - answered}개)`);
        // Find first unanswered pair and scroll to it
        const firstMissing = criteriaPairs.find(p => criteriaAnswers[p.key] === undefined);
        if (firstMissing) {
          document.getElementById(`pair-card-${firstMissing.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    } else if (currentStep.type === 'subcriteria' && currentStep.criterion) {
      const crit = currentStep.criterion;
      const pairs = subPairsMap[crit.id] || [];
      const critAnswers = subAnswers[crit.id] || {};
      const answered = Object.keys(critAnswers).length;
      if (answered < pairs.length) {
        setStepError(`'${crit.name}' 세부영역 비교의 모든 문항에 응답해 주세요. (미응답: ${pairs.length - answered}개)`);
        const firstMissing = pairs.find(p => critAnswers[p.key] === undefined);
        if (firstMissing) {
          document.getElementById(`pair-card-${firstMissing.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    } else if (currentStep.type === 'alternatives' && currentStep.criterion) {
      const crit = currentStep.criterion;
      const answersForCrit = altAnswers[crit.id] || {};
      const answered = Object.keys(answersForCrit).length;
      if (answered < altPairs.length) {
        setStepError(`'${crit.name}' 기준 대안 비교의 모든 문항에 응답해 주세요. (미응답: ${altPairs.length - answered}개)`);
        const firstMissing = altPairs.find(p => answersForCrit[p.key] === undefined);
        if (firstMissing) {
          document.getElementById(`pair-card-${firstMissing.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      navigateToStep(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      navigateToStep(currentStepIndex - 1);
    }
  };

  // Criteria answer change
  const handleCriteriaChange = (pairKey: string, val: number) => {
    const updated = { ...criteriaAnswers, [pairKey]: val };
    setCriteriaAnswers(updated);
    if (stepError) setStepError('');

    if (survey) {
      const check = checkRealtimeConsistency(survey.criteria, updated);
      const isSevere = check.triadViolations.length > 0 || (check.cr > 0.10 && check.answeredPairs >= 3);
      if (isSevere && !alertDismissedKeys.has(pairKey)) {
        setCurrentModalCheck(check);
        setModalOpen(true);
        setAlertDismissedKeys(prev => new Set(prev).add(pairKey));
      }
    }
  };

  // Subcriteria answer change
  const handleSubChange = (critId: string, pairKey: string, val: number) => {
    const critMap = { ...(subAnswers[critId] || {}), [pairKey]: val };
    const updated = { ...subAnswers, [critId]: critMap };
    setSubAnswers(updated);
    if (stepError) setStepError('');

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

  // Alternative answer change
  const handleAltChange = (critId: string, pairKey: string, val: number) => {
    const critMap = { ...(altAnswers[critId] || {}), [pairKey]: val };
    const updated = { ...altAnswers, [critId]: critMap };
    setAltAnswers(updated);
    if (stepError) setStepError('');

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

  // Scroll to offending element in current step
  const handleScrollToOffender = (pairKey: string) => {
    const el = document.getElementById(`pair-card-${pairKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Submission handler
  const handleSubmit = async () => {
    setSubmitError('');

    // Check completion of criteria
    if (criteriaPairs.length > Object.keys(criteriaAnswers).length) {
      setSubmitError('대분류 평가 기준 쌍대비교의 모든 문항에 응답해 주세요.');
      navigateToStepById('criteria');
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
          navigateToStepById(`sub_${crit.id}`);
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
          navigateToStepById(`alt_${crit.id}`);
          return;
        }
      }
    }

    // Check completion of required demographics
    if (survey?.demographics && survey.demographics.length > 0) {
      for (const demo of survey.demographics) {
        if (demo.required && !demographicAnswers[demo.id]) {
          setSubmitError(`인적사항 문항 중 '${demo.title}' 항목에 응답해 주세요.`);
          navigateToStepById('intro');
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

      // Clear draft on successful submission
      try {
        localStorage.removeItem(`ahp_survey_draft_${slug}`);
      } catch {
        // Ignore
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
              <span className="text-slate-600">대분류 일관성 비율(CR):</span>
              <span className="font-bold text-slate-900">
                {submitResult?.criteriaCR?.toFixed(4) ?? '0.0000'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2">
              <span className="text-slate-600">종합 신뢰성 판정:</span>
              <span className={`font-bold ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isPassing ? '✅ 신뢰 기준 충족 (CR ≤ 0.10)' : '⚠️ 일관성 주의 (CR > 0.10)'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400">AHP Decision Hub Powered by Saaty Method</div>
        </div>
      </div>
    );
  }

  // Calculate completed steps count (excluding review step)
  const nonReviewSteps = steps.filter(s => s.type !== 'review');
  const completedStepsCount = nonReviewSteps.filter(s => s.isComplete).length;
  const overallProgressPercent = nonReviewSteps.length > 0 ? Math.round((completedStepsCount / nonReviewSteps.length) * 100) : 0;

  // Next step label
  const nextStep = steps[currentStepIndex + 1];
  const prevStep = steps[currentStepIndex - 1];

  // Current active subcriteria consistency
  const activeSubConsistency = currentStep?.criterion ? subConsistencies[currentStep.criterion.id] : null;

  // Current active alternative consistency
  const activeAltConsistency = currentStep?.criterion ? altConsistencies[currentStep.criterion.id] : null;

  return (
    <div ref={topAnchorRef} className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200 shadow-xs py-3.5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-base sm:text-lg">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="truncate max-w-[200px] sm:max-w-md">{survey.title}</span>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-100 shrink-0">
            단계별 응답 모드
          </span>
        </div>
      </header>

      {/* Sticky Real-time Consistency Tracker (Only visible on pairwise comparison steps) */}
      {currentStep.type !== 'intro' && currentStep.type !== 'review' && trackerTabs.length > 0 && (
        <ConsistencyTracker
          tabs={trackerTabs}
          activeTabId={activeTrackerTabId}
          onSelectTab={navigateToStepById}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ================= STEPPER PROGRESS BAR ================= */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">
                단계 {currentStepIndex + 1} / {steps.length}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-indigo-600 font-semibold">{currentStep.badge}</span>
            </div>
            <span className="font-bold text-slate-700">전체 진행률 {overallProgressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, overallProgressPercent)}%` }}
            />
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              const isDone = step.isComplete;

              let pillStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
              if (isActive) {
                pillStyle = 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold';
              } else if (isDone) {
                pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
              }

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => navigateToStep(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition border flex items-center gap-1.5 shrink-0 ${pillStyle}`}
                  title={step.title}
                >
                  {isDone && !isActive ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  )}
                  <span>{step.shortTitle}</span>
                  {step.totalPairs > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.answeredPairs}/{step.totalPairs}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step-specific Error Notice */}
        {stepError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span className="font-semibold">{stepError}</span>
          </div>
        )}

        {/* ================= STEP 0: INTRO & DEMOGRAPHICS ================= */}
        {currentStep.type === 'intro' && (
          <div className="space-y-6">
            {/* Title & Description Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs inline-block mb-3 border border-indigo-100">
                AHP 의사결정 설문
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
                  {survey.description}
                </p>
              )}

              {/* Saaty Scale Guide Box */}
              <div className="p-4 sm:p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs sm:text-sm text-indigo-950">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-indigo-900 text-sm">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  AHP 쌍대비교(Pairwise Comparison) 응답 안내
                </h3>
                <p className="text-indigo-800 leading-relaxed text-xs sm:text-sm mb-3">
                  제시된 두 항목 중 더 중요하거나 선호되는 항목 방향의 척도(1=동등, 3=약간 중요, 5=확실히 중요, 7=매우 중요, 9=절대적 중요)를 선택해 주세요.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="font-bold text-slate-900 block text-sm">1</span>
                    <span className="text-slate-500">동등하게 중요</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="font-bold text-indigo-600 block text-sm">3</span>
                    <span className="text-slate-500">약간 더 중요</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="font-bold text-indigo-600 block text-sm">5</span>
                    <span className="text-slate-500">확실히 더 중요</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="font-bold text-indigo-600 block text-sm">7</span>
                    <span className="text-slate-500">매우 크게 중요</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-center col-span-2 sm:col-span-1">
                    <span className="font-bold text-indigo-600 block text-sm">9</span>
                    <span className="text-slate-500">절대적으로 중요</span>
                  </div>
                </div>
              </div>

              {/* Step Flow Overview Notice */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-start gap-2.5 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    본 설문은 <strong>1단계: 대분류 간 비교</strong>를 시작으로, 각 <strong>대분류별 세부영역 간 비교</strong>가 단계별 페이지로 순서대로 진행됩니다. 한 단계씩 확인하시면서 응답해 주시면 됩니다.
                  </p>
                </div>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Demographics Card (if any) */}
            {survey.demographics && survey.demographics.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    i
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      응답자 인적사항 (프로필)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      통계 집계 및 세부 분석을 위해 각 항목에 응답해 주세요.
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
                                onClick={() => {
                                  setDemographicAnswers(prev => ({ ...prev, [demo.id]: opt }));
                                  if (stepError) setStepError('');
                                }}
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
                          onChange={e => {
                            setDemographicAnswers(prev => ({ ...prev, [demo.id]: e.target.value }));
                            if (stepError) setStepError('');
                          }}
                          placeholder="답변을 입력하세요"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 1: CRITERIA PAIRWISE ================= */}
        {currentStep.type === 'criteria' && (
          <div className="space-y-6">
            {/* Step Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                      1단계 평가
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      평가 기준(대분류) 간 중요도 비교
                    </h2>
                  </div>
                </div>

                {/* Collapsible Scale Guide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowScaleGuide(!showScaleGuide)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>척도 안내</span>
                  {showScaleGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                전체 의사결정 목표를 고려할 때, 아래 제시된 두 대분류 평가 기준 중 어느 쪽이 얼마나 더 중요한지 선택해 주세요.
              </p>

              {/* Collapsed Scale Table */}
              {showScaleGuide && (
                <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 animate-fadeIn">
                  <p className="font-semibold mb-2">💡 Saaty 9점 척도 기준 안내:</p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-100 font-medium">1: 동등</div>
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-100 font-medium">3: 약간 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-100 font-medium">5: 확실히 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-100 font-medium">7: 매우 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-100 font-medium">9: 절대적 중요</div>
                  </div>
                </div>
              )}

              {/* Step Completion Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  응답 완료 현황: <strong>{currentStep.answeredPairs}</strong> / {currentStep.totalPairs} 문항
                </span>
                {currentStep.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> 모든 문항 완료
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    {currentStep.totalPairs - currentStep.answeredPairs}개 문항 남음
                  </span>
                )}
              </div>
            </div>

            {/* Criteria Pairwise Items */}
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
        )}

        {/* ================= STEP 2: SUBCRITERIA PAIRWISE ================= */}
        {currentStep.type === 'subcriteria' && currentStep.criterion && (
          <div className="space-y-6">
            {/* Step Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-purple-200/90 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">
                      {currentStep.badge}: 하위 세부영역 비교
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      [{currentStep.criterion.name}] 하위 세부영역 간 중요도 비교
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScaleGuide(!showScaleGuide)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  <span>척도 안내</span>
                  {showScaleGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Criterion Description Callout */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs sm:text-sm text-purple-950 mb-3">
                <span className="font-bold text-purple-900 block mb-0.5">
                  대분류: {currentStep.criterion.name}
                </span>
                <p className="text-purple-800 text-xs">
                  {currentStep.criterion.description ||
                    `'${currentStep.criterion.name}' 평가 기준에 포함된 하위 세부영역들 간의 상대적 중요도를 1:1로 비교해 주세요.`}
                </p>
              </div>

              {/* Collapsed Scale Table */}
              {showScaleGuide && (
                <div className="mt-3 p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs text-purple-950 animate-fadeIn mb-3">
                  <p className="font-semibold mb-2">💡 Saaty 9점 척도 기준 안내:</p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-white p-1.5 rounded-lg border border-purple-100 font-medium">1: 동등</div>
                    <div className="bg-white p-1.5 rounded-lg border border-purple-100 font-medium">3: 약간 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-purple-100 font-medium">5: 확실히 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-purple-100 font-medium">7: 매우 중요</div>
                    <div className="bg-white p-1.5 rounded-lg border border-purple-100 font-medium">9: 절대적 중요</div>
                  </div>
                </div>
              )}

              {/* Step Completion & CR Summary Badge */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    응답 현황: <strong>{currentStep.answeredPairs}</strong> / {currentStep.totalPairs} 문항
                  </span>
                  {activeSubConsistency && activeSubConsistency.answeredPairs >= 3 && (
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        activeSubConsistency.isAcceptable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      CR {activeSubConsistency.cr.toFixed(3)}
                    </span>
                  )}
                </div>

                {currentStep.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> 이 단계 완료됨
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    {currentStep.totalPairs - currentStep.answeredPairs}개 문항 남음
                  </span>
                )}
              </div>
            </div>

            {/* Subcriteria Pairwise Cards */}
            <div className="space-y-4">
              {(subPairsMap[currentStep.criterion.id] || []).map(pair => {
                const val = (subAnswers[currentStep.criterion!.id] || {})[pair.key];
                const isWorst =
                  activeSubConsistency?.worstInconsistency?.itemA.id === pair.itemA.id &&
                  activeSubConsistency?.worstInconsistency?.itemB.id === pair.itemB.id;

                return (
                  <div key={pair.key} id={`pair-card-${pair.key}`}>
                    <PairwiseItem
                      itemA={pair.itemA}
                      itemB={pair.itemB}
                      pairKey={pair.key}
                      value={val}
                      onChange={(k, v) => handleSubChange(currentStep.criterion!.id, k, v)}
                      isWorstOffender={isWorst}
                      recommendedText={activeSubConsistency?.worstInconsistency?.recommendedRatingLabel}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 3: ALTERNATIVES PAIRWISE ================= */}
        {currentStep.type === 'alternatives' && currentStep.criterion && (
          <div className="space-y-6">
            {/* Step Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200/90 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                      {currentStep.badge}: 대안 간 비교
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      [{currentStep.criterion.name}] 관점 대안 간 비교
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScaleGuide(!showScaleGuide)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>척도 안내</span>
                  {showScaleGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs sm:text-sm text-emerald-950 mb-3">
                <span className="font-bold text-emerald-900 block mb-0.5">
                  평가 기준: {currentStep.criterion.name}
                </span>
                <p className="text-emerald-800 text-xs">
                  '{currentStep.criterion.name}' 기준 하에서 후보 대안들을 1:1로 비교해 주세요.
                </p>
              </div>

              {/* Step Completion & CR Summary Badge */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    응답 현황: <strong>{currentStep.answeredPairs}</strong> / {currentStep.totalPairs} 문항
                  </span>
                  {activeAltConsistency && activeAltConsistency.answeredPairs >= 3 && (
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        activeAltConsistency.isAcceptable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      CR {activeAltConsistency.cr.toFixed(3)}
                    </span>
                  )}
                </div>

                {currentStep.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> 이 단계 완료됨
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    {currentStep.totalPairs - currentStep.answeredPairs}개 문항 남음
                  </span>
                )}
              </div>
            </div>

            {/* Alternatives Pairwise Cards */}
            <div className="space-y-4">
              {altPairs.map(pair => {
                const val = (altAnswers[currentStep.criterion!.id] || {})[pair.key];
                const isWorst =
                  activeAltConsistency?.worstInconsistency?.itemA.id === pair.itemA.id &&
                  activeAltConsistency?.worstInconsistency?.itemB.id === pair.itemB.id;

                return (
                  <div key={pair.key} id={`pair-card-${pair.key}`}>
                    <PairwiseItem
                      itemA={pair.itemA}
                      itemB={pair.itemB}
                      pairKey={pair.key}
                      value={val}
                      onChange={(k, v) => handleAltChange(currentStep.criterion!.id, k, v)}
                      isWorstOffender={isWorst}
                      recommendedText={activeAltConsistency?.worstInconsistency?.recommendedRatingLabel}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= FINAL STEP: REVIEW & SUBMIT ================= */}
        {currentStep.type === 'review' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs inline-block mb-3 border border-indigo-100">
                최종 확인
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                설문 응답 검토 및 최종 제출
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                각 단계별 응답 완성도와 논리적 일관성 검사 결과를 확인하신 후 [설문 응답 제출하기] 버튼을 눌러주세요. 수정이 필요한 단계는 '수정하기'를 클릭해 언제든 다시 변경하실 수 있습니다.
              </p>

              {/* Status Banner */}
              {currentStep.isComplete ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3 mb-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">모든 문항의 응답이 완료되었습니다!</span>
                    <span className="text-xs text-emerald-700">
                      아래 결과를 확인하신 후 최종 제출 버튼을 클릭해 주세요.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">미완료된 평가 단계가 있습니다.</span>
                    <span className="text-xs text-amber-700">
                      아래 목록에서 '미완료'로 표시된 단계의 [응답하기] 버튼을 눌러 모든 문항을 완료해 주세요.
                    </span>
                  </div>
                </div>
              )}

              {/* Review Dashboard List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  단계별 응답 및 일관성 요약
                </h3>

                {/* Demographics Card */}
                {survey.demographics && survey.demographics.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        demographicsComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {demographicsComplete ? '✓' : '!'}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">응답자 인적사항</span>
                        <span className="text-xs text-slate-500">
                          {demographicsComplete ? '필수 항목 입력 완료' : '필수 미응답 항목 있음'}
                          {respondentName && ` • 응답자: ${respondentName}`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToStepById('intro')}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      확인/수정
                    </button>
                  </div>
                )}

                {/* Criteria Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      steps.find(s => s.id === 'criteria')?.isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {steps.find(s => s.id === 'criteria')?.isComplete ? '✓' : '!'}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        1단계: 평가 기준(대분류) 간 비교
                      </span>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="text-slate-500">
                          {Object.keys(criteriaAnswers).length} / {criteriaPairs.length} 완료
                        </span>
                        {criteriaConsistency && criteriaConsistency.answeredPairs >= 3 && (
                          <span className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                            criteriaConsistency.isAcceptable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            CR {criteriaConsistency.cr.toFixed(3)} ({criteriaConsistency.status})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToStepById('criteria')}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    확인/수정
                  </button>
                </div>

                {/* Subcriteria Cards */}
                {criteriaWithSub.map((crit, subIdx) => {
                  const stepObj = steps.find(s => s.id === `sub_${crit.id}`);
                  const check = subConsistencies[crit.id];
                  const total = (subPairsMap[crit.id] || []).length;
                  const answered = Object.keys(subAnswers[crit.id] || {}).length;
                  const isDone = stepObj?.isComplete;

                  return (
                    <div
                      key={crit.id}
                      className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isDone ? '✓' : '!'}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">
                            2-{subIdx + 1}단계: [{crit.name}] 하위 세부영역 간 비교
                          </span>
                          <div className="flex items-center gap-2 text-xs mt-0.5">
                            <span className="text-slate-500">
                              {answered} / {total} 완료
                            </span>
                            {check && check.answeredPairs >= 3 && (
                              <span className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                                check.isAcceptable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                CR {check.cr.toFixed(3)} ({check.status})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToStepById(`sub_${crit.id}`)}
                        className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-semibold text-purple-700"
                      >
                        확인/수정
                      </button>
                    </div>
                  );
                })}

                {/* Alternatives Cards */}
                {survey.hasAlternatives && survey.alternatives.length > 1 && survey.criteria.map((crit, altIdx) => {
                  const stepObj = steps.find(s => s.id === `alt_${crit.id}`);
                  const check = altConsistencies[crit.id];
                  const total = altPairs.length;
                  const answered = Object.keys(altAnswers[crit.id] || {}).length;
                  const isDone = stepObj?.isComplete;

                  return (
                    <div
                      key={crit.id}
                      className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isDone ? '✓' : '!'}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">
                            대안 비교: [{crit.name}] 기준 관점
                          </span>
                          <div className="flex items-center gap-2 text-xs mt-0.5">
                            <span className="text-slate-500">
                              {answered} / {total} 완료
                            </span>
                            {check && check.answeredPairs >= 3 && (
                              <span className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                                check.isAcceptable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                CR {check.cr.toFixed(3)} ({check.status})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToStepById(`alt_${crit.id}`)}
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-700"
                      >
                        확인/수정
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP NAVIGATION FOOTER CONTROLS ================= */}
        <div className="mt-8 pt-4 pb-12 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Previous Step Button */}
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전 단계 ({prevStep?.shortTitle || '이전'})</span>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Next Step or Submit Button */}
          {currentStep.type !== 'review' ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              <span>{nextStep?.type === 'review' ? '응답 검토 및 제출하기' : `다음 단계: ${nextStep?.shortTitle || '다음'}`}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              <span>{submitting ? '설문 응답 제출 중...' : '설문 응답 최종 제출하기'}</span>
            </button>
          )}
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
