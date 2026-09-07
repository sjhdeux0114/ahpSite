'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

interface ItemEntry {
  id: string;
  name: string;
  description: string;
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasAlternatives, setHasAlternatives] = useState(true);

  // Criteria
  const [criteria, setCriteria] = useState<ItemEntry[]>([
    { id: 'crit_1', name: '가격 및 비용', description: '도입 및 유지관리 비용의 합리성' },
    { id: 'crit_2', name: '성능 및 품질', description: '제품/서비스의 핵심 기능과 신뢰도' },
    { id: 'crit_3', name: '사용 편의성', description: 'UI/UX 디자인과 학습 용이성' },
    { id: 'crit_4', name: '기술 지원 및 AS', description: '신속한 고객 대응과 유지보수 편의' },
  ]);

  // Alternatives
  const [alternatives, setAlternatives] = useState<ItemEntry[]>([
    { id: 'alt_1', name: '대안 A', description: '기본형 솔루션' },
    { id: 'alt_2', name: '대안 B', description: '고급형 프리미엄 솔루션' },
    { id: 'alt_3', name: '대안 C', description: '오픈소스 기반 맞춤형 솔루션' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helpers for Criteria
  const addCriterion = () => {
    const nextId = `crit_${Date.now()}`;
    setCriteria([...criteria, { id: nextId, name: '', description: '' }]);
  };

  const updateCriterion = (index: number, field: 'name' | 'description', val: string) => {
    const updated = [...criteria];
    updated[index][field] = val;
    setCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 2) {
      alert('AHP 분석을 위해 최소 2개 이상의 평가 기준이 필요합니다.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
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

  // Question calculations
  const criteriaPairCount = (criteria.length * (criteria.length - 1)) / 2;
  const altPairPerCrit = hasAlternatives ? (alternatives.length * (alternatives.length - 1)) / 2 : 0;
  const totalPairwiseQuestions = criteriaPairCount + (hasAlternatives ? criteria.length * altPairPerCrit : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    if (hasAlternatives) {
      const emptyAlt = alternatives.some(a => !a.name.trim());
      if (emptyAlt) {
        setError('모든 대안의 이름을 입력해주세요.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          criteria: criteria.map(c => ({ id: c.id, name: c.name.trim(), description: c.description.trim() })),
          alternatives: hasAlternatives
            ? alternatives.map(a => ({ id: a.id, name: a.name.trim(), description: a.description.trim() }))
            : [],
          hasAlternatives,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '설문 생성에 실패했습니다.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('서버와 통신할 수 없습니다.');
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">새 AHP 설문지 만들기</h1>
          <p className="text-sm text-slate-600 mt-1">
            평가 기준과 대안을 등록하면 Saaty 표준 9점 척도 쌍대비교 문항이 자동으로 생성됩니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Info */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
              설문 기본 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  설문 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 클라우드 인프라 솔루션 선정을 위한 AHP 평가 조사"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  설문 목적 및 설명 (응답자 안내문)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="응답자에게 설문의 취지와 평가 기준에 대한 배경 설명을 전달합니다."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Criteria */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
                평가 기준 (Criteria) 설정
                <span className="text-xs font-normal text-slate-500">({criteria.length}개 항목)</span>
              </h2>
              <button
                type="button"
                onClick={addCriterion}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                기준 추가
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              의사결정에 영향을 미치는 주요 요인을 정의합니다. (최소 2개 이상 필요)
            </p>

            <div className="space-y-3">
              {criteria.map((crit, idx) => (
                <div key={crit.id} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-indigo-600 mt-2.5 w-6 text-center shrink-0">
                    C{idx + 1}
                  </span>
                  <div className="flex-1 grid sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={crit.name}
                      onChange={e => updateCriterion(idx, 'name', e.target.value)}
                      placeholder="기준 이름 (예: 가격 및 비용)"
                      className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={crit.description}
                      onChange={e => updateCriterion(idx, 'description', e.target.value)}
                      placeholder="기준 세부 설명 (선택)"
                      className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    title="삭제"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Alternatives Mode */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
                대안 (Alternatives) 평가 여부
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAlternatives}
                  onChange={e => setHasAlternatives(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {hasAlternatives ? (
              <div>
                <p className="text-xs text-slate-500 mb-4">
                  평가 대상이 되는 최종 후보(제품, 공급업체, 정책 등)를 등록합니다. 각 평가 기준별로 대안 간 쌍대비교가 수행됩니다.
                </p>

                <div className="space-y-3 mb-4">
                  {alternatives.map((alt, idx) => (
                    <div key={alt.id} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-emerald-600 mt-2.5 w-6 text-center shrink-0">
                        A{idx + 1}
                      </span>
                      <div className="flex-1 grid sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={alt.name}
                          onChange={e => updateAlternative(idx, 'name', e.target.value)}
                          placeholder="대안 이름 (예: 대안 A)"
                          className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="text"
                          value={alt.description}
                          onChange={e => updateAlternative(idx, 'description', e.target.value)}
                          placeholder="대안 세부 설명 (선택)"
                          className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAlternative(idx)}
                        title="삭제"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addAlternative}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  대안 추가
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                💡 대안 평가를 비활성화하면, 평가 기준들의 가중치(중요도 순위)만 도출하는 설문으로 생성됩니다.
              </p>
            )}
          </div>

          {/* Section 4: Summary & Question Count Preview */}
          <div className="bg-indigo-50/70 p-6 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                예상 쌍대비교 문항 수 계산
              </h3>
              <p className="text-xs text-indigo-700">
                • 평가 기준 쌍대비교: <strong>{criteriaPairCount}문항</strong> <br />
                {hasAlternatives && (
                  <span>
                    • 대안 평가 쌍대비교: <strong>{criteria.length}개 기준 × {altPairPerCrit}문항 = {criteria.length * altPairPerCrit}문항</strong>
                  </span>
                )}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">총 설문 문항</span>
              <span className="text-3xl font-extrabold text-indigo-900">{totalPairwiseQuestions}개 문항</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? '설문 생성 중...' : '설문 생성 및 배포 준비 완료'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
