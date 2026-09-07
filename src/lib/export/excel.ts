import ExcelJS from 'exceljs';
import { AHPResult } from '../ahp/calculator';

export interface SurveyExportData {
  title: string;
  description?: string;
  createdAt: Date;
  status: string;
  criteria: Array<{ id: string; name: string; description?: string }>;
  alternatives: Array<{ id: string; name: string; description?: string }>;
  hasAlternatives: boolean;
  totalResponses: number;
  validResponses: number;
  criteriaAHP: AHPResult;
  alternativesAHPByCriteria?: Record<string, AHPResult>;
  finalAlternativeWeights?: {
    alternativeWeights: number[];
    contributionMatrix: number[][];
  };
  individualResponses: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    isValid: boolean;
    criteriaCR: number;
    answers: Record<string, any>;
  }>;
}

export async function generateExcelReport(data: SurveyExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AHP Analytics Platform';
  workbook.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF312E81' }, // Deep Indigo
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Malgun Gothic',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  const titleFont: Partial<ExcelJS.Font> = {
    name: 'Malgun Gothic',
    size: 16,
    bold: true,
    color: { argb: 'FF1E1B4B' },
  };
  const subTitleFont: Partial<ExcelJS.Font> = {
    name: 'Malgun Gothic',
    size: 12,
    bold: true,
    color: { argb: 'FF4338CA' },
  };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // ==================== SHEET 1: 종합 분석 결과 ====================
  const wsSummary = workbook.addWorksheet('종합 결과 요약');
  wsSummary.views = [{ showGridLines: true }];

  wsSummary.addRow([`AHP 설문 분석 보고서: ${data.title}`]).font = titleFont;
  wsSummary.addRow([`설문 생성일: ${new Date(data.createdAt).toLocaleDateString()} | 총 응답 수: ${data.totalResponses}건 (유효 응답: ${data.validResponses}건)`]).font = { italic: true, color: { argb: 'FF64748B' } };
  wsSummary.addRow([]);

  // Criteria Table
  wsSummary.addRow(['1. 평가 기준(Criteria) 중요도 및 가중치']).font = subTitleFont;
  const critHeader = wsSummary.addRow(['순위', '평가 기준명', '설명', '가중치 (Weight)', '백분율 (%)']);
  critHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Sort criteria by weight descending
  const critList = data.criteria.map((c, idx) => ({
    name: c.name,
    desc: c.description || '-',
    weight: data.criteriaAHP.weights[idx] || 0,
  })).sort((a, b) => b.weight - a.weight);

  critList.forEach((c, idx) => {
    const row = wsSummary.addRow([
      idx + 1,
      c.name,
      c.desc,
      Number(c.weight.toFixed(4)),
      `${(c.weight * 100).toFixed(2)}%`,
    ]);
    row.eachCell(cell => { cell.border = borderStyle; });
    row.getCell(4).numFmt = '0.0000';
    row.getCell(1).alignment = { horizontal: 'center' };
  });

  wsSummary.addRow([]);
  wsSummary.addRow([
    '일관성 지표',
    `최대고유치(λmax): ${data.criteriaAHP.lambdaMax}`,
    `일관성지수(CI): ${data.criteriaAHP.ci}`,
    `일관성비율(CR): ${data.criteriaAHP.cr}`,
    data.criteriaAHP.isConsistent ? '판정: 일관성 통과 (CR ≤ 0.10)' : '판정: 일관성 주의 (CR > 0.10)',
  ]).font = { bold: true, color: { argb: data.criteriaAHP.isConsistent ? 'FF15803D' : 'FFB91C1C' } };
  wsSummary.addRow([]);

  // Alternatives Table (if exists)
  if (data.hasAlternatives && data.finalAlternativeWeights && data.alternatives.length > 0) {
    wsSummary.addRow(['2. 대안(Alternatives) 종합 우선순위']).font = subTitleFont;
    const altHeader = wsSummary.addRow(['최종 순위', '대안명', '설명', '종합 점수(가중치)', '백분율 (%)']);
    altHeader.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const altList = data.alternatives.map((a, idx) => ({
      name: a.name,
      desc: a.description || '-',
      score: data.finalAlternativeWeights!.alternativeWeights[idx] || 0,
    })).sort((a, b) => b.score - a.score);

    altList.forEach((a, idx) => {
      const row = wsSummary.addRow([
        idx + 1,
        a.name,
        a.desc,
        Number(a.score.toFixed(4)),
        `${(a.score * 100).toFixed(2)}%`,
      ]);
      row.eachCell(cell => { cell.border = borderStyle; });
      row.getCell(4).numFmt = '0.0000';
      row.getCell(1).alignment = { horizontal: 'center' };
    });
  }

  wsSummary.columns = [
    { width: 12 },
    { width: 25 },
    { width: 30 },
    { width: 20 },
    { width: 18 },
  ];

  // ==================== SHEET 2: 쌍대비교 행렬 ====================
  const wsMatrix = workbook.addWorksheet('집단 쌍대비교 행렬');
  wsMatrix.views = [{ showGridLines: true }];

  wsMatrix.addRow(['기준(Criteria) 집단 기하평균 쌍대비교 행렬']).font = subTitleFont;
  wsMatrix.addRow([]);

  const matrixHeaderRow = ['구분', ...data.criteria.map(c => c.name), '가중치(Wi)'];
  const mHeader = wsMatrix.addRow(matrixHeaderRow);
  mHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' };
  });

  data.criteria.forEach((rowCrit, i) => {
    const rowValues: any[] = [rowCrit.name];
    data.criteria.forEach((_, j) => {
      rowValues.push(Number(data.criteriaAHP.matrix[i][j].toFixed(4)));
    });
    rowValues.push(Number(data.criteriaAHP.weights[i].toFixed(4)));
    const row = wsMatrix.addRow(rowValues);
    row.eachCell(cell => { cell.border = borderStyle; });
  });

  wsMatrix.columns = [
    { width: 20 },
    ...data.criteria.map(() => ({ width: 15 })),
    { width: 16 },
  ];

  // ==================== SHEET 3: 응답자별 상세 데이터 ====================
  const wsResp = workbook.addWorksheet('응답자별 데이터');
  wsResp.views = [{ showGridLines: true }];

  const respHeader = wsResp.addRow([
    '응답 번호',
    '응답자 이름',
    '이메일',
    '응답 일시',
    '기준 CR',
    '일관성 통과여부',
  ]);
  respHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' };
  });

  data.individualResponses.forEach((r, idx) => {
    const row = wsResp.addRow([
      idx + 1,
      r.name || '익명',
      r.email || '-',
      new Date(r.createdAt).toLocaleString(),
      r.criteriaCR.toFixed(4),
      r.isValid ? '적합 (통과)' : '부적합 (CR > 0.1)',
    ]);
    row.eachCell(cell => { cell.border = borderStyle; });
    row.getCell(5).numFmt = '0.0000';
    row.getCell(6).font = { color: { argb: r.isValid ? 'FF15803D' : 'FFDC2626' } };
  });

  wsResp.columns = [
    { width: 12 },
    { width: 20 },
    { width: 25 },
    { width: 24 },
    { width: 15 },
    { width: 20 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
