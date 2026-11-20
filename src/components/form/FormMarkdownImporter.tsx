'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Wand2,
} from 'lucide-react';
import {
  parseFormMarkdown,
  ParseFormResult,
  SAMPLE_FAMILY_FORM_MARKDOWN,
} from '@/lib/form/markdownParser';

interface FormMarkdownImporterProps {
  onImport: (parsed: ParseFormResult) => void;
}

const FORM_AI_PROMPT = `너는 설문조사(Google Form 스타일) 설계 전문가야.
내가 제시하는 [설문 주제]에 맞추어 아래 '일반 설문 마크다운 작성 규칙'에 따라 바로 업로드할 수 있는 마크다운 문서를 작성해줘.

[설문 주제]: (여기에 주제를 입력하세요)

[일반 설문 마크다운 작성 규칙]
# 설문 제목
- 부제목: 과목명 또는 기관명
- 대상/시간: 예) 부모님용 · 약 6~8분
- 설명: 설문 목적, 소요 시간, 개인정보 안내

## 섹션 제목
> 섹션 안내문 (선택)

- 01. [하나] 단일 선택 질문
  - 선택지1 / 선택지2 / 기타 [직접입력]
- 02. [복수] 복수 선택 질문
  - 선택지1 / 선택지2 / 선택지3
- 03. [그리드] 표 형식 질문
  - 열: A 혼자 가능 / B 도움받아 가능 / C 해 본 적 없음
  - 행: 항목1 / 항목2 / 항목3
- 04. [단답] 짧은 입력 질문 (힌트 텍스트)
- 05. [장문, 선택] 서술형 비필수 질문
- 06. [하나] 분기 질문 예시
  - 1번 보기 [이동: 7번]
  - 2번 보기 [이동: 8번]
- 07. [단답] 1번 선택자 전용 문항
  - 다음: 9번
- 08. [단답] 2번 선택자 전용 문항
- 09. [하나] 공통 문항
  - 예 / 아니오
- [동의] 참여 동의 질문
  - 동의함 / 동의하지 않음 (설문 종료) [종료]`;

export default function FormMarkdownImporter({ onImport }: FormMarkdownImporterProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [rawText, setRawText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
    warnings?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processMarkdown = (content: string, sourceLabel?: string) => {
    const parsed = parseFormMarkdown(content);
    if (!parsed.success) {
      setStatus({
        success: false,
        message: parsed.error || '문항을 인식하지 못했습니다. 문서작성법.md 형식을 확인해주세요.',
        warnings: parsed.warnings,
      });
      return;
    }
    onImport(parsed);
    setStatus({
      success: true,
      message: `${sourceLabel ? `${sourceLabel}에서 ` : ''}설문이 자동으로 불러와졌습니다! (섹션 ${parsed.stats.sectionsCount}개, 문항 ${parsed.stats.questionsCount}개)`,
      warnings: parsed.warnings,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = String(ev.target?.result || '');
      setRawText(content);
      processMarkdown(content, `'${file.name}'`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = String(ev.target?.result || '');
      setRawText(content);
      processMarkdown(content, `'${file.name}'`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleLoadSample = () => {
    setActiveTab('paste');
    setRawText(SAMPLE_FAMILY_FORM_MARKDOWN);
    processMarkdown(SAMPLE_FAMILY_FORM_MARKDOWN, '예제(가족 일상 공유 설문)');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(FORM_AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 rounded-2xl border border-emerald-200/80 p-5 sm:p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              마크다운(.md)으로 일반 설문 빠르게 만들기
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              <code>문서작성법.md</code> 규칙으로 작성한 파일을 올리거나 붙여넣으면 Google Form처럼 자동 생성됩니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/templates/form_survey_guide.md"
            download="문서작성법.md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>문서작성법.md</span>
          </a>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? '프롬프트 복사됨' : 'AI 프롬프트 복사'}</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>예제 불러오기 (가족 설문)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'paste'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          텍스트 붙여넣기
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'upload'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          .md 파일 업로드
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 bg-white/80 hover:border-emerald-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            마크다운(.md) 파일을 드래그하거나 클릭하여 선택하세요
          </p>
          <p className="text-xs text-slate-400 mt-1">
            # 제목, ## 섹션, - [하나] / [그리드] / [동의] / [단답] / [장문] 형식 지원
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={7}
            placeholder={`# 가족 일상 공유 설문\n- 부제목: 디지털제품기획과 비즈니스모델\n## A. 평소에는 어떻게 하시나요?\n- 01. [하나] 연령대는 어떻게 되시나요?\n  - 55세 미만 / 55~64세 / 65~74세`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              유형 태그: [하나], [복수], [그리드], [단답], [장문, 선택], [동의]
            </span>
            <button
              type="button"
              onClick={() => processMarkdown(rawText)}
              disabled={!rawText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>설문 폼에 적용하기</span>
            </button>
          </div>
        </div>
      )}

      {status && (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
            status.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{status.message}</p>
            {status.warnings && status.warnings.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-[11px] opacity-80">
                {status.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
