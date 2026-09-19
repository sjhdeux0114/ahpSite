'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { parseSurveyMarkdown, ParseSurveyResult } from '@/lib/surveyMarkdownParser';

interface SurveyMarkdownImporterProps {
  onImport: (parsed: ParseSurveyResult) => void;
}

const AI_PROMPT_TEXT = `너는 AHP(Analytic Hierarchy Process, 계층화 분석법) 의사결정 모델링 전문가야.
내가 제시하는 [설문 주제]에 맞추어 온라인 AHP 설문 시스템에 바로 업로드할 수 있는 마크다운 문서를 작성해줘.

반드시 아래에 정의된 'AHP 설문 문서 작성 규칙'의 양식을 엄격히 지켜서 출력해줘.
코드 블록(\`\`\`markdown ... \`\`\`) 안에 담아주면 더 좋아.

[설문 주제]: 스마트 업무 협업 툴(솔루션) 도입을 위한 우선순위 평가
[평가 목적]: 기업 생산성을 극대화할 최적의 협업 도구를 선정하기 위해 각 평가 기준의 가중치를 도출함

[AHP 설문 문서 작성 규칙]
1. 설문 기본정보
내용: 설문 제목 (예: 스마트 협업 솔루션 도입 선정을 위한 AHP 분석)

2. 설문 목적 및 설명
내용: 설문의 배경, 취지 및 응답자에게 안내할 설명문

3. 계층형 평가기준
대분류는 2개 이상, 각 대분류별 하위 세부영역은 2개 이상으로 구성해야 해.
구분자는 쉼표(,)를 사용해.
형식:
대분류1 : [대분류명] , [대분류 설명]
대분류1sub1: [세부영역명] , [세부영역 설명]
대분류1sub2: [세부영역명] , [세부영역 설명]
대분류2 : [대분류명] , [대분류 설명]
대분류2sub1: [세부영역명] , [세부영역 설명]
대분류2sub2: [세부영역명] , [세부영역 설명]

4. 대안 (선택사항 - 최종 후보군을 비교할 경우 2개 이상 입력, 없으면 생략 가능)
대안1 : [대안명] , [대안 설명]
대안2 : [대안명] , [대안 설명]

5. 응답자 인적사항 (선택사항 - 응답자 통계 분석용 문항, 없으면 생략 가능)
질문1 : [질문명] (객관식) , [선택지1], [선택지2], [선택지3]
질문2 : [질문명] (주관식)`;

