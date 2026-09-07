import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
  ShadingType,
} from 'docx';
import { SurveyExportData } from './excel';

export async function generateWordReport(data: SurveyExportData): Promise<Buffer> {
  const primaryColor = '312E81';
  const tableHeaderBg = 'EEF2FF';

  // Sort criteria
  const critList = data.criteria.map((c, idx) => ({
    name: c.name,
    desc: c.description || '-',
    weight: data.criteriaAHP.weights[idx] || 0,
  })).sort((a, b) => b.weight - a.weight);

  // Criteria Table
  const criteriaRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '순위', bold: true })] })],
        }),
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '평가 기준명', bold: true })] })],
        }),
        new TableCell({
          width: { size: 3500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '설명', bold: true })] })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '가중치', bold: true })] })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '비율 (%)', bold: true })] })],
        }),
      ],
    }),
    ...critList.map((c, idx) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, text: String(idx + 1) })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: c.name, bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ text: c.desc })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: c.weight.toFixed(4) })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: `${(c.weight * 100).toFixed(2)}%` })],
          }),
        ],
      })
    ),
  ];

  // Alternatives Table
  let alternativeRows: TableRow[] = [];
  if (data.hasAlternatives && data.finalAlternativeWeights && data.alternatives.length > 0) {
    const altList = data.alternatives.map((a, idx) => ({
      name: a.name,
      desc: a.description || '-',
      score: data.finalAlternativeWeights!.alternativeWeights[idx] || 0,
    })).sort((a, b) => b.score - a.score);

    alternativeRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '순위', bold: true })] })],
          }),
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '대안명', bold: true })] })],
          }),
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '설명', bold: true })] })],
          }),
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '종합 점수', bold: true })] })],
          }),
        ],
      }),
      ...altList.map((a, idx) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, text: String(idx + 1) })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: a.name, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ text: a.desc })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: `${(a.score * 100).toFixed(2)}% (${a.score.toFixed(4)})` })],
            }),
          ],
        })
      ),
    ];
  }

  // Demographics Table (if exists)
  let demoTableRows: TableRow[] = [];
  if (data.demographics && data.demographics.length > 0 && data.individualResponses.length > 0) {
    demoTableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '항목명', bold: true })] })],
          }),
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '응답 분포 현황', bold: true })] })],
          }),
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: tableHeaderBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '유효 응답', bold: true })] })],
          }),
        ],
      }),
      ...data.demographics.map(demo => {
        const countMap: Record<string, number> = {};
        data.individualResponses.forEach(r => {
          const val = r.demographics?.[demo.id];
          if (val) countMap[val] = (countMap[val] || 0) + 1;
        });
        const summaryStr =
          Object.entries(countMap)
            .map(([k, v]) => `${k}: ${v}명 (${Math.round((v / data.individualResponses.length) * 100)}%)`)
            .join(', ') || '-';

        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: demo.title, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ text: summaryStr })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, text: `${data.individualResponses.length}명` })] }),
          ],
        });
      }),
    ];
  }

  const doc = new Document({

    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: 'AHP 의사결정 분석 결과 보고서',
                bold: true,
                size: 44,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: `프로젝트: ${data.title}`,
                bold: true,
                size: 26,
                color: '475569',
              }),
            ],
          }),

          // Metadata Callout
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `• 보고서 생성일: ${new Date().toLocaleDateString('ko-KR')}\n` }),
              new TextRun({ text: `• 총 수집 응답: ${data.totalResponses}명 (유효 응답: ${data.validResponses}명, 통과율: ${data.totalResponses > 0 ? ((data.validResponses / data.totalResponses) * 100).toFixed(1) : 0}%)\n` }),
              new TextRun({ text: `• 집단 일관성 비율(Group CR): ${data.criteriaAHP.cr} (${data.criteriaAHP.isConsistent ? '양호' : '주의'})\n` }),
            ],
          }),

          // Section 1: Overview
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '1. 분석 개요 및 방법론', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '본 조사는 계층화 의사결정 기법(Analytic Hierarchy Process, AHP)을 기반으로 다수의 평가 기준과 대안에 대해 1:1 쌍대비교(Pairwise Comparison)를 수행하여 정량적 가중치와 종합 우선순위를 도출했습니다.\n' +
                      '설문 응답 시 실시간 일관성 검증을 통해 논리적 모순을 방지하였으며, 수집된 개별 응답자들의 쌍대비교 행렬을 기하평균(Geometric Mean, AIJ) 방식으로 집계하여 집단 합의 가중치를 계산하였습니다.',
              }),
            ],
          }),

          // Section 2: Criteria
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '2. 평가 기준(Criteria) 중요도 분석', bold: true, color: primaryColor })],
          }),
          new Table({
            rows: criteriaRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({
            spacing: { before: 150, after: 300 },
            children: [
              new TextRun({
                text: `* 최대고유치(λmax): ${data.criteriaAHP.lambdaMax}, 일관성지수(CI): ${data.criteriaAHP.ci}, 일관성비율(CR): ${data.criteriaAHP.cr} (기준치 CR ≤ 0.10 충족 여부: ${data.criteriaAHP.isConsistent ? '충족' : '초과'})`,
                italics: true,
                size: 18,
                color: '64748B',
              }),
            ],
          }),

          // Section 3: Alternatives (if exists)
          ...(alternativeRows.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                  children: [new TextRun({ text: '3. 대안(Alternatives) 종합 우선순위', bold: true, color: primaryColor })],
                }),
                new Table({
                  rows: alternativeRows,
                  width: { size: 100, type: WidthType.PERCENTAGE },
                }),
                new Paragraph({
                  spacing: { before: 150, after: 300 },
                  children: [
                    new TextRun({
                      text: `* 종합 점수는 각 평가 기준의 가중치와 각 기준별 대안 평가 점수를 가중합산(Synthesis)한 결과입니다. 1위 대안은 '${data.alternatives.find((_, idx) => data.finalAlternativeWeights?.alternativeWeights[idx] === Math.max(...(data.finalAlternativeWeights?.alternativeWeights || [])))?.name || ''}'입니다.`,
                      size: 18,
                      color: '64748B',
                    }),
                  ],
                }),
              ]
            : []),
          // Demographics Section (if exists)
          ...(demoTableRows.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                  children: [new TextRun({ text: '4. 응답자 인적사항(프로필) 특성 분석', bold: true, color: primaryColor })],
                }),
                new Table({
                  rows: demoTableRows,
                  width: { size: 100, type: WidthType.PERCENTAGE },
                }),
                new Paragraph({
                  spacing: { before: 150, after: 300 },
                  children: [
                    new TextRun({
                      text: `* 본 조사의 응답자 프로필 분포 현황입니다.`,
                      size: 18,
                      color: '64748B',
                    }),
                  ],
                }),
              ]
            : []),

          // Section 5: Summary & Conclusion
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '5. 결론 및 종합 제언', bold: true, color: primaryColor })],
          }),

          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `본 AHP 분석 결과, 평가 기준 중에서는 '${critList[0]?.name}'이(가) ${(critList[0]?.weight * 100).toFixed(1)}%의 가중치로 가장 중요한 요인으로 도출되었습니다.` +
                      (critList[1] ? ` 그 뒤를 이어 '${critList[1]?.name}'(${(critList[1]?.weight * 100).toFixed(1)}%) 순으로 중요도가 높게 나타났습니다.` : '') +
                      ` 전체 집단 일관성 비율은 ${data.criteriaAHP.cr}로 분석 결과의 신뢰성을 확보하였습니다.`,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
