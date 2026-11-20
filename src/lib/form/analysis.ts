import {
  extractSingleValue,
  FormAnswerMap,
  FormAnswerValue,
  FormConfig,
  FormQuestion,
} from './types';

export interface FormQuestionSummary {
  questionId: string;
  sectionId: string;
  sectionTitle: string;
  numberLabel?: string;
  title: string;
  type: FormQuestion['type'];
  required: boolean;
  totalAnswered: number;
  // For single_choice, multi_choice, dropdown, consent, linear_scale
  optionCounts?: Array<{
    option: string;
    count: number;
    percentage: number;
  }>;
  otherTexts?: string[];
  // For linear_scale
  scaleStats?: {
    scaleMin: number;
    scaleMax: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
  // For ranking
  rankingStats?: Array<{
    option: string;
    avgRank: number;
    firstPlaceCount: number;
    totalRanked: number;
  }>;
  // For number
  numberStats?: {
    mean: number;
    median: number;
    min: number;
    max: number;
    unit?: string;
  };
  // For matrix_single, matrix_multi
  matrixCounts?: Array<{
    row: string;
    totalRowAnswered: number;
    columns: Array<{
      column: string;
      count: number;
      percentage: number;
    }>;
  }>;
  // For short_text, long_text, date, time
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

export interface FormResponseRecord {
  id: string;
  name?: string;
  email?: string;
  isValid?: boolean;
  createdAt: string | Date;
  answers: FormAnswerMap;
}

export function formatFormAnswerText(q: FormQuestion, raw: FormAnswerValue | undefined): string {
  if (raw === undefined || raw === null) return '';

  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'string') return raw;

  if ('scale' in raw && typeof raw.scale === 'number') {
    return String(raw.scale);
  }

  if ('ranked' in raw && Array.isArray(raw.ranked)) {
    return raw.ranked.map((item, idx) => `${idx + 1}위: ${item}`).join(' > ');
  }

  if ('rows' in raw && raw.rows) {
    return Object.entries(raw.rows)
      .map(([r, c]) => `${r}: ${c}`)
      .join(' / ');
  }

  if ('rowsMulti' in raw && raw.rowsMulti) {
    return Object.entries(raw.rowsMulti)
      .map(([r, cols]) => `${r}: ${(cols || []).join(', ')}`)
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

export function filterFormResponses(
  responses: FormResponseRecord[],
  options: {
    onlyValid?: boolean;
    questionId?: string;
    optionValue?: string;
  }
): FormResponseRecord[] {
  let list = responses;
  if (options.onlyValid) {
    list = list.filter(r => r.isValid !== false);
  }
  if (options.questionId && options.optionValue) {
    const qId = options.questionId;
    const targetVal = options.optionValue;
    list = list.filter(r => {
      const raw = r.answers?.[qId];
      if (!raw) return false;
      if (typeof raw === 'object' && 'values' in raw && Array.isArray(raw.values)) {
        return raw.values.includes(targetVal);
      }
      return extractSingleValue(raw) === targetVal;
    });
  }
  return list;
}

export function analyzeFormResponses(
  formConfig: FormConfig,
  responses: FormResponseRecord[]
): FormAnalysisSummary {
  const sections = formConfig.sections || [];
  const questions = formConfig.questions || [];
  const sectionMap = new Map(sections.map(s => [s.id, s.title]));

  let declinedCount = 0;
  const consentQuestions = questions.filter(q => q.type === 'consent' && (q.endOnOptions || []).length > 0);
  if (consentQuestions.length > 0) {
    for (const resp of responses) {
      const ended = consentQuestions.some(cq => {
        const val = extractSingleValue(resp.answers?.[cq.id]);
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

    if (q.type === 'short_text' || q.type === 'long_text' || q.type === 'date' || q.type === 'time') {
      const texts: NonNullable<FormQuestionSummary['textResponses']> = [];
      for (const resp of responses) {
        const text = extractSingleValue(resp.answers?.[q.id]).trim();
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

    if (q.type === 'number') {
      const nums: number[] = [];
      const texts: NonNullable<FormQuestionSummary['textResponses']> = [];
      for (const resp of responses) {
        const raw = resp.answers?.[q.id];
        const str = extractSingleValue(raw).trim();
        if (!str) continue;
        const n = Number(str);
        if (!Number.isNaN(n) && Number.isFinite(n)) {
          nums.push(n);
          texts.push({
            responseId: resp.id,
            respondentName: resp.name || '익명 응답자',
            text: q.unit ? `${n} ${q.unit}` : String(n),
            createdAt: typeof resp.createdAt === 'string' ? resp.createdAt : resp.createdAt.toISOString(),
          });
        }
      }
      base.totalAnswered = nums.length;
      base.textResponses = texts;
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mid = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 === 0
            ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
            : sorted[mid];
        base.numberStats = {
          mean: Number((sum / nums.length).toFixed(2)),
          median,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          unit: q.unit,
        };
      }
      return base;
    }

    if (q.type === 'linear_scale') {
      const sMin = q.scaleMin ?? 1;
      const sMax = q.scaleMax ?? 5;
      const points: number[] = [];
      for (let v = sMin; v <= sMax; v++) points.push(v);

      const counts = new Map<number, number>(points.map(p => [p, 0]));
      const vals: number[] = [];

      for (const resp of responses) {
        const raw = resp.answers?.[q.id];
        const str = extractSingleValue(raw).trim();
        if (!str) continue;
        const n = Number(str);
        if (!Number.isNaN(n) && n >= sMin && n <= sMax) {
          vals.push(n);
          counts.set(n, (counts.get(n) || 0) + 1);
        }
      }

      base.totalAnswered = vals.length;
      base.optionCounts = points.map(p => {
        const cnt = counts.get(p) || 0;
        return {
          option: String(p),
          count: cnt,
          percentage: vals.length > 0 ? Number(((cnt / vals.length) * 100).toFixed(1)) : 0,
        };
      });

      if (vals.length > 0) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance =
          vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
        base.scaleStats = {
          scaleMin: sMin,
          scaleMax: sMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          mean: Number(mean.toFixed(2)),
          stdDev: Number(Math.sqrt(variance).toFixed(2)),
          min: Math.min(...vals),
          max: Math.max(...vals),
        };
      } else {
        base.scaleStats = {
          scaleMin: sMin,
          scaleMax: sMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
        };
      }
      return base;
    }

    if (q.type === 'ranking') {
      const options = q.options || [];
      const rankSums = new Map<string, number>(options.map(o => [o, 0]));
      const rankCounts = new Map<string, number>(options.map(o => [o, 0]));
      const firstCounts = new Map<string, number>(options.map(o => [o, 0]));
      let totalAnswered = 0;

      for (const resp of responses) {
        const raw = resp.answers?.[q.id];
        if (raw && typeof raw === 'object' && 'ranked' in raw && Array.isArray(raw.ranked) && raw.ranked.length > 0) {
          totalAnswered++;
          raw.ranked.forEach((opt, idx) => {
            const rank = idx + 1;
            rankSums.set(opt, (rankSums.get(opt) || 0) + rank);
            rankCounts.set(opt, (rankCounts.get(opt) || 0) + 1);
            if (rank === 1) {
              firstCounts.set(opt, (firstCounts.get(opt) || 0) + 1);
            }
          });
        }
      }

      base.totalAnswered = totalAnswered;
      base.rankingStats = options
        .map(opt => {
          const cnt = rankCounts.get(opt) || 0;
          const sum = rankSums.get(opt) || 0;
          return {
            option: opt,
            avgRank: cnt > 0 ? Number((sum / cnt).toFixed(2)) : 0,
            firstPlaceCount: firstCounts.get(opt) || 0,
            totalRanked: cnt,
          };
        })
        .sort((a, b) => {
          if (a.avgRank === 0 && b.avgRank === 0) return 0;
          if (a.avgRank === 0) return 1;
          if (b.avgRank === 0) return -1;
          return a.avgRank - b.avgRank;
        });
      return base;
    }

    if (q.type === 'matrix_single' || q.type === 'matrix_multi') {
      const rows = q.rows || [];
      const cols = q.columns || [];
      const matrixCounts = rows.map(row => {
        const colCounts = new Map<string, number>(cols.map(c => [c, 0]));
        let rowTotal = 0;
        for (const resp of responses) {
          const raw = resp.answers?.[q.id];
          if (q.type === 'matrix_single' && raw && typeof raw === 'object' && 'rows' in raw) {
            const chosen = raw.rows?.[row];
            if (chosen) {
              rowTotal++;
              colCounts.set(chosen, (colCounts.get(chosen) || 0) + 1);
            }
          } else if (q.type === 'matrix_multi' && raw && typeof raw === 'object' && 'rowsMulti' in raw) {
            const chosenList = raw.rowsMulti?.[row] || [];
            if (chosenList.length > 0) {
              rowTotal++;
              for (const c of chosenList) {
                colCounts.set(c, (colCounts.get(c) || 0) + 1);
              }
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
        if (q.type === 'matrix_single' && raw && typeof raw === 'object' && 'rows' in raw && Object.keys(raw.rows || {}).length > 0) {
          anyAnswered++;
        } else if (q.type === 'matrix_multi' && raw && typeof raw === 'object' && 'rowsMulti' in raw && Object.keys(raw.rowsMulti || {}).length > 0) {
          anyAnswered++;
        }
      }
      base.totalAnswered = anyAnswered;
      base.matrixCounts = matrixCounts;
      return base;
    }

    // single_choice, multi_choice, dropdown, consent
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
        const val = extractSingleValue(raw);
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
