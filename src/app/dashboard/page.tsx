'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  PlusCircle,
  Share2,
  BarChart3,
  PauseCircle,
  PlayCircle,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Clock,
  Users,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface SurveyItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  criteria: any[];
  alternatives: any[];
  hasAlternatives: boolean;
  responseCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleToggleStatus = async (survey: SurveyItem) => {
    const nextStatus = survey.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setActionLoadingId(survey.id);

    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setSurveys(prev =>
          prev.map(s => (s.id === survey.id ? { ...s, status: nextStatus } : s))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`'${title}' 설문과 수집된 모든 응답을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSurveys(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalResponses = surveys.reduce((acc, s) => acc + (s.responseCount || 0), 0);
  const activeCount = surveys.filter(s => s.status === 'ACTIVE').length;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">내 AHP 설문 관리</h1>
            <p className="text-sm text-slate-600 mt-1">
              배포 중인 설문을 모니터링하고 실시간으로 수집된 데이터를 분석하세요.
            </p>
          </div>
          <Link
            href="/dashboard/surveys/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            새 설문 만들기
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 설문</p>
              <p className="text-2xl font-bold text-slate-900">{surveys.length}건</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">현재 배포 중</p>
              <p className="text-2xl font-bold text-emerald-600">{activeCount}건</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">총 수집 응답 수</p>
              <p className="text-2xl font-bold text-blue-600">{totalResponses}명</p>
            </div>
          </div>
        </div>

        {/* Survey List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">아직 생성된 설문이 없습니다</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              첫 번째 AHP 계층분석 설문을 생성하여 동료 및 응답자들에게 배포해 보세요!
            </p>
            <Link
              href="/dashboard/surveys/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              첫 AHP 설문 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {surveys.map(survey => {
              const isClosed = survey.status === 'CLOSED';
              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-200 shadow-sm p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isClosed
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isClosed ? '배포 중지됨' : '배포 중'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(survey.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 truncate mb-1">
                      {survey.title}
                    </h2>
                    {survey.description && (
                      <p className="text-sm text-slate-500 truncate mb-2 max-w-xl">
                        {survey.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>평가 기준 <strong>{survey.criteria?.length || 0}</strong>개</span>
                      <span>•</span>
                      <span>
                        {survey.hasAlternatives
                          ? `대안 ${survey.alternatives?.length || 0}개`
                          : '기준 가중치 단독'}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600">
                        응답 <strong>{survey.responseCount}</strong>건 수집
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {/* Share Link Copy */}
                    <button
                      onClick={() => handleCopyLink(survey.slug)}
                      title="설문 참여 링크 복사"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                    >
                      {copiedSlug === survey.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">링크 복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>링크 복사</span>
                        </>
                      )}
                    </button>

                    {/* Toggle Stop / Resume */}
                    <button
                      onClick={() => handleToggleStatus(survey)}
                      disabled={actionLoadingId === survey.id}
                      title={isClosed ? '배포 재개' : '배포 중지'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        isClosed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {isClosed ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>배포 재개</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>배포 중지</span>
                        </>
                      )}
                    </button>

                    {/* Analysis Dashboard */}
                    <Link
                      href={`/dashboard/surveys/${survey.id}/analysis`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>결과 분석 (그래프/표)</span>
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(survey.id, survey.title)}
                      title="설문 삭제"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
