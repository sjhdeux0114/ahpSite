export type FormQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'linear_scale'
  | 'dropdown'
  | 'ranking'
  | 'number'
  | 'date'
  | 'time'
  | 'matrix_single'
  | 'matrix_multi'
  | 'consent';

export type TextValidationPattern = 'none' | 'email' | 'phone' | 'url';

export interface FormQuestion {
  id: string;
  sectionId: string;
  numberLabel?: string;
  title: string;
  description?: string;
  type: FormQuestionType;
  required: boolean;
  options?: string[];
  allowOther?: boolean;
  otherLabel?: string;
  randomizeOptions?: boolean;
  // multi_choice constraints
  minSelect?: number;
  maxSelect?: number;
  // linear_scale
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  // number
  minNumber?: number;
  maxNumber?: number;
  unit?: string;
  // text validation
  minLength?: number;
  maxLength?: number;
  validationPattern?: TextValidationPattern;
  // matrix_single / matrix_multi
  rows?: string[];
  columns?: string[];
  // branching
  endOnOptions?: string[];
  branches?: Record<string, string>; // option text -> target question number/id or '__END__'
  nextQuestion?: string; // target question number/id or '__END__' after this question
  placeholder?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
}

export interface FormSettings {
  pagingMode?: 'scroll' | 'section';
  allowLargeTextToggle?: boolean;
  defaultLargeText?: boolean;
  startAt?: string;
  endAt?: string;
  maxResponses?: number;
  preventDuplicate?: boolean;
  accessCode?: string;
  thankYouMessage?: string;
}

export interface FormConfig {
  subtitle?: string;
  meta?: string;
  settings?: FormSettings;
  sections: FormSection[];
  questions: FormQuestion[];
}

/**
 * Answers structure for a FORM response:
 * - For short_text / long_text / number / date / time / dropdown: string
 * - For single_choice / consent: { value: string; otherText?: string } (or plain string for backward compat)
 * - For multi_choice: { values: string[]; otherText?: string }
 * - For linear_scale: { scale: number } (or string/number)
 * - For ranking: { ranked: string[] }
 * - For matrix_single: { rows: Record<string, string> }
 * - For matrix_multi: { rowsMulti: Record<string, string[]> }
 */
export type FormAnswerValue =
  | string
  | number
  | { value: string; otherText?: string }
  | { values: string[]; otherText?: string }
  | { scale: number }
  | { ranked: string[] }
  | { rows: Record<string, string> }
  | { rowsMulti: Record<string, string[]> };

export type FormAnswerMap = Record<string, FormAnswerValue>;

export function getFormQuestionTypeLabel(type: FormQuestionType): string {
  switch (type) {
    case 'short_text':
      return '단답형';
    case 'long_text':
      return '장문형';
    case 'single_choice':
      return '객관식 (하나 선택)';
    case 'multi_choice':
      return '체크박스 (복수 선택)';
    case 'linear_scale':
      return '선형 배율 (리커트 척도)';
    case 'dropdown':
      return '드롭다운 (목록 선택)';
    case 'ranking':
      return '순위 선택 (우선순위)';
    case 'number':
      return '숫자 입력';
    case 'date':
      return '날짜 선택';
    case 'time':
      return '시간 선택';
    case 'matrix_single':
      return '그리드 (행별 하나 선택)';
    case 'matrix_multi':
      return '그리드 (행별 복수 선택)';
    case 'consent':
      return '참여 동의 (종료 분기)';
  }
}

export function extractSingleValue(raw: FormAnswerValue | undefined): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if ('value' in raw) return raw.value || '';
  if ('scale' in raw) return String(raw.scale);
  return '';
}
