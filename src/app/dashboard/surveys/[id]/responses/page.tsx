'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Pencil,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react';

interface DemographicQuestion {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
  required: boolean;
}

interface CriterionItem {
  id: string;
  name: string;
  description?: string;
  subcriteria?: Array<{ id: string; name: string; description?: string }>;
}

interface AlternativeItem {
  id: string;
  name: string;
  description?: string;
}

interface SurveyData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  criteria: CriterionItem[];
  alternatives: AlternativeItem[];
  hasAlternatives: boolean;
  demographics: DemographicQuestion[];
}

interface ResponseItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isValid: boolean;
  criteriaCR: number;
  criteriaCI: number;
  subcriteriaCR: Record<string, number>;
  alternativesCR: Record<string, number>;
  demographics: Record<string, string>;
  answers: {
    criteria?: Record<string, number>;
    subcriteria?: Record<string, Record<string, number>>;
    alternatives?: Record<string, Record<string, number>>;
  };
}

function formatPairwiseAnswer(val: number | undefined, nameA: string, nameB: string) {
  if (val === undefined) return { label: '미응답', color: 'text-slate-400 bg-slate-100', side: 'none' };
  if (val === 1) return { label: '동등 (1)', color: 'text-slate-700 bg-slate-100', side: 'equal' };
  if (val > 1) {
    const text = val === 9 ? '절대적 중요 (9)' : val === 7 ? '매우 중요 (7)' : val === 5 ? '확실히 중요 (5)' : val === 3 ? '약간 중요 (3)' : `중요 (${val})`;
    return { label: `[${nameA}] ${text}`, color: 'text-indigo-700 bg-indigo-50 border border-indigo-200', side: 'left' };
  }
  const absVal = Math.abs(val);
  const text = absVal === 9 ? '절대적 중요 (9)' : absVal === 7 ? '매우 중요 (7)' : absVal === 5 ? '확실히 중요 (5)' : absVal === 3 ? '약간 중요 (3)' : `중요 (${absVal})`;
  return { label: `[${nameB}] ${text}`, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', side: 'right' };
}

export default function SurveyResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [validityFilter, setValidityFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

  // Selected response for detail modal
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResponses = async () => {
    try {
      const res = await fetch(`/api/surveys/${id}/responses`);
      if (!res.ok) throw new Error('응답 데이터를 불러올 수 없습니다.');
      const data = await res.json();
      setSurvey(data.survey);
      const list = data.responses || [];
      setResponses(list);

      // URL에 selectedId가 있을 경우 바로 모달 띄우기
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const selId = urlParams.get('selectedId');
        if (selId) {
          const matched = list.find((r: any) => r.id === selId);
          if (matched) setSelectedResponse(matched);
        }
      }
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchResponses();
  }, [id]);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      // Validity filter
      if (validityFilter === 'VALID' && !r.isValid) return false;
      if (validityFilter === 'INVALID' && r.isValid) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = r.name?.toLowerCase().includes(query);
        const matchEmail = r.email?.toLowerCase().includes(query);
        const matchDemo = Object.values(r.demographics || {}).some(v =>
          String(v).toLowerCase().includes(query)
        );
        return matchName || matchEmail || matchDemo;
      }
      return true;
    });
  }, [responses, validityFilter, searchQuery]);

  // Response count stats
  const totalCount = responses.length;
  const validCount = responses.filter(r => r.isValid).length;
  const invalidCount = totalCount - validCount;
  const validRate = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 0;

  // Delete individual response handler
  const handleDeleteResponse = async (respId: string) => {
    if (!confirm('정말로 이 응답을 삭제하시겠습니까? 삭제된 응답은 복구할 수 없습니다.')) return;
    setDeletingId(respId);
    try {
      const res = await fetch(`/api/surveys/${id}/responses?responseId=${respId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setResponses(prev => prev.filter(r => r.id !== respId));
        if (selectedResponse?.id === respId) {
          setSelectedResponse(null);
        }
      } else {
        alert('응답 삭제에 실패했습니다.');
      }
    } catch {
      alert('서버와 통신할 수 없습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">설문 응답 목록을 불러오는 중입니다...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !survey) {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">설문 응답을 불러올 수 없습니다</h2>
          <p className="text-sm text-slate-500 mb-6">{error || '설문이 존재하지 않습니다.'}</p>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
                  설문 응답자 목록 및 내용 확인
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    survey.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {survey.status === 'ACTIVE' ? '배포 중' : '배포 중지됨'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                '{survey.title}' 설문에 제출된 개별 응답자 인적사항과 세부 응답 내용을 확인합니다.
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              href={`/dashboard/surveys/${id}/analysis`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>종합 결과 분석</span>
            </Link>
            <Link
              href={`/dashboard/surveys/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>설문 수정</span>
            </Link>
            <a
              href={`/api/surveys/${id}/export/excel`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel 다운로드</span>
            </a>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 응답 수</p>
              <p className="text-2xl font-bold text-slate-900">{totalCount}명</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">적합 응답 (CR ≤ 0.10)</p>
              <p className="text-2xl font-bold text-emerald-600">{validCount}명</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">일관성 주의 (CR &gt; 0.10)</p>
              <p className="text-2xl font-bold text-amber-600">{invalidCount}명</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">데이터 유효 적합률</p>
              <p className="text-2xl font-bold text-purple-600">{validRate}%</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="응답자 이름, 이메일, 인적사항 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setValidityFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                validityFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              전체 보기 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setValidityFilter('VALID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1 ${
                validityFilter === 'VALID'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-emerald-700 border-slate-200 hover:bg-emerald-50'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>신뢰 기준 충족 ({validCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setValidityFilter('INVALID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1 ${
                validityFilter === 'INVALID'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-amber-700 border-slate-200 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>일관성 주의 ({invalidCount})</span>
            </button>
          </div>
        </div>

        {/* Responses Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredResponses.length === 0 ? (
            <div className="text-center py-16 p-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">
                {responses.length === 0 ? '수집된 응답이 없습니다' : '조건에 일치하는 응답이 없습니다'}
              </h3>
              <p className="text-xs text-slate-400">
                {responses.length === 0
                  ? '설문 참여 링크를 복사하여 응답자들에게 전달해 보세요.'
                  : '검색어나 필터 조건을 변경해 보세요.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-bold w-12 text-center">#</th>
                    <th className="py-3 px-4 font-bold">응답자 성명</th>
                    <th className="py-3 px-4 font-bold">이메일</th>
                    {/* Dynamic Demographics Columns */}
                    {survey.demographics?.map(demo => (
                      <th key={demo.id} className="py-3 px-4 font-bold text-indigo-950 whitespace-nowrap">
                        {demo.title}
                      </th>
                    ))}
                    <th className="py-3 px-4 font-bold whitespace-nowrap">응답 일시</th>
                    <th className="py-3 px-4 font-bold text-right whitespace-nowrap">대분류 CR</th>
                    <th className="py-3 px-4 font-bold text-center whitespace-nowrap">신뢰성 판정</th>
                    <th className="py-3 px-4 font-bold text-center w-28 whitespace-nowrap">상세 내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResponses.map((resp, idx) => (
                    <tr
                      key={resp.id}
                      onClick={() => setSelectedResponse(resp)}
                      className="hover:bg-indigo-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-center">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {resp.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {resp.email || '-'}
                      </td>
                      {/* Demographics Answers */}
                      {survey.demographics?.map(demo => (
                        <td key={demo.id} className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {resp.demographics?.[demo.id] ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs">
                              {resp.demographics[demo.id]}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(resp.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {resp.criteriaCR.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            resp.isValid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {resp.isValid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>적합 (CR ≤ 0.1)</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>주의 (CR &gt; 0.1)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponse(resp);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>내용 확인</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ================= RESPONSE DETAIL MODAL ================= */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    <Users className="w-4 h-4" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    [{selectedResponse.name}] 님의 설문 응답 상세
                  </h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      selectedResponse.isValid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {selectedResponse.isValid ? '신뢰 기준 충족' : '일관성 주의'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pl-9">
                  <span>이메일: <strong>{selectedResponse.email || '미입력 (익명)'}</strong></span>
                  <span>•</span>
                  <span>제출 일시: {new Date(selectedResponse.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 no-scrollbar">
              {/* SECTION 1: Demographics Card (인적사항 상세 확인) */}
              <div className="p-5 rounded-2xl bg-violet-50/60 border border-violet-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                    i
                  </span>
                  <h3 className="text-sm font-bold text-violet-950 uppercase tracking-wider">
                    작성된 인적사항 (프로필 답변)
                  </h3>
                </div>

                {survey.demographics && survey.demographics.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {survey.demographics.map(demo => {
                      const ans = selectedResponse.demographics?.[demo.id];
                      return (
                        <div
                          key={demo.id}
                          className="p-3.5 bg-white rounded-xl border border-violet-100 shadow-2xs"
                        >
                          <span className="block text-[11px] font-bold text-slate-500 mb-1">
                            {demo.title} {demo.required && <span className="text-rose-500">*</span>}
                          </span>
                          <span className="text-sm font-bold text-slate-900 block">
                            {ans ? ans : <span className="text-slate-400 font-normal">미응답</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    설문 작성 시 설정된 인적사항 문항이 없습니다.
                  </p>
                )}
              </div>

              {/* SECTION 2: CR Consistency Diagnosis */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  일관성 비율(CR) 진단 결과
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-1">1단계 대분류 CR</span>
                    <strong className="text-base font-mono font-bold text-slate-900 block">
                      {selectedResponse.criteriaCR.toFixed(4)}
                    </strong>
                    <span className={selectedResponse.criteriaCR <= 0.1 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {selectedResponse.criteriaCR <= 0.1 ? '✅ 기준 충족' : '⚠️ 일관성 주의'}
                    </span>
                  </div>

                  {Object.entries(selectedResponse.subcriteriaCR || {}).map(([critId, crVal]) => {
                    const critObj = survey.criteria.find(c => c.id === critId);
                    return (
                      <div key={critId} className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block mb-1 truncate">
                          [{critObj?.name || critId}] 세부영역
                        </span>
                        <strong className="text-base font-mono font-bold text-slate-900 block">
                          {Number(crVal).toFixed(4)}
                        </strong>
                        <span className={Number(crVal) <= 0.1 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {Number(crVal) <= 0.1 ? '✅ 기준 충족' : '⚠️ 일관성 주의'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Step 1 Criteria Pairwise Choices */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  1단계: 평가 기준(대분류) 간 쌍대비교 응답
                </h3>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">항목 A</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-12">VS</th>
                        <th className="py-2.5 px-3 font-semibold">항목 B</th>
                        <th className="py-2.5 px-3 font-semibold text-right">응답자의 선택 결과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const pairs: any[] = [];
                        const crits = survey.criteria || [];
                        const n = crits.length;
                        for (let i = 0; i < n; i++) {
                          for (let j = i + 1; j < n; j++) {
                            const key = `${crits[i].id}_${crits[j].id}`;
                            const val = selectedResponse.answers?.criteria?.[key];
                            const formatted = formatPairwiseAnswer(val, crits[i].name, crits[j].name);
                            pairs.push(
                              <tr key={key} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-medium text-slate-800">{crits[i].name}</td>
                                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">vs</td>
                                <td className="py-2.5 px-3 font-medium text-slate-800">{crits[j].name}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${formatted.color}`}>
                                    {formatted.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        }
                        return pairs;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 4: Step 2 Subcriteria Pairwise Choices */}
              {survey.criteria.some(c => (c.subcriteria || []).length >= 2) && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                      2
                    </span>
                    2단계: 대분류별 하위 세부영역 간 쌍대비교 응답
                  </h3>

                  {survey.criteria.filter(c => (c.subcriteria || []).length >= 2).map(crit => {
                    const subs = crit.subcriteria || [];
                    const k = subs.length;
                    const critAnswers = selectedResponse.answers?.subcriteria?.[crit.id] || {};

                    return (
                      <div key={crit.id} className="border border-purple-100 rounded-2xl overflow-hidden bg-purple-50/20">
                        <div className="px-3.5 py-2 bg-purple-100/60 border-b border-purple-200 text-xs font-bold text-purple-900">
                          [{crit.name}] 세부영역 간 비교
                        </div>
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-2 px-3 font-semibold">세부영역 A</th>
                              <th className="py-2 px-3 font-semibold text-center w-12">VS</th>
                              <th className="py-2 px-3 font-semibold">세부영역 B</th>
                              <th className="py-2 px-3 font-semibold text-right">응답자의 선택 결과</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {(() => {
                              const subRows: any[] = [];
                              for (let i = 0; i < k; i++) {
                                for (let j = i + 1; j < k; j++) {
                                  const key = `${subs[i].id}_${subs[j].id}`;
                                  const val = critAnswers[key];
                                  const formatted = formatPairwiseAnswer(val, subs[i].name, subs[j].name);
                                  subRows.push(
                                    <tr key={key} className="hover:bg-slate-50/50">
                                      <td className="py-2 px-3 font-medium text-slate-800">{subs[i].name}</td>
                                      <td className="py-2 px-3 text-center text-slate-400 font-bold">vs</td>
                                      <td className="py-2 px-3 font-medium text-slate-800">{subs[j].name}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${formatted.color}`}>
                                          {formatted.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                }
                              }
                              return subRows;
                            })()}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => handleDeleteResponse(selectedResponse.id)}
                disabled={deletingId === selectedResponse.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-100/70 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingId === selectedResponse.id ? '삭제 중...' : '이 응답 삭제'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
