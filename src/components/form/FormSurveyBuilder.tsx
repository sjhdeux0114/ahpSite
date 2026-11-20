'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  GripVertical,
  Copy,
  Eye,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  FormConfig,
  FormQuestion,
  FormQuestionType,
  FormSection,
  FormSettings,
  getFormQuestionTypeLabel,
  TextValidationPattern,
} from '@/lib/form/types';
import FormSurveyRenderer from './FormSurveyRenderer';

interface FormSurveyBuilderProps {
  title: string;
  description: string;
  formConfig: FormConfig;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onChangeFormConfig: (config: FormConfig) => void;
}

const QUESTION_TYPES: FormQuestionType[] = [
  'single_choice',
  'multi_choice',
  'linear_scale',
  'dropdown',
  'ranking',
  'short_text',
  'long_text',
  'number',
  'date',
  'time',
  'matrix_single',
  'matrix_multi',
  'consent',
];

export default function FormSurveyBuilder({
  title,
  description,
  formConfig,
  onChangeTitle,
  onChangeDescription,
  onChangeFormConfig,
}: FormSurveyBuilderProps) {
  const sections = formConfig.sections || [];
  const questions = formConfig.questions || [];
  const settings = formConfig.settings || {};

  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const updateSettings = (patch: Partial<FormSettings>) => {
    onChangeFormConfig({
      ...formConfig,
      settings: { ...settings, ...patch },
    });
  };

  const updateSection = (secId: string, patch: Partial<FormSection>) => {
    onChangeFormConfig({
      ...formConfig,
      sections: sections.map(s => (s.id === secId ? { ...s, ...patch } : s)),
    });
  };

  const addSection = () => {
    const nextNum = sections.length + 1;
    const newSec: FormSection = {
      id: `sec_${Date.now()}`,
      title: `섹션 ${nextNum}`,
      description: '',
    };
    onChangeFormConfig({
      ...formConfig,
      sections: [...sections, newSec],
    });
  };

  const removeSection = (secId: string) => {
    if (sections.length <= 1) return;
    onChangeFormConfig({
      ...formConfig,
      sections: sections.filter(s => s.id !== secId),
      questions: questions.filter(q => q.sectionId !== secId),
    });
  };

  const addQuestion = (secId: string) => {
    const nextNum = questions.length + 1;
    const newQ: FormQuestion = {
      id: `q_${Date.now()}_${nextNum}`,
      sectionId: secId,
      numberLabel: String(nextNum).padStart(2, '0'),
      title: '새 질문',
      type: 'single_choice',
      required: true,
      options: ['예', '아니오'],
    };
    onChangeFormConfig({
      ...formConfig,
      questions: [...questions, newQ],
    });
  };

  const updateQuestion = (qId: string, patch: Partial<FormQuestion>) => {
    onChangeFormConfig({
      ...formConfig,
      questions: questions.map(q => (q.id === qId ? { ...q, ...patch } : q)),
    });
  };

  const removeQuestion = (qId: string) => {
    onChangeFormConfig({
      ...formConfig,
      questions: questions.filter(q => q.id !== qId),
    });
  };

  const duplicateQuestion = (qId: string) => {
    const idx = questions.findIndex(q => q.id === qId);
    if (idx < 0) return;
    const orig = questions[idx];
    const cloned: FormQuestion = {
      ...orig,
      id: `q_${Date.now()}_copy`,
      title: `${orig.title} (복사본)`,
      options: orig.options ? [...orig.options] : undefined,
      rows: orig.rows ? [...orig.rows] : undefined,
      columns: orig.columns ? [...orig.columns] : undefined,
      branches: orig.branches ? { ...orig.branches } : undefined,
      endOnOptions: orig.endOnOptions ? [...orig.endOnOptions] : undefined,
    };
    const copy = [...questions];
    copy.splice(idx + 1, 0, cloned);
    onChangeFormConfig({ ...formConfig, questions: copy });
  };

  const moveQuestion = (qId: string, dir: -1 | 1) => {
    const idx = questions.findIndex(q => q.id === qId);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const copy = [...questions];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    onChangeFormConfig({ ...formConfig, questions: copy });
  };

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <FormSurveyRenderer
            slug="preview"
            survey={{
              id: 'preview',
              title: title || '미리보기 설문',
              description,
              status: 'ACTIVE',
              formConfig,
            }}
            previewMode={true}
            onExitPreview={() => setShowPreview(false)}
          />
        </div>
      )}

      {/* Top Toolbar: Settings & Preview */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowSettings(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <Settings2 className="w-4 h-4 text-emerald-600" />
          <span>설문 운영 설정 (페이지 넘김 · 마감 · 접근제어)</span>
          {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
        >
          <Eye className="w-4 h-4" />
          <span>응답자 화면 미리보기</span>
        </button>
      </div>

      {/* Collapsible Survey Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <span>설문 진행 및 배포 제어 설정</span>
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">화면 진행 방식</label>
              <select
                value={settings.pagingMode || 'scroll'}
                onChange={e => updateSettings({ pagingMode: e.target.value as 'scroll' | 'section' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50"
              >
                <option value="scroll">한 페이지 스크롤 (전체 보기)</option>
                <option value="section">섹션별 페이지 넘김 (이전/다음)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">참여 시작 일시 (선택)</label>
              <input
                type="datetime-local"
                value={settings.startAt || ''}
                onChange={e => updateSettings({ startAt: e.target.value || undefined })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">참여 마감 일시 (선택)</label>
              <input
                type="datetime-local"
                value={settings.endAt || ''}
                onChange={e => updateSettings({ endAt: e.target.value || undefined })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">최대 응답 수 제한 (선택)</label>
              <input
                type="number"
                min={1}
                value={settings.maxResponses ?? ''}
                onChange={e =>
                  updateSettings({
                    maxResponses: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="예: 100 (무제한은 비워둠)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">참여 비밀번호 / 코드 (선택)</label>
              <input
                type="text"
                value={settings.accessCode || ''}
                onChange={e => updateSettings({ accessCode: e.target.value || undefined })}
                placeholder="설정 시 코드 입력 후 참여 가능"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex flex-col justify-center gap-2 pt-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.preventDuplicate)}
                  onChange={e => updateSettings({ preventDuplicate: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold">브라우저 중복 응답 방지 (1인 1회)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowLargeTextToggle !== false}
                  onChange={e => updateSettings({ allowLargeTextToggle: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold">&lsquo;큰 글씨 모드&rsquo; 토글 버튼 제공</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              제출 완료 후 감사 메시지 (선택)
            </label>
            <input
              type="text"
              value={settings.thankYouMessage || ''}
              onChange={e => updateSettings({ thankYouMessage: e.target.value || undefined })}
              placeholder="기본: 소중한 응답에 진심으로 감사드립니다. 제출하신 내용은 안전하게 저장되었습니다."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>
      )}

      {/* Form Header Card (Google Forms style) */}
      <div className="bg-white rounded-2xl border-t-4 border-t-emerald-600 border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">부제목 / 과목·기관명 (선택)</label>
            <input
              type="text"
              value={formConfig.subtitle || ''}
              onChange={e => onChangeFormConfig({ ...formConfig, subtitle: e.target.value })}
              placeholder="예: 디지털제품기획과 비즈니스모델"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">대상 / 예상 소요시간 (선택)</label>
            <input
              type="text"
              value={formConfig.meta || ''}
              onChange={e => onChangeFormConfig({ ...formConfig, meta: e.target.value })}
              placeholder="예: 부모님용 · 약 6~8분"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">설문 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={e => onChangeTitle(e.target.value)}
            placeholder="예: 가족 일상 공유 설문"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">설문 안내문</label>
          <textarea
            value={description}
            onChange={e => onChangeDescription(e.target.value)}
            rows={3}
            placeholder="설문 목적, 소요 시간, 익명성 안내 등을 입력하세요."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Sections & Questions */}
      {sections.map((sec, secIdx) => {
        const secQuestions = questions.filter(q => q.sectionId === sec.id);

        return (
          <div key={sec.id} className="space-y-3">
            {/* Section Card */}
            <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  섹션 {secIdx + 1}
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sec.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>섹션 삭제</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={sec.title}
                onChange={e => updateSection(sec.id, { title: e.target.value })}
                placeholder="섹션 제목 (예: A. 평소에는 어떻게 하시나요?)"
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <textarea
                value={sec.description || ''}
                onChange={e => updateSection(sec.id, { description: e.target.value })}
                rows={2}
                placeholder="섹션 설명 (선택)"
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Questions in this section */}
            <div className="space-y-3 pl-0 sm:pl-3">
              {secQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={q.numberLabel || ''}
                        onChange={e => updateQuestion(q.id, { numberLabel: e.target.value })}
                        placeholder="번호"
                        className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-center"
                      />
                      <select
                        value={q.type}
                        onChange={e => {
                          const nextType = e.target.value as FormQuestionType;
                          const patch: Partial<FormQuestion> = { type: nextType };
                          if (nextType === 'matrix_single' || nextType === 'matrix_multi') {
                            patch.rows = q.rows?.length ? q.rows : ['항목 1', '항목 2'];
                            patch.columns = q.columns?.length ? q.columns : ['매우 그렇다', '보통', '그렇지 않다'];
                          } else if (nextType === 'linear_scale') {
                            patch.scaleMin = q.scaleMin ?? 1;
                            patch.scaleMax = q.scaleMax ?? 5;
                            patch.scaleMinLabel = q.scaleMinLabel ?? '전혀 그렇지 않다';
                            patch.scaleMaxLabel = q.scaleMaxLabel ?? '매우 그렇다';
                          } else if (
                            (nextType === 'single_choice' ||
                              nextType === 'multi_choice' ||
                              nextType === 'dropdown' ||
                              nextType === 'ranking' ||
                              nextType === 'consent') &&
                            (!q.options || q.options.length === 0)
                          ) {
                            patch.options =
                              nextType === 'consent'
                                ? ['동의함', '동의하지 않음 (설문 종료)']
                                : ['선택지 1', '선택지 2'];
                            if (nextType === 'consent') {
                              patch.endOnOptions = ['동의하지 않음 (설문 종료)'];
                            }
                          }
                          updateQuestion(q.id, patch);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-slate-50"
                      >
                        {QUESTION_TYPES.map(t => (
                          <option key={t} value={t}>
                            {getFormQuestionTypeLabel(t)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>필수</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => moveQuestion(q.id, -1)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="위로"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(q.id, 1)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="아래로"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(q.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="문항 복제"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                        title="문항 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={q.title}
                    onChange={e => updateQuestion(q.id, { title: e.target.value })}
                    placeholder="질문 내용을 입력하세요"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />

                  {/* Choice / Dropdown / Ranking / Consent options */}
                  {(q.type === 'single_choice' ||
                    q.type === 'multi_choice' ||
                    q.type === 'dropdown' ||
                    q.type === 'ranking' ||
                    q.type === 'consent') && (
                    <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          선택지 (슬래시 / 로 구분하거나 한 줄씩 편집)
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          {q.type !== 'consent' && (
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(q.randomizeOptions)}
                                onChange={e => updateQuestion(q.id, { randomizeOptions: e.target.checked })}
                                className="rounded text-emerald-600"
                              />
                              <span>보기 순서 무작위</span>
                            </label>
                          )}
                          {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(q.allowOther)}
                                onChange={e => updateQuestion(q.id, { allowOther: e.target.checked })}
                                className="rounded text-emerald-600"
                              />
                              <span>&lsquo;기타&rsquo; 직접입력 추가</span>
                            </label>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={(q.options || []).join(' / ')}
                        onChange={e =>
                          updateQuestion(q.id, {
                            options: e.target.value.split('/').map(s => s.trim()),
                          })
                        }
                        onBlur={e =>
                          updateQuestion(q.id, {
                            options: e.target.value
                              .split('/')
                              .map(s => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="선택지1 / 선택지2 / 선택지3"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      {q.type === 'multi_choice' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">최소 선택 수</label>
                            <input
                              type="number"
                              min={0}
                              value={q.minSelect ?? ''}
                              onChange={e =>
                                updateQuestion(q.id, {
                                  minSelect: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              placeholder="제한 없음"
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">최대 선택 수</label>
                            <input
                              type="number"
                              min={1}
                              value={q.maxSelect ?? ''}
                              onChange={e =>
                                updateQuestion(q.id, {
                                  maxSelect: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              placeholder="제한 없음"
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                      {(q.type === 'single_choice' || q.type === 'consent') && (q.options || []).length > 0 && (
                        <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 block">
                            선택지별 분기 이동 (선택, 기본은 다음 문항으로 순서대로 이동)
                          </span>
                          <div className="grid sm:grid-cols-2 gap-1.5">
                            {(q.options || []).filter(Boolean).map(opt => {
                              const currentTarget =
                                q.branches?.[opt] ||
                                (q.endOnOptions?.includes(opt) ? '__END__' : '');
                              return (
                                <div key={opt} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                  <span className="text-[11px] text-slate-700 truncate flex-1" title={opt}>
                                    {opt}
                                  </span>
                                  <select
                                    value={currentTarget}
                                    onChange={e => {
                                      const val = e.target.value;
                                      const nextBranches = { ...(q.branches || {}) };
                                      if (!val) {
                                        delete nextBranches[opt];
                                      } else {
                                        nextBranches[opt] = val;
                                      }
                                      const nextEndOpts = Object.entries(nextBranches)
                                        .filter(([, t]) => t === '__END__')
                                        .map(([k]) => k);
                                      updateQuestion(q.id, {
                                        branches: nextBranches,
                                        endOnOptions: nextEndOpts,
                                      });
                                    }}
                                    className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50 max-w-[140px]"
                                  >
                                    <option value="">다음 문항 (기본)</option>
                                    <option value="__END__">설문 종료</option>
                                    {questions
                                      .filter(tq => tq.id !== q.id)
                                      .map(tq => {
                                        const valKey = tq.numberLabel || tq.id;
                                        const label = tq.numberLabel
                                          ? `${tq.numberLabel}. ${tq.title.slice(0, 14)}`
                                          : tq.title.slice(0, 16);
                                        return (
                                          <option key={tq.id} value={valKey}>
                                            → {label}
                                          </option>
                                        );
                                      })}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linear scale config */}
                  {q.type === 'linear_scale' && (
                    <div className="grid sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">시작 값</label>
                        <select
                          value={q.scaleMin ?? 1}
                          onChange={e => updateQuestion(q.id, { scaleMin: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">끝 값</label>
                        <select
                          value={q.scaleMax ?? 5}
                          onChange={e => updateQuestion(q.id, { scaleMax: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">왼쪽 라벨</label>
                        <input
                          type="text"
                          value={q.scaleMinLabel || ''}
                          onChange={e => updateQuestion(q.id, { scaleMinLabel: e.target.value })}
                          placeholder="전혀 그렇지 않다"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">오른쪽 라벨</label>
                        <input
                          type="text"
                          value={q.scaleMaxLabel || ''}
                          onChange={e => updateQuestion(q.id, { scaleMaxLabel: e.target.value })}
                          placeholder="매우 그렇다"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Number config */}
                  {q.type === 'number' && (
                    <div className="grid sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">최소값 (선택)</label>
                        <input
                          type="number"
                          value={q.minNumber ?? ''}
                          onChange={e =>
                            updateQuestion(q.id, {
                              minNumber: e.target.value !== '' ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="제한 없음"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">최대값 (선택)</label>
                        <input
                          type="number"
                          value={q.maxNumber ?? ''}
                          onChange={e =>
                            updateQuestion(q.id, {
                              maxNumber: e.target.value !== '' ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="제한 없음"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">단위 (선택)</label>
                        <input
                          type="text"
                          value={q.unit || ''}
                          onChange={e => updateQuestion(q.id, { unit: e.target.value })}
                          placeholder="예: 명, 세, 만원, 회"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Matrix rows & columns */}
                  {(q.type === 'matrix_single' || q.type === 'matrix_multi') && (
                    <div className="grid sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          행 항목 ( / 로 구분)
                        </label>
                        <input
                          type="text"
                          value={(q.rows || []).join(' / ')}
                          onChange={e =>
                            updateQuestion(q.id, {
                              rows: e.target.value.split('/').map(s => s.trim()),
                            })
                          }
                          onBlur={e =>
                            updateQuestion(q.id, {
                              rows: e.target.value
                                .split('/')
                                .map(s => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="알림 열기 / 사진 보내기 / 새 앱 설치"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          열 보기 ( / 로 구분)
                        </label>
                        <input
                          type="text"
                          value={(q.columns || []).join(' / ')}
                          onChange={e =>
                            updateQuestion(q.id, {
                              columns: e.target.value.split('/').map(s => s.trim()),
                            })
                          }
                          onBlur={e =>
                            updateQuestion(q.id, {
                              columns: e.target.value
                                .split('/')
                                .map(s => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="A 혼자 가능 / B 도움받아 가능 / C 해 본 적 없음"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Short/Long text placeholder & validation */}
                  {(q.type === 'short_text' || q.type === 'long_text') && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={q.placeholder || ''}
                        onChange={e => updateQuestion(q.id, { placeholder: e.target.value })}
                        placeholder="입력창 안내 문구 (선택, 예: 담당 팀원이 준 코드)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={0}
                          value={q.minLength ?? ''}
                          onChange={e =>
                            updateQuestion(q.id, {
                              minLength: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="최소 글자수"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          value={q.maxLength ?? ''}
                          onChange={e =>
                            updateQuestion(q.id, {
                              maxLength: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="최대 글자수"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                        />
                        {q.type === 'short_text' && (
                          <select
                            value={q.validationPattern || 'none'}
                            onChange={e =>
                              updateQuestion(q.id, {
                                validationPattern: e.target.value as TextValidationPattern,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                          >
                            <option value="none">형식 제한 없음</option>
                            <option value="email">이메일 형식</option>
                            <option value="phone">전화번호 형식</option>
                            <option value="url">URL 형식</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Question-level nextQuestion jump */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <span className="text-[11px] text-slate-500">이 문항 완료 후 이동:</span>
                    <select
                      value={q.nextQuestion || ''}
                      onChange={e =>
                        updateQuestion(q.id, {
                          nextQuestion: e.target.value || undefined,
                        })
                      }
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                    >
                      <option value="">다음 문항 (기본 순서)</option>
                      <option value="__END__">설문 종료</option>
                      {questions
                        .filter(tq => tq.id !== q.id)
                        .map(tq => {
                          const valKey = tq.numberLabel || tq.id;
                          const label = tq.numberLabel
                            ? `${tq.numberLabel}. ${tq.title.slice(0, 18)}`
                            : tq.title.slice(0, 20);
                          return (
                            <option key={tq.id} value={valKey}>
                              → {label}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addQuestion(sec.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>이 섹션에 문항 추가</span>
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSection}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-white text-slate-600 hover:text-emerald-700 text-sm font-semibold flex items-center justify-center gap-2 transition"
      >
        <FolderPlus className="w-4 h-4" />
        <span>새 섹션 추가하기</span>
      </button>
    </div>
  );
}
