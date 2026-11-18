export type FormQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'matrix_single'
  | 'consent';

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
  rows?: string[];
  columns?: string[];
  endOnOptions?: string[];
  placeholder?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
}

export interface FormConfig {
  subtitle?: string;
  meta?: string;
  sections: FormSection[];
  questions: FormQuestion[];
}

/**
 * Answers structure for a FORM response:
 * - For short_text / long_text: string
 * - For single_choice / consent: { value: string; otherText?: string } (or plain string for backward compat)
 * - For multi_choice: { values: string[]; otherText?: string }
 * - For matrix_single: { rows: Record<string, string> }
 */
export type FormAnswerValue =
  | string
  | { value: string; otherText?: string }
  | { values: string[]; otherText?: string }
  | { rows: Record<string, string> };

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
    case 'matrix_single':
      return '그리드 (행별 하나 선택)';
    case 'consent':
      return '참여 동의 (종료 분기)';
  }
}
