import { FormConfig, FormQuestion, FormQuestionType, FormSection } from './types';

export interface ParseFormResult {
  success: boolean;
  title: string;
  description: string;
  formConfig: FormConfig;
  stats: {
    sectionsCount: number;
    questionsCount: number;
  };
  warnings: string[];
  error?: string;
}

const TYPE_KEYWORDS: Array<{ keywords: string[]; type: FormQuestionType }> = [
  { keywords: ['동의', '참여동의'], type: 'consent' },
  { keywords: ['그리드복수', '표복수', '행렬복수'], type: 'matrix_multi' },
  { keywords: ['그리드', '표', '행렬', '각각 하나', '각각하나'], type: 'matrix_single' },
  { keywords: ['선형', '척도', '리커트', '배율'], type: 'linear_scale' },
  { keywords: ['드롭다운', '목록'], type: 'dropdown' },
  { keywords: ['순위', '랭킹'], type: 'ranking' },
  { keywords: ['숫자'], type: 'number' },
  { keywords: ['날짜'], type: 'date' },
  { keywords: ['시간'], type: 'time' },
  { keywords: ['복수', '다중', '체크박스', '여러개'], type: 'multi_choice' },
  { keywords: ['단답'], type: 'short_text' },
  { keywords: ['장문', '서술', '서술형', '주관식'], type: 'long_text' },
  { keywords: ['하나', '단일', '라디오', '객관식'], type: 'single_choice' },
];

function normalizeJumpTarget(raw: string): string {
  const cleaned = raw.replace(/문항/g, '').replace(/번$/g, '').trim();
  if (cleaned === '종료' || cleaned === '설문 종료' || cleaned === '설문종료' || cleaned === '끝' || cleaned.toLowerCase() === 'end') {
    return '__END__';
  }
  return cleaned;
}

function parseTypeTag(tagContent: string): {
  type?: FormQuestionType;
  optional?: boolean;
  nextQuestion?: string;
  randomizeOptions?: boolean;
} {
  const tokens = tagContent
    .split(/[,/|·]/)
    .map(t => t.trim())
    .filter(Boolean);

  let detectedType: FormQuestionType | undefined;
  let optional: boolean | undefined;
  let nextQuestion: string | undefined;
  let randomizeOptions: boolean | undefined;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const nextMatch = token.match(/^(?:다음|이동)\s*[:：]\s*(.+)$/);
    if (nextMatch) {
      nextQuestion = normalizeJumpTarget(nextMatch[1]);
      continue;
    }
    if (lower === '무작위' || lower === '랜덤' || lower === 'random') {
      randomizeOptions = true;
      continue;
    }
    if (lower.includes('선택') || lower === '비필수' || lower === 'optional') {
      // Distinguish "하나 선택" vs "선택 답변" / "선택"
      if (lower === '선택' || lower.includes('선택 답변') || lower.includes('선택답변') || lower === '비필수' || lower === 'optional') {
        optional = true;
        continue;
      }
    }
    if (lower === '필수' || lower === 'required') {
      optional = false;
      continue;
    }
    for (const entry of TYPE_KEYWORDS) {
      if (entry.keywords.some(k => lower.includes(k))) {
        detectedType = entry.type;
        break;
      }
    }
  }

  return { type: detectedType, optional, nextQuestion, randomizeOptions };
}

