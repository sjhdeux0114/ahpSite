import ExcelJS from 'exceljs';
import { FormConfig } from '@/lib/form/types';
import { analyzeFormResponses, formatFormAnswerText } from '@/lib/form/analysis';

export async function generateFormExcelReport(data: {
  title: string;
  description?: string;
  createdAt: Date;
  formConfig: FormConfig;
  responses: Array<{
    id: string;
    name: string;
    email?: string;
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
  wsSummary.addRow([`총 응답 수: ${summary.totalResponses}명 (동의: ${summary.consentedCount}명, 미동의 종료: ${summary.declinedCount}명)`]);
  wsSummary.addRow([]);

  for (const qs of summary.questionSummaries) {
    const qLabel = qs.numberLabel ? `${qs.numberLabel}. ${qs.title}` : qs.title;
    wsSummary.addRow([`[${qs.sectionTitle}] ${qLabel} (응답 ${qs.totalAnswered}명)`]).font = subTitleFont;

    if (qs.optionCounts) {
      const h = wsSummary.addRow(['선택지', '응답 수', '비율 (%)']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const oc of qs.optionCounts) {
        const r = wsSummary.addRow([oc.option, oc.count, `${oc.percentage}%`]);
        r.eachCell(c => { c.border = borderStyle; });
      }
      if (qs.otherTexts && qs.otherTexts.length > 0) {
        wsSummary.addRow([`기타 직접입력 내용: ${qs.otherTexts.join(' | ')}`]);
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
        r.eachCell(c => { c.border = borderStyle; });
      }
    } else if (qs.textResponses) {
      const h = wsSummary.addRow(['응답자', '작성 일시', '응답 내용']);
      h.eachCell(c => {
        c.fill = headerFill;
        c.font = headerFont;
      });
      for (const tr of qs.textResponses) {
        const r = wsSummary.addRow([tr.respondentName, tr.createdAt, tr.text]);
        r.eachCell(c => { c.border = borderStyle; });
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
      new Date(resp.createdAt).toLocaleString('ko-KR'),
      ...questions.map(q => formatFormAnswerText(q, resp.answers?.[q.id])),
    ]);
    row.eachCell(c => { c.border = borderStyle; });
  });

  wsRaw.getColumn(1).width = 8;
  wsRaw.getColumn(2).width = 22;
  questions.forEach((_, idx) => {
    wsRaw.getColumn(idx + 3).width = 28;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
