import { FormAnswerMap, FormAnswerValue, FormConfig, FormQuestion } from './types';

export interface FormQuestionSummary {
  questionId: string;
  sectionId: string;
  sectionTitle: string;
  numberLabel?: string;
  title: string;
  type: FormQuestion['type'];
  required: boolean;
  totalAnswered: number;
  // For single_choice, multi_choice, consent
  optionCounts?: Array<{
    option: string;
    count: number;
    percentage: number;
  }>;
  otherTexts?: string[];
  // For matrix_single
  matrixCounts?: Array<{
    row: string;
    totalRowAnswered: number;
    columns: Array<{
      column: string;
      count: number;
      percentage: number;
    }>;
  }>;
  // For short_text, long_text
  textResponses?: Array<{
    responseId: string;
    respondentName: string;
    text: string;
    createdAt: string;
  }>;
}

export interface FormAnalysisSummary {
  totalResponses: number;
  consentedCount: number;
  declinedCount: number;
  questionSummaries: FormQuestionSummary[];
}

export function formatFormAnswerText(q: FormQuestion, raw: FormAnswerValue | undefined): string {
  if (raw === undefined || raw === null) return '';

  if (typeof raw === 'string') return raw;

  if ('rows' in raw && raw.rows) {
    return Object.entries(raw.rows)
      .map(([r, c]) => `${r}: ${c}`)
      .join(' / ');
  }

  if ('values' in raw && Array.isArray(raw.values)) {
    const base = raw.values.join(', ');
    if (raw.otherText && raw.otherText.trim()) {
      return base ? `${base} (기타: ${raw.otherText.trim()})` : `기타: ${raw.otherText.trim()}`;
    }
    return base;
  }

  if ('value' in raw) {
    if (raw.otherText && raw.otherText.trim()) {
      return raw.value === (q.otherLabel || '기타') || raw.value === '__OTHER__'
        ? `${q.otherLabel || '기타'}: ${raw.otherText.trim()}`
        : `${raw.value} (${raw.otherText.trim()})`;
    }
    return raw.value || '';
  }

  return '';
}

export function analyzeFormResponses(
  formConfig: FormConfig,
  responses: Array<{
    id: string;
    name?: string;
    createdAt: string | Date;
    answers: FormAnswerMap;
  }>
): FormAnalysisSummary {
  const sections = formConfig.sections || [];
  const questions = formConfig.questions || [];
  const sectionMap = new Map(sections.map(s => [s.id, s.title]));

  let declinedCount = 0;
  const consentQuestions = questions.filter(q => q.type === 'consent' && (q.endOnOptions || []).length > 0);
  if (consentQuestions.length > 0) {
    for (const resp of responses) {
      const ended = consentQuestions.some(cq => {
        const ans = resp.answers?.[cq.id];
        const val = typeof ans === 'string' ? ans : ans && 'value' in ans ? ans.value : '';
        return (cq.endOnOptions || []).includes(val);
      });
      if (ended) declinedCount++;
    }
  }

  const questionSummaries: FormQuestionSummary[] = questions.map(q => {
    const sectionTitle = sectionMap.get(q.sectionId) || '기본';
    const base: FormQuestionSummary = {
      questionId: q.id,
      sectionId: q.sectionId,
      sectionTitle,
      numberLabel: q.numberLabel,
      title: q.title,
      type: q.type,
      required: q.required,
      totalAnswered: 0,
    };

    if (q.type === 'short_text' || q.type === 'long_text') {
      const texts: NonNullable<FormQuestionSummary['textResponses']> = [];
      for (const resp of responses) {
        const raw = resp.answers?.[q.id];
        const text = typeof raw === 'string' ? raw.trim() : raw && 'value' in raw ? (raw.value || '').trim() : '';
        if (text) {
          texts.push({
            responseId: resp.id,
            respondentName: resp.name || '익명 응답자',
            text,
            createdAt: typeof resp.createdAt === 'string' ? resp.createdAt : resp.createdAt.toISOString(),
          });
        }
      }
      base.totalAnswered = texts.length;
      base.textResponses = texts;
      return base;
    }

    if (q.type === 'matrix_single') {
      const rows = q.rows || [];
      const cols = q.columns || [];
      const matrixCounts = rows.map(row => {
        const colCounts = new Map<string, number>(cols.map(c => [c, 0]));
        let rowTotal = 0;
        for (const resp of responses) {
          const raw = resp.answers?.[q.id];
          if (raw && typeof raw === 'object' && 'rows' in raw) {
            const chosen = raw.rows?.[row];
            if (chosen) {
              rowTotal++;
              colCounts.set(chosen, (colCounts.get(chosen) || 0) + 1);
            }
          }
        }
        return {
          row,
          totalRowAnswered: rowTotal,
          columns: cols.map(col => {
            const cnt = colCounts.get(col) || 0;
            return {
              column: col,
              count: cnt,
              percentage: rowTotal > 0 ? Number(((cnt / rowTotal) * 100).toFixed(1)) : 0,
            };
          }),
        };
      });

      let anyAnswered = 0;
      for (const resp of responses) {
        const raw = resp.answers?.[q.id];
        if (raw && typeof raw === 'object' && 'rows' in raw && Object.keys(raw.rows || {}).length > 0) {
          anyAnswered++;
        }
      }
      base.totalAnswered = anyAnswered;
      base.matrixCounts = matrixCounts;
      return base;
    }

    // single_choice, multi_choice, consent
    const options = [...(q.options || [])];
    const otherLabel = q.otherLabel || '기타';
    if (q.allowOther && !options.includes(otherLabel)) {
      options.push(otherLabel);
    }

    const counts = new Map<string, number>(options.map(o => [o, 0]));
    const otherTexts: string[] = [];
    let totalAnswered = 0;

    for (const resp of responses) {
      const raw = resp.answers?.[q.id];
      if (!raw) continue;

      if (q.type === 'multi_choice') {
        const vals =
          typeof raw === 'object' && 'values' in raw && Array.isArray(raw.values) ? raw.values : [];
        if (vals.length > 0 || (typeof raw === 'object' && 'otherText' in raw && raw.otherText?.trim())) {
          totalAnswered++;
        }
        for (const v of vals) {
          const key = v === '__OTHER__' ? otherLabel : v;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        if (typeof raw === 'object' && 'otherText' in raw && raw.otherText?.trim()) {
          otherTexts.push(raw.otherText.trim());
        }
      } else {
        const val = typeof raw === 'string' ? raw : 'value' in raw ? raw.value : '';
        if (val) {
          totalAnswered++;
          const key = val === '__OTHER__' ? otherLabel : val;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        if (typeof raw === 'object' && 'otherText' in raw && raw.otherText?.trim()) {
          otherTexts.push(raw.otherText.trim());
        }
      }
    }

    base.totalAnswered = totalAnswered;
    base.optionCounts = options.map(opt => {
      const cnt = counts.get(opt) || 0;
      return {
        option: opt,
        count: cnt,
        percentage: totalAnswered > 0 ? Number(((cnt / totalAnswered) * 100).toFixed(1)) : 0,
      };
    });
    if (otherTexts.length > 0) {
      base.otherTexts = otherTexts;
    }
    return base;
  });

  return {
    totalResponses: responses.length,
    consentedCount: responses.length - declinedCount,
    declinedCount,
    questionSummaries,
  };
}