function splitSlashOrItems(raw: string): string[] {
  if (raw.includes('/')) {
    return raw
      .split('/')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [raw.trim()].filter(Boolean);
}

export function parseFormMarkdown(markdown: string): ParseFormResult {
  const warnings: string[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let title = '';
  let subtitle = '';
  let meta = '';
  const introDescLines: string[] = [];

  const sections: FormSection[] = [];
  const questions: FormQuestion[] = [];

  let currentSection: FormSection | null = null;
  let currentQuestion: FormQuestion | null = null;
  let inCodeFence = false;
  let qCounter = 0;
  let secCounter = 0;

  const ensureSection = () => {
    if (!currentSection) {
      secCounter++;
      currentSection = {
        id: `sec_${secCounter}`,
        title: '기본 정보',
      };
      sections.push(currentSection);
    }
    return currentSection;
  };

  const finalizeQuestion = () => {
    if (!currentQuestion) return;
    // Default type inference if not explicitly specified
    if (currentQuestion.rows && currentQuestion.rows.length > 0 && currentQuestion.type !== 'matrix_multi') {
      currentQuestion.type = 'matrix_single';
    } else if (
      currentQuestion.type === 'short_text' &&
      currentQuestion.options &&
      currentQuestion.options.length > 0
    ) {
      currentQuestion.type = 'single_choice';
    }
    if (currentQuestion.type === 'linear_scale') {
      if (currentQuestion.scaleMin === undefined) currentQuestion.scaleMin = 1;
      if (currentQuestion.scaleMax === undefined) currentQuestion.scaleMax = 5;
    }
    questions.push(currentQuestion);
    currentQuestion = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (!trimmed) continue;

    // 1. Top-level Title (# ...)
    if (/^#\s+/.test(trimmed) && !title) {
      title = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    // 2. Section Heading (## ...)
    if (/^##\s+/.test(trimmed)) {
      finalizeQuestion();
      secCounter++;
      currentSection = {
        id: `sec_${secCounter}`,
        title: trimmed.replace(/^##\s+/, '').trim(),
      };
      sections.push(currentSection);
      continue;
    }

    // 3. Before any section or question: check metadata
    if (!currentSection && !currentQuestion) {
      const metaMatch = trimmed.match(/^(?:[-*]\s*)?(부제목|부제|소제목|대상\/시간|대상|소요시간|메타|설명|안내)\s*[:：]\s*(.+)$/);
      if (metaMatch) {
        const key = metaMatch[1];
        const val = metaMatch[2].trim();
        if (key === '부제목' || key === '부제' || key === '소제목') {
          subtitle = val;
        } else if (key === '대상/시간' || key === '대상' || key === '소요시간' || key === '메타') {
          meta = val;
        } else {
          introDescLines.push(val);
        }
        continue;
      }
      if (trimmed.startsWith('>')) {
        introDescLines.push(trimmed.replace(/^>\s*/, '').trim());
        continue;
      }
    }

    // 4. Section description (> ...) right under section heading before first question
    if (currentSection && !currentQuestion && trimmed.startsWith('>')) {
      const descLine = trimmed.replace(/^>\s*/, '').trim();
      currentSection.description = currentSection.description
        ? `${currentSection.description}\n${descLine}`
        : descLine;
      continue;
    }

    // 5. Question line detection:
    // Matches:
    // - "### [유형] 제목"
    // - "- [유형] 제목"
    // - "- 01. [유형] 제목" or "01. [유형] 제목" or "01 [유형] 제목"
    // - "- 01. 제목 [유형]" or "01. 제목 [유형]"
    const isIndentedOption = /^\s{2,}[-*]\s+/.test(rawLine) && currentQuestion !== null;
    if (!isIndentedOption) {
      const qHeadingMatch = trimmed.match(/^(?:###\s+|[-*]\s+)?(?:(\d{1,3})[.)]?\s+)?(?:\[([^\]]+)\]\s*)?(.+?)(?:\s*\[([^\]]+)\])?$/);
      const hasBracketTag = Boolean(qHeadingMatch && (qHeadingMatch[2] || qHeadingMatch[4]));
      const isHash3 = /^###\s+/.test(trimmed);

      if (qHeadingMatch && (hasBracketTag || isHash3)) {
        const numLabel = qHeadingMatch[1]?.trim();
        const frontTag = qHeadingMatch[2]?.trim() || '';
        const bodyText = qHeadingMatch[3]?.trim() || '';
        const backTag = qHeadingMatch[4]?.trim() || '';

        const parsedFront = frontTag ? parseTypeTag(frontTag) : {};
        const parsedBack = backTag ? parseTypeTag(backTag) : {};

        const detectedType = parsedFront.type || parsedBack.type;
        const isOptional = parsedFront.optional ?? parsedBack.optional ?? false;
        const nextQuestion = parsedFront.nextQuestion || parsedBack.nextQuestion;
        const randomizeOptions = parsedFront.randomizeOptions || parsedBack.randomizeOptions;

        if (detectedType || isHash3) {
          finalizeQuestion();
          const sec = ensureSection();
          qCounter++;

          // Extract inline parenthetical hint for short_text, e.g. "가족 코드 (담당 팀원이 준 코드)"
          let qTitle = bodyText;
          let placeholder = '';
          const finalType: FormQuestionType = detectedType || 'single_choice';

          if (finalType === 'short_text' || finalType === 'long_text' || finalType === 'number') {
            const parenMatch = qTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            if (parenMatch) {
              qTitle = parenMatch[1].trim();
              placeholder = parenMatch[2].trim();
            }
          }

          currentQuestion = {
            id: `q_${qCounter}`,
            sectionId: sec.id,
            numberLabel: numLabel,
            title: qTitle,
            type: finalType,
            required: !isOptional,
            options: [],
            randomizeOptions: randomizeOptions || undefined,
            nextQuestion,
            placeholder: placeholder || undefined,
          };
          continue;
        }
      }
    }

    // 6. Inside a question: parse options, rows, columns, hints
    if (currentQuestion) {
      const cleanLine = trimmed.replace(/^[-*]\s+/, '').trim();

      // Check 열: / 보기:
      const colMatch = cleanLine.match(/^(?:열|컬럼|보기)\s*[:：]\s*(.+)$/);
      if (colMatch) {
        currentQuestion.columns = splitSlashOrItems(colMatch[1]);
        if (currentQuestion.type !== 'matrix_multi') {
          currentQuestion.type = 'matrix_single';
        }
        continue;
      }

      // Check 행: / 항목:
      const rowMatch = cleanLine.match(/^(?:행|항목)\s*[:：]\s*(.+)$/);
      if (rowMatch) {
        currentQuestion.rows = splitSlashOrItems(rowMatch[1]);
        if (currentQuestion.type !== 'matrix_multi') {
          currentQuestion.type = 'matrix_single';
        }
        continue;
      }

      // Check 범위: 1~5 or 1-7 (for linear_scale)
      const rangeMatch = cleanLine.match(/^범위\s*[:：]\s*(\d+)\s*[~\-]\s*(\d+)$/);
      if (rangeMatch) {
        currentQuestion.scaleMin = Number(rangeMatch[1]);
        currentQuestion.scaleMax = Number(rangeMatch[2]);
        continue;
      }

      // Check 라벨: 왼쪽 / 오른쪽 (for linear_scale)
      const labelMatch = cleanLine.match(/^라벨\s*[:：]\s*(.+)$/);
      if (labelMatch) {
        const parts = splitSlashOrItems(labelMatch[1]);
        if (parts[0]) currentQuestion.scaleMinLabel = parts[0];
        if (parts[1]) currentQuestion.scaleMaxLabel = parts[1];
        continue;
      }

      // Check 단위: (for number)
      const unitMatch = cleanLine.match(/^단위\s*[:：]\s*(.+)$/);
      if (unitMatch) {
        currentQuestion.unit = unitMatch[1].trim();
        continue;
      }

      // Check 최소: / 최대: (multi_choice or number)
      const minMatch = cleanLine.match(/^최소\s*[:：]\s*(\d+)$/);
      if (minMatch) {
        if (currentQuestion.type === 'number') {
          currentQuestion.minNumber = Number(minMatch[1]);
        } else {
          currentQuestion.minSelect = Number(minMatch[1]);
        }
        continue;
      }
      const maxMatch = cleanLine.match(/^최대\s*[:：]\s*(\d+)$/);
      if (maxMatch) {
        if (currentQuestion.type === 'number') {
          currentQuestion.maxNumber = Number(maxMatch[1]);
        } else {
          currentQuestion.maxSelect = Number(maxMatch[1]);
        }
        continue;
      }

      // Check 다음: / 이동: (question-level jump after completing this question)
      const nextLineMatch = cleanLine.match(/^(?:다음|다음문항|이동)\s*[:：]\s*(.+)$/);
      if (nextLineMatch) {
        currentQuestion.nextQuestion = normalizeJumpTarget(nextLineMatch[1]);
        continue;
      }

      // Check 힌트: / 안내: / 설명:
      const hintMatch = cleanLine.match(/^(?:힌트|입력안내|플레이스홀더)\s*[:：]\s*(.+)$/);
      if (hintMatch) {
        currentQuestion.placeholder = hintMatch[1].trim();
        continue;
      }
      const descMatch = cleanLine.match(/^(?:설명|안내)\s*[:：]\s*(.+)$/);
      if (descMatch) {
        currentQuestion.description = descMatch[1].trim();
        continue;
      }

      // Parse options (either slash-separated on one line or single bullet)
      const rawOptions = splitSlashOrItems(cleanLine);
      for (const optRaw of rawOptions) {
        // Check "기타 [직접입력]" or "기타 ______"
        if (/\[직접입력\]/.test(optRaw) || /_{3,}/.test(optRaw)) {
          const label = optRaw
            .replace(/\[직접입력\]/g, '')
            .replace(/_{3,}/g, '')
            .trim();
          currentQuestion.allowOther = true;
          currentQuestion.otherLabel = label || '기타';
          continue;
        }

        // Check "[이동: 4번]" / "[종료]" / "(설문 종료)" for branching
        const jumpMatch = optRaw.match(/\[(?:이동|다음)\s*[:：]\s*([^\]]+)\]/);
        const hasEndTag = /\[종료\]/.test(optRaw) || /\(설문\s*종료\)/.test(optRaw);
        const cleanOpt = optRaw
          .replace(/\[(?:이동|다음)\s*[:：]\s*[^\]]+\]/g, '')
          .replace(/\[종료\]/g, '')
          .trim();
        if (cleanOpt) {
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push(cleanOpt);
          if (jumpMatch) {
            const target = normalizeJumpTarget(jumpMatch[1]);
            currentQuestion.branches = currentQuestion.branches || {};
            currentQuestion.branches[cleanOpt] = target;
            if (target === '__END__') {
              currentQuestion.endOnOptions = currentQuestion.endOnOptions || [];
              currentQuestion.endOnOptions.push(cleanOpt);
            }
          } else if (hasEndTag) {
            currentQuestion.branches = currentQuestion.branches || {};
            currentQuestion.branches[cleanOpt] = '__END__';
            currentQuestion.endOnOptions = currentQuestion.endOnOptions || [];
            currentQuestion.endOnOptions.push(cleanOpt);
          }
        }
      }
      continue;
    }

    // 7. Plain paragraph before first question under section -> section description
    if (currentSection && !currentQuestion) {
      currentSection.description = currentSection.description
        ? `${currentSection.description}\n${trimmed}`
        : trimmed;
    }
  }

  finalizeQuestion();

  if (!title) {
    title = '새 일반 설문';
    warnings.push('설문 제목(# 제목)이 없어 기본 제목으로 설정되었습니다.');
  }

  if (questions.length === 0) {
    return {
      success: false,
      title,
      description: introDescLines.join('\n'),
      formConfig: { subtitle, meta, sections, questions: [] },
      stats: { sectionsCount: sections.length, questionsCount: 0 },
      warnings,
      error: '인식된 설문 문항이 없습니다. 문서작성법.md 형식(- [하나] 질문 등)을 확인해 주세요.',
    };
  }

  return {
    success: true,
    title,
    description: introDescLines.join('\n'),
    formConfig: {
      subtitle: subtitle || undefined,
      meta: meta || undefined,
      sections,
      questions,
    },
    stats: {
      sectionsCount: sections.length,
      questionsCount: questions.length,
    },
    warnings,
  };
}

export const SAMPLE_FAMILY_FORM_MARKDOWN = `# 가족 일상 공유 설문
- 부제목: 디지털제품기획과 비즈니스모델
- 대상/시간: 부모님용 · 약 6~8분
- 설명: 이 설문은 대학원 수업 과제로 가족이 일상을 나누는 방식을 알아보기 위한 것입니다. 참여는 자유이며 언제든 중단할 수 있습니다. 이름·연락처는 적지 않습니다. 응답은 과제 분석과 발표에 사용되며, 서로 상의하지 않고 각자 응답해 주세요.

## 참여 동의 및 기본 정보
- [동의] 참여에 동의하십니까?
  - 동의함 / 동의하지 않음 (설문 종료) [종료]
- [단답] 가족 코드 (담당 팀원이 준 코드)

## A. 평소에는 어떻게 하시나요?
- 01. [하나] 연령대는 어떻게 되시나요?
  - 55세 미만 / 55~64세 / 65~74세 / 75~84세 / 85세 이상 / 답하고 싶지 않음
- 02. [하나] 응답에 함께 참여하는 자녀와 어떻게 지내시나요?
  - 같이 살아요 / 따로 살며 주 1회 이상 만나요 / 따로 살며 주 1회 미만 만나요
- 03. [하나] 예전에 컴퓨터(PC 또는 노트북)를 얼마나 자주 사용하셨나요?
  - 거의 매일 / 주 1~4회 / 가끔 / 거의 또는 전혀 안 씀 / 기억나지 않음
- 04. [그리드] 다음 휴대전화 사용은 혼자 하실 수 있나요?
  - 열: A 혼자 가능 / B 도움받아 가능 / C 해 본 적 없음 / D 도움을 받아도 어려움
  - 행: 알림 열기 / 사진 보내기 / 새 앱 설치 / 앱 가입
- 05. [하나] 지난 30일 동안 자녀와 일정을 주고받거나 확인한 적이 몇 번 있었나요?
  - 없음 / 1회 / 2~3회 / 4회 이상 / 기억나지 않음
- 06. [하나] 그때 어떤 방법을 주로 쓰셨나요?
  - 전화 / 카카오톡·문자 / 직접 만나서 / 달력·알림 앱 / 기타 [직접입력] / 그런 일 없음
- 07. [하나] 지난 30일 동안 자녀에게 물건을 대신 주문해 달라고 한 적이 몇 번 있었나요?
  - 없음 / 1회 / 2~3회 / 4회 이상 / 기억나지 않음
- 08. [하나] 지난 30일 동안 가족 사진을 다시 찾아본 적이 몇 번 있었나요?
  - 없음 / 1회 / 2~3회 / 4회 이상 / 기억나지 않음
- 09. [하나] 지난 30일 동안 자녀나 가족이 보내 준 영상을 본 적이 몇 번 있었나요?
  - 없음 / 1회 / 2~3회 / 4회 이상 / 기억나지 않음

## B. 이런 앱이 있다면 어떨까요?
> 초대에 동의한 가족이 함께 쓰는 앱을 생각해 주세요. 가족이 할 일 알림을 보낼 수 있고, 받는 사람은 ‘했어요 / 나중에 / 도움 필요’로 응답합니다. 가족 사진을 모아 보거나, 가족이 골라 준 영상을 열거나, 필요한 물건을 가족에게 알리는 기능도 있습니다.
- 10. [하나] 가족이 보낸 할 일에 ‘했어요’ 등으로 직접 응답할 것 같으세요?
  - 전혀 그럴 것 같지 않다 / 별로 그럴 것 같지 않다 / 보통이다 / 어느 정도 그럴 것 같다 / 매우 그럴 것 같다 / 잘 모르겠다
- 11. [하나] 내가 보낸 할 일 응답을 누가 볼 수 있으면 편하신가요?
  - 일정을 보낸 가족만 / 내가 고른 가족만 / 가족방 모두 / 공유하고 싶지 않음 / 잘 모르겠음
- 12. [하나] 이 앱에서 가장 먼저 써 보고 싶은 기능은 무엇인가요?
  - 일과 알림과 응답 / 가족 사진첩 / 가족이 골라 준 영상 / 필요한 물건을 가족에게 알리기 / 써 보고 싶은 기능 없음 / 잘 모르겠다
- 13. [하나] 필요한 물건을 가족에게 알린다면 어떤 방법이 가장 편하세요?
  - 상품 골라 보내기 / 물건 사진 보내기 / 글 또는 음성으로 부탁하기 / 지금처럼 전화·카톡 / 부탁하고 싶지 않음 / 기타 [직접입력]
- 14. [하나] 가족이 이 앱을 함께 쓰자고 한다면 설치할 것 같으세요?
  - 전혀 그럴 것 같지 않다 / 별로 그럴 것 같지 않다 / 보통이다 / 어느 정도 그럴 것 같다 / 매우 그럴 것 같다 / 잘 모르겠다
- 15. [하나] 앱을 쓸 때 가장 걱정되거나 불편할 것 같은 점은 무엇인가요?
  - 알림이 너무 자주 옴 / 글씨나 버튼이 보기 어려움 / 가입·설치가 어려움 / 가족이 내 상태를 아는 것이 부담 / 기존 방식이 편함 / 없음 / 기타 [직접입력]
- 16. [장문, 선택] 최근 가족과 일정을 확인하거나 사진을 나누거나 물건을 부탁할 때 기억나는 일이 있나요?
`;
