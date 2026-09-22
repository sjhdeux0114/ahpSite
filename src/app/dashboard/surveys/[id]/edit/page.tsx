'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Save,
  Clock,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import SurveyMarkdownImporter from '@/components/ahp/SurveyMarkdownImporter';
import { ParseSurveyResult } from '@/lib/surveyMarkdownParser';

interface ItemEntry {
  id: string;
  name: string;
  description: string;
}

export interface SubCriterionEntry {
  id: string;
  name: string;
  description: string;
}

export interface CriterionEntry {
  id: string;
  name: string;
  description: string;
  subcriteria: SubCriterionEntry[];
}

export interface DemographicQuestion {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
  required: boolean;
}

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [responseCount, setResponseCount] = useState(0);
  const [surveyStatus, setSurveyStatus] = useState<'ACTIVE' | 'CLOSED' | 'DRAFT'>('ACTIVE');
  const [surveySlug, setSurveySlug] = useState('');
  const [copied, setCopied] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasSubcriteria, setHasSubcriteria] = useState(false);
  const [hasAlternatives, setHasAlternatives] = useState(false);
  const [criteria, setCriteria] = useState<CriterionEntry[]>([]);
  const [alternatives, setAlternatives] = useState<ItemEntry[]>([]);
  const [demographics, setDemographics] = useState<DemographicQuestion[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch existing survey data
  useEffect(() => {
    if (!id) return;
    fetch(`/api/surveys/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('설문을 불러올 수 없습니다.');
        return res.json();
      })
      .then(data => {
        const s = data.survey;
        setTitle(s.title || '');
        setDescription(s.description || '');
        setSurveyStatus(s.status || 'ACTIVE');
        setSurveySlug(s.slug || '');
        setResponseCount(s.responseCount || 0);

        const loadedCriteria: CriterionEntry[] = (s.criteria || []).map((c: any, cIdx: number) => ({
          id: c.id || `crit_${cIdx + 1}`,
          name: c.name || '',
          description: c.description || '',
          subcriteria: (c.subcriteria || []).map((sub: any, sIdx: number) => ({
            id: sub.id || `sub_${cIdx + 1}_${sIdx + 1}`,
            name: sub.name || '',
            description: sub.description || '',
          })),
        }));

        setCriteria(loadedCriteria);

        const anyHasSubs = loadedCriteria.some(c => (c.subcriteria || []).length > 0);
        setHasSubcriteria(anyHasSubs);

        const loadedAlternatives: ItemEntry[] = (s.alternatives || []).map((a: any, aIdx: number) => ({
          id: a.id || `alt_${aIdx + 1}`,
          name: a.name || '',
          description: a.description || '',
        }));
        setAlternatives(loadedAlternatives);
        setHasAlternatives(Boolean(s.hasAlternatives) && loadedAlternatives.length > 0);

        setDemographics(s.demographics || []);
        setLoadingInitial(false);
      })
      .catch(err => {
        setInitialError(err.message || '설문 정보를 불러오지 못했습니다.');
        setLoadingInitial(false);
      });
  }, [id]);

  // Helpers for Criteria
  const addCriterion = () => {
    const nextId = `crit_${Date.now()}`;
    setCriteria([
      ...criteria,
      {
        id: nextId,
        name: '',
        description: '',
        subcriteria: hasSubcriteria
          ? [
              { id: `sub_${Date.now()}_1`, name: '', description: '' },
              { id: `sub_${Date.now()}_2`, name: '', description: '' },
            ]
          : [],
      },
    ]);
  };

  const updateCriterion = (index: number, field: 'name' | 'description', val: string) => {
    const updated = [...criteria];
    updated[index][field] = val;
    setCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 2) {
      alert('AHP 분석을 위해 최소 2개 이상의 평가 기준(대분류)이 필요합니다.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  // Helpers for Subcriteria
  const addSubcriterion = (critIndex: number) => {
    const nextSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const updated = [...criteria];
    if (!updated[critIndex].subcriteria) {
      updated[critIndex].subcriteria = [];
    }
    updated[critIndex].subcriteria.push({ id: nextSubId, name: '', description: '' });
    setCriteria(updated);
  };

  const updateSubcriterion = (
    critIndex: number,
    subIndex: number,
    field: 'name' | 'description',
    val: string
  ) => {
    const updated = [...criteria];
    updated[critIndex].subcriteria[subIndex][field] = val;
    setCriteria(updated);
  };

  const removeSubcriterion = (critIndex: number, subIndex: number) => {
    const updated = [...criteria];
    if (updated[critIndex].subcriteria.length <= 2) {
      alert('세부영역 평가를 위해 해당 대분류 내 최소 2개 이상의 세부영역이 필요합니다.');
      return;
    }
    updated[critIndex].subcriteria = updated[critIndex].subcriteria.filter((_, i) => i !== subIndex);
    setCriteria(updated);
  };

  // Helpers for Alternatives
  const addAlternative = () => {
    const nextId = `alt_${Date.now()}`;
    setAlternatives([...alternatives, { id: nextId, name: '', description: '' }]);
  };

  const updateAlternative = (index: number, field: 'name' | 'description', val: string) => {
    const updated = [...alternatives];
    updated[index][field] = val;
    setAlternatives(updated);
  };

  const removeAlternative = (index: number) => {
    if (alternatives.length <= 2) {
      alert('대안 평가를 위해 최소 2개 이상의 대안이 필요합니다.');
      return;
    }
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  // Helpers for Demographics
  const addDemographic = (preset?: Partial<DemographicQuestion>) => {
    const nextId = `demo_${Date.now()}`;
    const newDemo: DemographicQuestion = {
      id: nextId,
      title: preset?.title || '새 질문',
      type: preset?.type || 'select',
      options: preset?.options || ['선택지 1', '선택지 2'],
      required: preset?.required ?? true,
    };
    setDemographics([...demographics, newDemo]);
  };

  const updateDemographic = (index: number, field: keyof DemographicQuestion, val: any) => {
    const updated = [...demographics];
    (updated[index] as any)[field] = val;
    setDemographics(updated);
  };

  const removeDemographic = (index: number) => {
    setDemographics(demographics.filter((_, i) => i !== index));
  };

  const handleCopyLink = () => {
    if (!surveySlug) return;
    const url = `${window.location.origin}/s/${surveySlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Import from Markdown
  const handleImportMarkdown = (parsed: ParseSurveyResult) => {
    if (parsed.title) setTitle(parsed.title);
    if (parsed.description !== undefined) setDescription(parsed.description);

    setHasSubcriteria(parsed.hasSubcriteria);

    if (parsed.criteria && parsed.criteria.length > 0) {
      setCriteria(
        parsed.criteria.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          subcriteria: c.subcriteria || [],
        }))
      );
    }

    setHasAlternatives(parsed.hasAlternatives);
    if (parsed.alternatives && parsed.alternatives.length > 0) {
      setAlternatives(
        parsed.alternatives.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
        }))
      );
    }

    if (parsed.demographics && parsed.demographics.length > 0) {
      setDemographics(
        parsed.demographics.map(d => ({
          id: d.id,
          title: d.title,
          type: d.type,
          options: d.options,
          required: d.required,
        }))
      );
    }
  };

  // Question calculations
  const criteriaPairCount = (criteria.length * (criteria.length - 1)) / 2;
  const subcriteriaPairCount = hasSubcriteria
    ? criteria.reduce((sum, c) => {
        const k = (c.subcriteria || []).length;
        return sum + (k >= 2 ? (k * (k - 1)) / 2 : 0);
      }, 0)
    : 0;
  const altPairPerCrit = hasAlternatives ? (alternatives.length * (alternatives.length - 1)) / 2 : 0;
  const totalPairwiseQuestions = criteriaPairCount + subcriteriaPairCount + (hasAlternatives ? criteria.length * altPairPerCrit : 0);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validation
    if (!title.trim()) {
      setError('설문 제목을 입력해주세요.');
      return;
    }
    const emptyCrit = criteria.some(c => !c.name.trim());
    if (emptyCrit) {
      setError('모든 평가 기준의 이름을 입력해주세요.');
      return;
    }
    if (hasSubcriteria) {
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        if (!c.subcriteria || c.subcriteria.length < 2) {
          setError(`대분류 '${c.name || `C${i + 1}`}'에 최소 2개 이상의 세부영역이 필요합니다.`);
          return;
        }
        const emptySub = c.subcriteria.some(s => !s.name.trim());
        if (emptySub) {
          setError(`대분류 '${c.name}'의 모든 세부영역 이름을 입력해주세요.`);
          return;
        }
      }
    }
    if (hasAlternatives) {
      const emptyAlt = alternatives.some(a => !a.name.trim());
      if (emptyAlt) {
        setError('모든 대안의 이름을 입력해주세요.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          criteria: criteria.map(c => ({
            id: c.id,
            name: c.name.trim(),
            description: c.description.trim(),
            subcriteria: hasSubcriteria
              ? (c.subcriteria || []).map(s => ({
                  id: s.id,
                  name: s.name.trim(),
                  description: s.description.trim(),
                }))
              : [],
          })),
          alternatives: hasAlternatives
            ? alternatives.map(a => ({ id: a.id, name: a.name.trim(), description: a.description.trim() }))
            : [],
          hasAlternatives,
          demographics: demographics.map(d => ({
            id: d.id,
            title: d.title.trim(),
            type: d.type,
            options: d.type === 'select' ? d.options.map(o => o.trim()).filter(Boolean) : [],
            required: d.required,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '설문 수정에 실패했습니다.');
        setSaving(false);
        return;
      }

      setSuccessMsg('설문 수정사항이 성공적으로 저장되었습니다.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch {
      setError('서버와 통신할 수 없습니다.');
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <>
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">설문 정보를 불러오는 중입니다...</p>
          </div>
        </div>
      </>
    );
  }

  if (initialError) {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">설문을 찾을 수 없습니다</h2>
          <p className="text-sm text-slate-500 mb-6">{initialError}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
              title="대시보드로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  설문 수정
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    surveyStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {surveyStatus === 'ACTIVE' ? '배포 중' : '배포 중지됨'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                배포 중인 설문의 제목, 설명, 평가 지표 및 인적사항을 수정합니다.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {surveySlug && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '링크 복사됨' : '설문 링크 복사'}</span>
              </button>
            )}
            <Link
              href={`/dashboard/surveys/${id}/analysis`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <span>분석 대시보드</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Existing Responses Warning Banner */}
        {responseCount > 0 ? (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="block text-amber-950 font-bold mb-0.5">
                수집된 응답({responseCount}건)이 있는 설문입니다.
              </strong>
              설문 제목, 상세 설명, 평가 기준의 이름 및 세부 설명 등의 <strong>텍스트 수정은 기존 응답 데이터에 안전하게 반영</strong>됩니다. 단, 기준이나 대안을 새로 추가하거나 삭제할 경우 기존 응답자들의 쌍대비교 행렬과의 일치성에 차이가 발생할 수 있으니 주의해 주세요.
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>아직 수집된 응답이 없습니다. 모든 설문 구조를 자유롭게 수정하실 수 있습니다.</span>
          </div>
        )}

        {/* AI Markdown Importer Modal */}
        <div className="mb-8 flex justify-end">
          <SurveyMarkdownImporter onImport={handleImportMarkdown} />
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Basic Info */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              설문 기본 정보
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  설문 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 스마트 업무 솔루션 도입 선정 AHP 분석"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  설문 목적 및 응답자 안내문 (선택)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="설문의 연구 배경 및 참여자 안내 사항을 입력하세요."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Criteria & Subcriteria */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  평가 기준(Criteria) 및 세부영역 구성
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  대분류는 최소 2개 이상 필요하며, 각 대분류별 세부영역도 최소 2개 이상 권장됩니다.
                </p>
              </div>

              {/* Toggle Subcriteria */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHasSubcriteria(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !hasSubcriteria ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  대분류 단일 평가
                </button>
                <button
                  type="button"
                  onClick={() => setHasSubcriteria(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    hasSubcriteria ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  계층형 (대분류+세부영역)
                </button>
              </div>
            </div>

            {/* Criteria List */}
            <div className="space-y-6">
              {criteria.map((crit, cIdx) => (
                <div
                  key={crit.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                      대분류 {cIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCriterion(cIdx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="대분류 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        대분류 이름 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={crit.name}
                        onChange={e => updateCriterion(cIdx, 'name', e.target.value)}
                        placeholder="예: 기술성 (Technology)"
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        대분류 상세 설명
                      </label>
                      <input
                        type="text"
                        value={crit.description}
                        onChange={e => updateCriterion(cIdx, 'description', e.target.value)}
                        placeholder="예: 시스템 기능 품질과 기술 완성도"
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Subcriteria List */}
                  {hasSubcriteria && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80 bg-white/70 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          [{crit.name || `대분류 ${cIdx + 1}`}] 하위 세부영역
                        </span>
                        <button
                          type="button"
                          onClick={() => addSubcriterion(cIdx)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800"
                        >
                          <Plus className="w-3.5 h-3.5" /> 세부영역 추가
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(crit.subcriteria || []).map((sub, sIdx) => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 w-5">
                              {sIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={sub.name}
                              onChange={e => updateSubcriterion(cIdx, sIdx, 'name', e.target.value)}
                              placeholder="세부영역 명칭 (예: 기능 완성도)"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                              required
                            />
                            <input
                              type="text"
                              value={sub.description}
                              onChange={e =>
                                updateSubcriterion(cIdx, sIdx, 'description', e.target.value)
                              }
                              placeholder="설명 (선택)"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeSubcriterion(cIdx, sIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500"
                              title="세부영역 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addCriterion}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-600 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" /> 대분류 평가 기준 추가
              </button>
            </div>
          </div>

          {/* SECTION 3: Alternatives (Optional) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  평가 대안(Alternatives) 후보군
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  특정 대안 후보들(A, B, C...)의 최종 우선순위를 산출할 경우 활성화하세요.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHasAlternatives(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !hasAlternatives ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  가중치만 산출
                </button>
                <button
                  type="button"
                  onClick={() => setHasAlternatives(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    hasAlternatives ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  대안 평가 포함
                </button>
              </div>
            </div>

            {hasAlternatives && (
              <div className="space-y-3">
                {alternatives.map((alt, aIdx) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {aIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={alt.name}
                      onChange={e => updateAlternative(aIdx, 'name', e.target.value)}
                      placeholder="대안 명칭 (예: 솔루션 A)"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <input
                      type="text"
                      value={alt.description}
                      onChange={e => updateAlternative(aIdx, 'description', e.target.value)}
                      placeholder="대안 설명 (선택)"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeAlternative(aIdx)}
                      className="p-2 text-slate-400 hover:text-rose-500"
                      title="대안 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAlternative}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> 대안 후보 추가
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: Demographics */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-xs flex items-center justify-center font-bold">
                    4
                  </span>
                  응답자 인적사항 (프로필 문항)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  인구통계학적 문항을 설정하여 집단별 비교 분석 및 필터링에 활용할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addDemographic()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition border border-violet-100"
              >
                <Plus className="w-3.5 h-3.5" /> 질문 추가
              </button>
            </div>

            <div className="space-y-4">
              {demographics.map((demo, dIdx) => (
                <div key={demo.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-violet-700">질문 {dIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeDemographic(dIdx)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={demo.title}
                        onChange={e => updateDemographic(dIdx, 'title', e.target.value)}
                        placeholder="질문 제목 (예: 직무 구분)"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={demo.type}
                        onChange={e => updateDemographic(dIdx, 'type', e.target.value as any)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                      >
                        <option value="select">객관식 (선택형)</option>
                        <option value="text">주관식 (단답형)</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={demo.required}
                          onChange={e => updateDemographic(dIdx, 'required', e.target.checked)}
                          className="rounded text-violet-600 focus:ring-violet-500"
                        />
                        필수
                      </label>
                    </div>
                  </div>

                  {demo.type === 'select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        선택지 항목 (쉼표로 구분)
                      </label>
                      <input
                        type="text"
                        value={demo.options.join(', ')}
                        onChange={e =>
                          updateDemographic(
                            dIdx,
                            'options',
                            e.target.value.split(',').map(s => s.trim())
                          )
                        }
                        placeholder="예: 개발팀, 기획팀, 디자인팀, 운영팀"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Question Count Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">설문 문항 요약</span>
              <span className="text-slate-500 text-xs">
                대분류 비교 {criteriaPairCount}문항
                {hasSubcriteria && ` + 세부영역 비교 ${subcriteriaPairCount}문항`}
                {hasAlternatives && ` + 대안 비교 ${criteria.length * altPairPerCrit}문항`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">예상 총 쌍대비교: </span>
              <strong className="text-base text-indigo-700 font-extrabold">
                {totalPairwiseQuestions}문항
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 pb-12">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 transition text-center"
            >
              취소하고 돌아가기
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '수정사항 저장 중...' : '설문 수정사항 저장하기'}</span>
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
