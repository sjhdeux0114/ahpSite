'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BarChartComponent from '@/components/analysis/BarChartComponent';
import MatrixTable from '@/components/analysis/MatrixTable';
import RadarChartComponent from '@/components/analysis/RadarChartComponent';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  PauseCircle,
  PlayCircle,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  Filter,
  Layers,
  Copy,
  Check,
  BookOpen,
  TrendingUp,
  GitCompare,
  Pencil,
  Share2,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react';
import HierarchyTreeDiagram from '@/components/thesis/HierarchyTreeDiagram';
import ThesisReportHelper from '@/components/thesis/ThesisReportHelper';
import SensitivityAnalysis from '@/components/analysis/SensitivityAnalysis';
import GroupComparisonAnalysis from '@/components/analysis/GroupComparisonAnalysis';

export interface SurveyAnalysisViewProps {
  data: any;
  loading: boolean;
  onlyValid: boolean;
  setOnlyValid: (valid: boolean) => void;
  statusLoading?: boolean;
  onToggleStatus?: () => Promise<void> | void;
  isPublicPage?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function SurveyAnalysisView({
  data,
  loading,
  onlyValid,
  setOnlyValid,
  statusLoading = false,
  onToggleStatus,
  isPublicPage = false,
  backHref,
  backLabel,
}: SurveyAnalysisViewProps) {
  const [copiedSurveyLink, setCopiedSurveyLink] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!data?.survey) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">설문 데이터를 불러올 수 없습니다.</h2>
        <p className="text-xs text-slate-500 mb-6">존재하지 않거나 삭제된 설문입니다.</p>
        <Link
          href={backHref || '/'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {backLabel || '홈으로 이동'}
        </Link>
      </div>
    );
  }

  const { survey: rawSurvey, analysis, responses = [], isOwner, isLoggedIn } = data;
  const isClosed = rawSurvey?.status === 'CLOSED';
  const threshold = Number(rawSurvey?.consistencyThreshold ?? 0.1);
  const thLabel = threshold.toFixed(2);

  // Parse JSON helpers
  const parseJsonSafe = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return [];
  };

  const survey = {
    ...rawSurvey,
    criteria: parseJsonSafe(rawSurvey?.criteria),
    alternatives: parseJsonSafe(rawSurvey?.alternatives),
    demographics: parseJsonSafe(rawSurvey?.demographics),
  };

  // Determine permissions
  const canViewPrivateDetails = Boolean(isLoggedIn && isOwner);

  // URLs
  const getBaseOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  };

  const surveyParticipationUrl = `${getBaseOrigin()}/s/${survey.slug}`;
  const surveyShareUrl = `${getBaseOrigin()}/s/${survey.slug}/analysis`;

  const handleCopySurveyLink = () => {
    navigator.clipboard.writeText(surveyParticipationUrl);
    setCopiedSurveyLink(true);
    setTimeout(() => setCopiedSurveyLink(false), 2000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(surveyShareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const handleOpenShare = () => {
    handleCopyShareLink();
    setShowShareModal(true);
  };

  // Criteria bar chart items
  const criteriaBarItems = survey.criteria.map((c: any, idx: number) => ({
    name: c.name,
    description: c.description,
    weight: analysis?.criteriaAHP?.weights[idx] || 0,
  }));

  // Subcriteria bar chart items
  const subcriteriaBarItems = (analysis?.allSubcriteria || []).map((s: any) => ({
    name: `${s.name} (${s.criterionName})`,
    description: `대분류: ${s.criterionName} | 국소 비중: ${(s.localWeight * 100).toFixed(1)}%`,
    weight: s.globalWeight || 0,
  }));

  // Alternative bar chart items
  const alternativeBarItems =
    survey.hasAlternatives && analysis?.finalAlternativeWeights
      ? survey.alternatives.map((a: any, idx: number) => ({
          name: a.name,
          description: a.description,
          weight: analysis.finalAlternativeWeights.alternativeWeights[idx] || 0,
        }))
      : [];

  const winningAlternative =
    alternativeBarItems.length > 0
      ? [...alternativeBarItems].sort((a, b) => b.weight - a.weight)[0]
      : null;

  // 계층도용 criteria 데이터
  const hierarchyCriteria = survey.criteria.map((c: any, idx: number) => {
    const critWeight = analysis?.criteriaAHP?.weights?.[idx];
    const subcriteria = (c.subcriteria || []).map((s: any) => {
      const subItem = (analysis?.allSubcriteria || []).find(
        (as: any) => as.id === s.id || (as.name === s.name && as.criterionName === c.name)
      );
      return {
        id: s.id,
        name: s.name,
        localWeight: subItem?.localWeight,
        globalWeight: subItem?.globalWeight,
      };
    });
    return {
      id: c.id,
      name: c.name,
      weight: critWeight,
      subcriteria,
    };
  });

  // 계층도용 alternatives 데이터
  const hierarchyAlternatives =
    survey.hasAlternatives && survey.alternatives
      ? survey.alternatives.map((a: any, idx: number) => ({
          id: a.id,
          name: a.name,
          weight: analysis?.finalAlternativeWeights?.alternativeWeights?.[idx],
        }))
      : [];

  const defaultBackHref = isOwner ? '/dashboard' : '/';
  const defaultBackLabel = isOwner ? '대시보드로 돌아가기' : '홈으로 이동';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href={backHref || defaultBackHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel || defaultBackLabel}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {survey.title}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                isClosed
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isClosed ? '배포 중지됨' : '배포 중'}
            </span>
            {isPublicPage && isOwner && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                내 설문
              </span>
            )}
          </div>
          {survey.description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">{survey.description}</p>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Result Analysis Button - Primary Highlight */}
          <button
            onClick={handleOpenShare}
            title="AHP 결과 분석 그래프를 누구나 볼 수 있는 링크로 공유합니다"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            {copiedShareLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>공유 링크 복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>결과 공유하기</span>
              </>
            )}
          </button>

          {/* Copy Survey Link */}
          <button
            onClick={handleCopySurveyLink}
            title="설문 응답 참여 링크 복사"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            {copiedSurveyLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">설문 링크 복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>설문 링크 복사</span>
              </>
            )}
          </button>

          {/* If Guest and Survey is Active, offer to participate */}
          {!isOwner && !isClosed && (
            <Link
              href={`/s/${survey.slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold shadow-xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>설문 직접 참여하기</span>
            </Link>
          )}

          {/* Switch to Management Page if Owner is on Public View */}
          {isPublicPage && isOwner && (
            <Link
              href={`/dashboard/surveys/${survey.id}/analysis`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs transition"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>관리 대시보드로 이동</span>
            </Link>
          )}

          {/* Owner Only: Edit Survey */}
          {isOwner && (
            <Link
              href={`/dashboard/surveys/${survey.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>설문 수정</span>
            </Link>
          )}

          {/* Owner Only: Toggle Status */}
          {isOwner && onToggleStatus && (
            <button
              onClick={onToggleStatus}
              disabled={statusLoading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border shadow-xs ${
                isClosed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {isClosed ? (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>배포 재개</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4" />
                  <span>배포 중지</span>
                </>
              )}
            </button>
          )}

          {/* Owner Only: View Responses & Demographics */}
          {isOwner && (
            <Link
              href={`/dashboard/surveys/${survey.id}/responses`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs transition"
            >
              <Users className="w-4 h-4" />
              <span>응답자 목록 및 인적사항</span>
            </Link>
          )}

          {/* Owner Only: Excel Download */}
          {isOwner && (
            <a
              href={`/api/surveys/${survey.id}/export/excel`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel 다운로드</span>
            </a>
          )}

          {/* Owner Only: Word Download */}
          {isOwner && (
            <a
              href={`/api/surveys/${survey.id}/export/word`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Word 보고서 다운로드</span>
            </a>
          )}

          {/* Thesis Shortcut Buttons */}
          <a
            href="#thesis-helper-section"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>논문 작성 도우미</span>
          </a>

          <a
            href="#hierarchy-tree-section"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>연구 모형도(계층도)</span>
          </a>

          <a
            href="#sensitivity-analysis-section"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition shadow-2xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>대안 민감도 분석</span>
          </a>

          <a
            href="#group-comparison-section"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-2xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
            <span>집단별 비교 분석</span>
          </a>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">총 수집 응답</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {analysis?.totalResponses || 0}
            <span className="text-sm font-normal text-slate-500 ml-1">명</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">신뢰 응답 (CR ≤ {thLabel})</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {analysis?.validResponsesCount || 0}
            <span className="text-sm font-normal text-slate-500 ml-1">명</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {analysis?.hasSubcriteria ? '계층 종합 일관성(CR)' : '집단 일관성(CR)'}
            </span>
            {(analysis?.hasSubcriteria ? analysis?.isHierarchyConsistent : analysis?.criteriaAHP?.isConsistent) ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold ${
              (analysis?.hasSubcriteria ? analysis?.isHierarchyConsistent : analysis?.criteriaAHP?.isConsistent)
                ? 'text-slate-900'
                : 'text-rose-600'
            }`}
          >
            {analysis?.hasSubcriteria
              ? analysis?.compositeCR?.toFixed(4) || '0.0000'
              : analysis?.criteriaAHP?.cr?.toFixed(4) || '0.0000'}
          </p>
          {analysis?.hasSubcriteria && (
            <span className="text-[11px] text-slate-400 block mt-0.5">
              (대분류 CR: {analysis?.criteriaAHP?.cr?.toFixed(4)})
            </span>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">분석 필터</span>
            <Filter className="w-4 h-4 text-indigo-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={onlyValid}
              onChange={e => setOnlyValid(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>신뢰 응답(CR ≤ {thLabel})만 집계</span>
          </label>
        </div>
      </div>

      {/* Winner Highlight Banner if alternatives exist */}
      {winningAlternative && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-xl shadow-indigo-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-indigo-200 font-bold block mb-1">
                AHP 종합 최우선 1위 대안
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {winningAlternative.name}
              </h2>
              {winningAlternative.description && (
                <p className="text-xs text-indigo-200 mt-1">{winningAlternative.description}</p>
              )}
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-white/15 sm:pl-8 shrink-0">
            <span className="text-xs text-indigo-200 block uppercase">종합 기여 가중치</span>
            <span className="text-3xl sm:text-4xl font-black text-amber-300">
              {(winningAlternative.weight * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Section: AHP Hierarchy Tree Diagram */}
      <div id="hierarchy-tree-section" className="mb-8 scroll-mt-6">
        <HierarchyTreeDiagram
          title={survey.title}
          criteria={hierarchyCriteria}
          alternatives={hierarchyAlternatives}
          hasAlternatives={survey.hasAlternatives}
          hasSubcriteria={survey.hasSubcriteria}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Subcriteria Rankings Chart (Full Width) */}
        {subcriteriaBarItems.length > 0 && (
          <div className="lg:col-span-2">
            <BarChartComponent
              title="하위 세부영역(Sub-criteria) 종합 전역 우선순위 (Global Weights)"
              items={subcriteriaBarItems}
              color="purple"
            />
          </div>
        )}

        {/* Criteria Weights Chart */}
        <BarChartComponent
          title="상위 대분류(Criteria) 중요도 가중치"
          items={criteriaBarItems}
          color="indigo"
        />

        {/* Alternative Rankings Chart */}
        {alternativeBarItems.length > 0 && (
          <BarChartComponent
            title="대안(Alternatives) 종합 우선순위 가중치"
            items={alternativeBarItems}
            color="emerald"
          />
        )}

        {/* Multi-criteria Radar Chart */}
        {survey.hasAlternatives &&
          analysis?.finalAlternativeWeights?.contributionMatrix &&
          survey.criteria.length >= 3 && (
            <div className="lg:col-span-2">
              <RadarChartComponent
                criteria={survey.criteria}
                alternatives={survey.alternatives}
                contributionMatrix={analysis.finalAlternativeWeights.contributionMatrix}
              />
            </div>
          )}
      </div>

      {/* Section: Alternative Sensitivity Analysis */}
      <div id="sensitivity-analysis-section" className="mb-8 scroll-mt-6">
        <SensitivityAnalysis
          criteria={survey.criteria}
          alternatives={survey.alternatives || []}
          criteriaWeights={analysis?.criteriaAHP?.weights || []}
          alternativesAHPByCriteria={analysis?.alternativesAHPByCriteria || {}}
          hasAlternatives={survey.hasAlternatives}
        />
      </div>

      {/* Hierarchical Breakdown Table if subcriteria exist */}
      {analysis?.hasSubcriteria && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm mb-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                AHP 다계층 (대분류 - 세부영역) 종합 분석표
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                각 대분류 내 상대적 국소 가중치(Local)와 전체 기준 종합 전역 가중치(Global) 산출 결과입니다.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-100 shrink-0">
              계층 종합 CR_H: {analysis?.compositeCR?.toFixed(4)} ({analysis?.isHierarchyConsistent ? '일관성 충족' : '기준치 초과'})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">대분류 (가중치)</th>
                  <th className="py-2.5 px-3 font-semibold">하위 세부영역</th>
                  <th className="py-2.5 px-3 font-semibold text-right">국소 가중치(Local)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">종합 전역 가중치(Global)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">전체 종합 순위</th>
                  <th className="py-2.5 px-3 font-semibold text-right">세부영역 CR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {survey.criteria.map((crit: any, cIdx: number) => {
                  const critW = analysis?.criteriaAHP?.weights[cIdx] || 0;
                  const subs = crit.subcriteria || [];
                  const subAHP = analysis?.subcriteriaAHPByCriteria?.[crit.id];

                  if (subs.length === 0) {
                    return (
                      <tr key={crit.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-indigo-900">{crit.name} ({(critW * 100).toFixed(2)}%)</td>
                        <td className="py-2.5 px-3 text-slate-400 italic" colSpan={5}>하위 세부영역 없음</td>
                      </tr>
                    );
                  }

                  return subs.map((sub: any, sIdx: number) => {
                    const localW = subAHP?.weights[sIdx] || 0;
                    const globalItem = analysis?.allSubcriteria?.find((it: any) => it.id === sub.id);

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70">
                        {sIdx === 0 && (
                          <td
                            rowSpan={subs.length}
                            className="py-2.5 px-3 font-bold text-indigo-900 bg-slate-50/50 border-r border-slate-100 align-top"
                          >
                            <div>{crit.name}</div>
                            <div className="text-xs font-mono text-indigo-600 mt-0.5">
                              {(critW * 100).toFixed(2)}%
                            </div>
                            {crit.description && (
                              <div className="text-[11px] text-slate-400 font-normal mt-1">{crit.description}</div>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {sub.name}
                          {sub.description && (
                            <span className="text-[11px] text-slate-400 font-normal block">{sub.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {(localW * 100).toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                          {globalItem ? `${(globalItem.globalWeight * 100).toFixed(2)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {globalItem && (
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              globalItem.globalRank === 1
                                ? 'bg-amber-100 text-amber-900'
                                : globalItem.globalRank <= 3
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {globalItem.globalRank}
                            </span>
                          )}
                        </td>
                        {sIdx === 0 && (
                          <td
                            rowSpan={subs.length}
                            className="py-2.5 px-3 text-right font-mono text-xs border-l border-slate-100 align-middle"
                          >
                            <span className={`font-bold ${subAHP?.isConsistent ? 'text-emerald-600' : 'text-rose-600'}`}>
                              CR {subAHP?.cr?.toFixed(4) || '-'}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section: Thesis Report Helper */}
      <div id="thesis-helper-section" className="mb-8 scroll-mt-6">
        <ThesisReportHelper
          survey={survey}
          analysis={analysis}
          responses={responses}
          isLoggedIn={canViewPrivateDetails}
        />
      </div>

      {/* Pairwise Reciprocal Matrix Table */}
      {analysis?.criteriaAHP && (
        <div className="mb-8">
          <MatrixTable
            title="대분류(Criteria) 집단 기하평균 쌍대비교 행렬"
            items={survey.criteria}
            ahpResult={analysis.criteriaAHP}
          />
        </div>
      )}

      {/* Section: Group Comparison Cross Analysis */}
      <div id="group-comparison-section" className="mb-8 scroll-mt-6">
        <GroupComparisonAnalysis
          survey={survey}
          responses={responses}
        />
      </div>

      {/* Demographics Breakdown Summary: Visible ONLY when logged in and owner */}
      {canViewPrivateDetails && survey.demographics && survey.demographics.length > 0 && responses.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm mb-8">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            응답자 인적사항 (프로필) 분포 현황
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {survey.demographics.map((demo: any) => {
              const countMap: Record<string, number> = {};
              responses.forEach((r: any) => {
                const val = r.demographics?.[demo.id];
                if (val) countMap[val] = (countMap[val] || 0) + 1;
              });

              return (
                <div key={demo.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-2">{demo.title}</span>
                  <div className="space-y-1">
                    {Object.keys(countMap).length === 0 ? (
                      <span className="text-xs text-slate-400">응답 데이터 없음</span>
                    ) : (
                      Object.entries(countMap).map(([opt, count]) => {
                        const pct = Math.round((count / responses.length) * 100);
                        return (
                          <div key={opt} className="flex items-center justify-between text-xs text-slate-600">
                            <span className="truncate max-w-[140px] font-medium">{opt}</span>
                            <span className="font-bold text-indigo-700">
                              {count}명 ({pct}%)
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Respondents Table: Visible ONLY when logged in and owner */}
      {canViewPrivateDetails && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                응답자별 데이터 및 일관성 검증 내역
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                응답자의 인적사항 및 개별 쌍대비교 답변 내역을 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                총 {responses.length}명 참여
              </span>
              <Link
                href={`/dashboard/surveys/${survey.id}/responses`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>응답 전체 관리 / 인적사항 확인 →</span>
              </Link>
            </div>
          </div>

          {responses.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              아직 수집된 응답이 없습니다. 설문 링크를 복사하여 응답자에게 배포하세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">응답자</th>
                    <th className="py-2.5 px-3 font-semibold">이메일</th>
                    {survey.demographics?.map((demo: any) => (
                      <th key={demo.id} className="py-2.5 px-3 font-semibold text-slate-700">
                        {demo.title}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold">응답 일시</th>
                    <th className="py-2.5 px-3 font-semibold text-right">기준 CR</th>
                    <th className="py-2.5 px-3 font-semibold text-center">신뢰도 통과 여부</th>
                    <th className="py-2.5 px-3 font-semibold text-center">상세보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responses.map((resp: any, idx: number) => (
                    <tr key={resp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{resp.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{resp.email || '-'}</td>
                      {survey.demographics?.map((demo: any) => (
                        <td key={demo.id} className="py-2.5 px-3 text-slate-700 font-medium">
                          {resp.demographics?.[demo.id] || '-'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {new Date(resp.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {resp.criteriaCR.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            resp.isValid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {resp.isValid ? `적합 (CR ≤ ${thLabel})` : `부적합 (CR > ${thLabel})`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/dashboard/surveys/${survey.id}/responses?selectedId=${resp.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                        >
                          상세보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AHP 결과 분석 공유하기</h3>
                  <p className="text-xs text-slate-500">누구나 로그인 없이 결과 그래프를 열람할 수 있습니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* URL Input Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">결과 공개 열람 링크</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={surveyShareUrl}
                  className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-hidden select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>링크 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy Protection Notice Banner */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold block mb-0.5 text-emerald-950">
                  개인정보 안심 보호가 적용되어 있습니다
                </span>
                공유 링크를 통해 접속한 비로그인 방문자에게는 <strong>&apos;응답자 인적사항 분포&apos;</strong> 및 <strong>&apos;응답자별 데이터 상세 내역&apos;</strong>이 자동으로 완전히 비공개 처리됩니다.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href={surveyShareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>새 탭에서 확인</span>
              </a>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