export default function SurveyMarkdownImporter({ onImport }: SurveyMarkdownImporterProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    warnings?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/ahp_survey_guide_template.md';
    link.download = 'ahp_survey_guide_template.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI 프롬프트 복사 핸들러
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 파일 파싱 공통 함수
  const processMarkdown = (content: string, fileName?: string) => {
    const parsed = parseSurveyMarkdown(content);

    if (!parsed.success) {
      setImportStatus({
        success: false,
        message: parsed.error || '마크다운에서 평가 기준을 찾지 못했습니다. 서식을 확인해주세요.',
        warnings: parsed.warnings,
      });
      return;
    }

    // 부모 폼에 반영
    onImport(parsed);

    const summaryParts = [
      `대분류 ${parsed.stats.criteriaCount}개`,
      parsed.stats.subcriteriaCount > 0 ? `세부영역 ${parsed.stats.subcriteriaCount}개` : null,
      parsed.stats.alternativesCount > 0 ? `대안 ${parsed.stats.alternativesCount}개` : null,
      parsed.stats.demographicsCount > 0 ? `인적사항 ${parsed.stats.demographicsCount}개` : null,
    ]
      .filter(Boolean)
      .join(', ');

    setImportStatus({
      success: true,
      message: `${fileName ? `'${fileName}' 파일에서 ` : ''}설문 내용이 자동으로 적용되었습니다! (${summaryParts})`,
      warnings: parsed.warnings,
    });
  };

  // 파일 선택 변경 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        processMarkdown(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        processMarkdown(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  // 텍스트 직접 붙여넣기 제출 핸들러
  const handlePasteSubmit = () => {
    if (!rawText.trim()) {
      setImportStatus({
        success: false,
        message: '붙여넣을 마크다운 텍스트를 입력해주세요.',
      });
      return;
    }
    processMarkdown(rawText);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/50 p-6 sm:p-7 rounded-2xl border border-indigo-200 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              AI / 마크다운(MD) 파일로 설문 자동 생성
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                신규 기능
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              마크다운 규칙 파일을 AI에게 건네 문서화한 뒤 업로드하면, 대분류·세부영역·대안이 자동으로 채워집니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-xl transition shadow-2xs"
            title="문서 만드는 법과 예시가 포함된 MD 파일을 다운로드합니다."
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            문서 작성법 MD 다운로드
          </button>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition shadow-sm shadow-indigo-200"
            title="AI(ChatGPT, Claude 등)에게 그대로 보낼 수 있는 프롬프트를 복사합니다."
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                프롬프트 복사됨!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                AI 프롬프트 복사
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toggleable Guide Accordion */}
      <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white/80">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-indigo-50/50 transition"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            마크다운 작성 규칙 및 AI 활용 3초 요약 가이드
          </span>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showGuide && (
          <div className="p-4 border-t border-indigo-100 bg-slate-50/50 text-xs text-slate-700 space-y-3 font-mono">
            <div className="space-y-1 font-sans">
              <p className="font-bold text-slate-900">💡 사용 방법:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                <li>우측 상단 <strong>[AI 프롬프트 복사]</strong> 버튼을 누릅니다.</li>
                <li>ChatGPT, Claude, Gemini 등에 붙여넣고 [설문 주제]를 원하는 내용으로 적어 전송합니다.</li>
                <li>AI가 출력해 준 텍스트를 파일(.md)로 저장해 업로드하거나, 아래 [텍스트 직접 붙여넣기]에 넣습니다.</li>
              </ol>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 text-[11px] leading-relaxed overflow-x-auto">
              <div className="font-bold text-indigo-700 mb-1 font-sans">📌 마크다운 기본 포맷 예시:</div>
              <pre className="whitespace-pre">
{`1. 설문 기본정보
내용: ahp 설문 조사

2. 설문 목적 및 설명
내용: ahp 설문을 한다

3. 계층형 평가기준
대분류1 : 프로그래밍기초 , 프로그램 개념과 원리를 이해한다
대분류1sub1: 기능 완성도 , 요구기능 충실한 구현여부
대분류1sub2: 기능 버그위험성 , 버그의 위험성
대분류2 : 디버깅 , 디버깅의 이해
대분류2sub1: 디버그 역량 , 디버그하는 방법

4. 대안 (선택)
대안1 : 대안 A , 기본 솔루션
대안2 : 대안 B , 확장형 솔루션`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-indigo-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          마크다운 파일 업로드 (.md, .txt)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'paste'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          텍스트 직접 붙여넣기
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".md,.txt,.markdown"
            className="hidden"
          />

          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
              dragOver
                ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                : 'border-indigo-200 bg-white hover:bg-indigo-50/30 hover:border-indigo-400'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {selectedFileName ? (
                  <span className="text-indigo-600 flex items-center justify-center gap-1.5">
                    <FileCode className="w-4 h-4" />
                    {selectedFileName}
                  </span>
                ) : (
                  '마크다운(.md, .txt) 파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요'
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                파일을 선택하면 즉시 파싱되어 하단 설문 양식에 자동으로 채워집니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            rows={6}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`AI 사이트(ChatGPT, Claude 등)에서 생성된 마크다운 텍스트를 이곳에 그대로 붙여넣으세요.\n\n예시:\n1. 설문 기본정보\n내용: 프로그래밍 교육과정 선정을 위한 AHP 분석\n\n3. 계층형 평가기준\n대분류1 : 프로그래밍기초 , 개념 이해\n대분류1sub1: 기능 완성도 , 구현 능력\n...`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono leading-relaxed bg-white text-slate-800"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePasteSubmit}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              텍스트 분석 및 설문에 적용
            </button>
          </div>
        </div>
      )}

      {/* Result Status Message */}
      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex flex-col gap-1.5 animate-fadeIn ${
            importStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>

          {importStatus.warnings && importStatus.warnings.length > 0 && (
            <div className="pl-6 pt-1 space-y-1 text-slate-600">
              <span className="font-semibold text-amber-700 block">💡 안내 및 권장 사항:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                {importStatus.warnings.map((warn, wIdx) => (
                  <li key={wIdx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
