import ExcelJS from 'exceljs';
import { extractSingleValue, FormConfig, FormQuestion } from '@/lib/form/types';
import { analyzeFormResponses, formatFormAnswerText } from '@/lib/form/analysis';

function getNumericCodeForQuestion(q: FormQuestion, raw: any): string | number {
  if (raw === undefined || raw === null) return '';

  if (q.type === 'number' || q.type === 'linear_scale') {
    const str = extractSingleValue(raw).trim();
    if (!str) return '';
    const num = Number(str);
    return Number.isNaN(num) ? '' : num;
  }

  if (q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'consent') {
    const val = extractSingleValue(raw);
    if (!val) return '';
    const opts = [...(q.options || [])];
    if (q.allowOther) opts.push(q.otherLabel || '기타');
    const idx = opts.indexOf(val);
    if (idx >= 0) return idx + 1;
    if (val === '__OTHER__' && q.allowOther) return opts.length;
    return val;
  }

  if (q.type === 'multi_choice') {
    const vals: string[] =
      typeof raw === 'object' && 'values' in raw && Array.isArray(raw.values) ? raw.values : [];
    if (vals.length === 0) return '';
    const opts = [...(q.options || [])];
    if (q.allowOther) opts.push(q.otherLabel || '기타');
    return vals
      .map(v => {
        const idx = opts.indexOf(v);
        if (idx >= 0) return String(idx + 1);
        if (v === '__OTHER__' && q.allowOther) return String(opts.length);
        return v;
      })
      .join(',');
  }

  if (q.type === 'ranking') {
    const ranked: string[] =
      typeof raw === 'object' && 'ranked' in raw && Array.isArray(raw.ranked) ? raw.ranked : [];
    if (ranked.length === 0) return '';
    const opts = q.options || [];
    return ranked
      .map(item => {
        const idx = opts.indexOf(item);
        return idx >= 0 ? String(idx + 1) : item;
      })
      .join('>');
  }

  if (q.type === 'matrix_single') {
    const rows = q.rows || [];
    const cols = q.columns || [];
    if (typeof raw !== 'object' || !('rows' in raw) || !raw.rows) return '';
    return rows
      .map(r => {
        const chosen = raw.rows?.[r];
        if (!chosen) return '';
        const idx = cols.indexOf(chosen);
        return idx >= 0 ? String(idx + 1) : chosen;
      })
      .join('|');
  }

  if (q.type === 'matrix_multi') {
    const rows = q.rows || [];
    const cols = q.columns || [];
    if (typeof raw !== 'object' || !('rowsMulti' in raw) || !raw.rowsMulti) return '';
    return rows
      .map(r => {
        const chosenList: string[] = raw.rowsMulti?.[r] || [];
        return chosenList
          .map(c => {
            const idx = cols.indexOf(c);
            return idx >= 0 ? String(idx + 1) : c;
          })
          .join(',');
      })
      .join('|');
  }

  return formatFormAnswerText(q, raw);
}

export async function generateFormExcelReport(data: {
  title: string;
  description?: string;
  createdAt: Date;
  formConfig: FormConfig;
  responses: Array<{
    id: string;
    name: string;
    email?: string;
    isValid?: boolean;
    createdAt: Date;
    answers: Record<string, any>;
  }>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AHP & Survey System';
  workbook.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 15, color: { argb: 'FF1E1B4B' } };
  const subTitleFont: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: 'FF312E81' } };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const summary = analyzeFormResponses(data.formConfig, data.responses);

  // Sheet 1: 문항별 집계 요약
  const wsSummary = workbook.addWorksheet('문항별 응답 요약');
  wsSummary.addRow([data.title]).font = titleFont;
  if (data.formConfig.subtitle) wsSummary.addRow([`부제목: ${data.formConfig.subtitle}`]);
  if (data.formConfig.meta) wsSummary.addRow([`대상/시간: ${data.formConfig.meta}`]);
  wsSummary.addRow([
    `총 응답 수: ${summary.totalResponses}명 (동의/완료: ${summary.consentedCount}명, 미동의 종료: ${summary.declinedCount}명)`,
  ]);
  wsSummary.addRow([]);

  for (const qs of summary.questionSummaries) {
    const qLabel = qs.numberLabel ? `${qs.numberLabel}. ${qs.title}` : qs.title;
    wsSummary.addRow([`[${qs.sectionTitle}] ${qLabel} (응답 ${qs.totalAnswered}명)`]).font = subTitleFont;

    if (qs.scaleStats) {
      wsSummary.addRow([
        `평균: ${qs.scaleStats.mean} | 표준편차: ${qs.scaleStats.stdDev} | 범위: ${qs.scaleStats.scaleMin}~${qs.scaleStats.scaleMax}`,
      ]);
    }
    if (qs.numberStats) {
      const unitStr = qs.numberStats.unit ? ` (${qs.numberStats.unit})` : '';
      wsSummary.addRow([
        `평균: ${qs.numberStats.mean}${unitStr} | 중앙값: ${qs.numberStats.median}${unitStr} | 최소: ${qs.numberStats.min} | 최대: ${qs.numberStats.max}`,
      ]);
    }

    if (qs.optionCounts) {
      const h = wsSummary.addRow(['선택지', '응답 수', '비율 (%)']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const oc of qs.optionCounts) {
        const r = wsSummary.addRow([oc.option, oc.count, `${oc.percentage}%`]);
        r.eachCell(c => {
          c.border = borderStyle;
        });
      }
      if (qs.otherTexts && qs.otherTexts.length > 0) {
        wsSummary.addRow([`기타 직접입력 내용: ${qs.otherTexts.join(' | ')}`]);
      }
    } else if (qs.rankingStats) {
      const h = wsSummary.addRow(['항목', '평균 순위', '1순위 선택 수', '응답 수']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const rk of qs.rankingStats) {
        const r = wsSummary.addRow([rk.option, rk.avgRank, rk.firstPlaceCount, rk.totalRanked]);
        r.eachCell(c => {
          c.border = borderStyle;
        });
      }
    } else if (qs.matrixCounts) {
      const cols = qs.matrixCounts[0]?.columns.map(c => c.column) || [];
      const h = wsSummary.addRow(['항목(행)', ...cols, '응답 수']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const mr of qs.matrixCounts) {
        const r = wsSummary.addRow([
          mr.row,
          ...mr.columns.map(c => `${c.count}명 (${c.percentage}%)`),
          mr.totalRowAnswered,
        ]);
        r.eachCell(c => {
          c.border = borderStyle;
        });
      }
    } else if (qs.textResponses) {
      const h = wsSummary.addRow(['응답자', '작성 일시', '응답 내용']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const tr of qs.textResponses) {
        const r = wsSummary.addRow([tr.respondentName, tr.createdAt, tr.text]);
        r.eachCell(c => {
          c.border = borderStyle;
        });
      }
    }
    wsSummary.addRow([]);
  }

  wsSummary.columns = [
    { width: 34 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 16 },
  ];

  // Sheet 2: 개별 응답 원본
  const wsRaw = workbook.addWorksheet('개별 응답 데이터');
  const questions = data.formConfig.questions || [];
  const rawHeader = wsRaw.addRow([
    '번호',
    '유효여부',
    '응답 일시',
    ...questions.map(q => (q.numberLabel ? `${q.numberLabel}. ${q.title}` : q.title)),
  ]);
  rawHeader.eachCell(c => {
    c.fill = headerFill;
    c.font = headerFont;
  });

  data.responses.forEach((resp, idx) => {
    const row = wsRaw.addRow([
      idx + 1,
      resp.isValid === false ? '제외' : '유효',
      new Date(resp.createdAt).toLocaleString('ko-KR'),
      ...questions.map(q => formatFormAnswerText(q, resp.answers?.[q.id])),
    ]);
    row.eachCell(c => {
      c.border = borderStyle;
    });
  });

  wsRaw.columns = [
    { width: 8 },
    { width: 10 },
    { width: 22 },
    ...questions.map(() => ({ width: 28 })),
  ];

  // Sheet 3: 통계 코딩 데이터 (SPSS·R)
  const wsCoded = workbook.addWorksheet('통계 코딩 데이터(SPSS·R)');
  const codedHeader = wsCoded.addRow([
    'ID',
    'VALID',
    'CREATED_AT',
    ...questions.map((q, idx) => `Q${q.numberLabel || idx + 1}`),
  ]);
  codedHeader.eachCell(c => {
    c.fill = headerFill;
    c.font = headerFont;
  });

  data.responses.forEach((resp, idx) => {
    const row = wsCoded.addRow([
      idx + 1,
      resp.isValid === false ? 0 : 1,
      new Date(resp.createdAt).toISOString(),
      ...questions.map(q => getNumericCodeForQuestion(q, resp.answers?.[q.id])),
    ]);
    row.eachCell(c => {
      c.border = borderStyle;
    });
  });

  wsCoded.columns = [
    { width: 8 },
    { width: 10 },
    { width: 24 },
    ...questions.map(() => ({ width: 16 })),
  ];

  // Sheet 4: 코딩북 (Codebook)
  const wsCodebook = workbook.addWorksheet('코딩북(Codebook)');
  const cbHeader = wsCodebook.addRow(['변수명', '문항 제목', '문항 유형', '코드 매핑 (1, 2, 3...)']);
  cbHeader.eachCell(c => {
    c.fill = headerFill;
    c.font = headerFont;
  });

  questions.forEach((q, idx) => {
    const varName = `Q${q.numberLabel || idx + 1}`;
    let mapping = '';
    if (q.type === 'linear_scale') {
      mapping = `${q.scaleMin ?? 1}~${q.scaleMax ?? 5} (${q.scaleMinLabel || ''} ~ ${q.scaleMaxLabel || ''})`;
    } else if (q.type === 'matrix_single' || q.type === 'matrix_multi') {
      const colMap = (q.columns || []).map((c, i) => `${i + 1}=${c}`).join(', ');
      mapping = `행 순서(| 구분): ${(q.rows || []).join(' / ')} | 열 코드: ${colMap}`;
    } else if (q.options && q.options.length > 0) {
      const opts = [...q.options];
      if (q.allowOther) opts.push(q.otherLabel || '기타');
      mapping = opts.map((o, i) => `${i + 1}=${o}`).join(', ');
    } else {
      mapping = '원본 값';
    }
    const r = wsCodebook.addRow([varName, q.title, q.type, mapping]);
    r.eachCell(c => {
      c.border = borderStyle;
    });
  });

  wsCodebook.columns = [
    { width: 12 },
    { width: 38 },
    { width: 16 },
    { width: 56 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
