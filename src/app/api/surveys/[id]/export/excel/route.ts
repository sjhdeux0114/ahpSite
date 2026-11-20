import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  buildMatrix,
  calculateAHP,
  aggregateGroupMatrices,
  aggregateAndSynthesizeAlternatives,
  getRandomIndex,
  AHPResult,
  SubCriterionResult,
} from '@/lib/ahp/calculator';
import { generateExcelReport } from '@/lib/export/excel';
import { generateFormExcelReport } from '@/lib/export/formExcel';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: {
      responses: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!survey || survey.userId !== user.id) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
  }

  const surveyType = (survey as any).surveyType || 'AHP';
  if (surveyType === 'FORM') {
    const formConfig = JSON.parse((survey as any).formConfig || '{}');
    const formResponses = survey.responses.map(r => {
      let answers: any = {};
      try { answers = JSON.parse(r.answers); } catch {}
      return {
        id: r.id,
        name: r.respondentName || '익명 응답자',
        email: r.respondentEmail || '',
        isValid: r.isValid,
        createdAt: r.createdAt,
        answers,
      };
    });
    const excelBuffer = await generateFormExcelReport({
      title: survey.title,
      description: survey.description || '',
      createdAt: survey.createdAt,
      formConfig,
      responses: formResponses,
    });
    const filename = encodeURIComponent(`${survey.title}_설문결과.xlsx`);
    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  }

  const criteria: Array<{ id: string; name: string; description?: string; subcriteria?: Array<{ id: string; name: string; description?: string }> }> = JSON.parse(survey.criteria || '[]');
  const alternatives: Array<{ id: string; name: string; description?: string }> = JSON.parse(survey.alternatives || '[]');
  const demographics: Array<{ id: string; title: string }> = JSON.parse(survey.demographics || '[]');
  const criteriaIds = criteria.map(c => c.id);
  const altIds = alternatives.map(a => a.id);

  const parsedResponses = survey.responses.map(r => {
    let answers: any = {};
    let crResults: any = {};
    let demographicAnswers: any = {};
    try { answers = JSON.parse(r.answers); } catch {}
    try { crResults = JSON.parse(r.crResults); } catch {}
    try { demographicAnswers = JSON.parse(r.demographics || '{}'); } catch {}

    return {
      id: r.id,
      name: r.respondentName || '익명',
      email: r.respondentEmail || '',
      createdAt: r.createdAt,
      isValid: r.isValid,
      criteriaCR: crResults.criteriaCR ?? 0,
      demographics: demographicAnswers,
      answers,
    };
  });


  // Calculate group AHP (using all responses or valid ones)
  const validResponses = parsedResponses.filter(r => r.isValid);
  const targetResponses = validResponses.length > 0 ? validResponses : parsedResponses;

  let criteriaAHP: AHPResult;
  let subcriteriaAHPByCriteria: Record<string, AHPResult> = {};
  const allSubList: Array<SubCriterionResult> = [];
  let compositeCR = 0;
  let alternativesAHPByCriteria: Record<string, AHPResult> = {};
  let finalAlternativeWeights: { alternativeWeights: number[]; contributionMatrix: number[][] } | undefined = undefined;

  const threshold = survey.consistencyThreshold ?? 0.1;

  if (targetResponses.length === 0) {
    criteriaAHP = calculateAHP(buildMatrix(criteriaIds, {}), threshold);
  } else {
    const individualCritMatrices = targetResponses.map(r =>
      buildMatrix(criteriaIds, r.answers.criteria || {})
    );
    const groupCritMatrix = aggregateGroupMatrices(individualCritMatrices);
    criteriaAHP = calculateAHP(groupCritMatrix, threshold);

    // Subcriteria Group Aggregation
    let sumWeightedCI = 0;
    let sumWeightedRI = 0;

    criteria.forEach((crit, cIdx) => {
      const subs = crit.subcriteria || [];
      const critWeight = criteriaAHP.weights[cIdx] || 0;

      if (subs.length >= 2) {
        const subIds = subs.map(s => s.id);
        const individualSubMatrices = targetResponses.map(r =>
          buildMatrix(subIds, r.answers.subcriteria?.[crit.id] || {})
        );
        const groupSubMatrix = aggregateGroupMatrices(individualSubMatrices);
        const subAHP = calculateAHP(groupSubMatrix, threshold);
        subcriteriaAHPByCriteria[crit.id] = subAHP;

        const subRI = getRandomIndex(subs.length);
        sumWeightedCI += critWeight * subAHP.ci;
        sumWeightedRI += critWeight * subRI;

        subs.forEach((s, sIdx) => {
          const localWeight = subAHP.weights[sIdx] || 0;
          const globalWeight = critWeight * localWeight;
          allSubList.push({
            id: s.id,
            name: s.name,
            description: s.description,
            criterionId: crit.id,
            criterionName: crit.name,
            localWeight: Number(localWeight.toFixed(4)),
            globalWeight: Number(globalWeight.toFixed(4)),
            globalRank: 0,
          });
        });
      }
    });

    allSubList.sort((a, b) => b.globalWeight - a.globalWeight);
    allSubList.forEach((item, idx) => {
      item.globalRank = idx + 1;
    });

    const mainRI = getRandomIndex(criteria.length);
    const compositeCI = Number((criteriaAHP.ci + sumWeightedCI).toFixed(4));
    const compositeRI = Number((mainRI + sumWeightedRI).toFixed(4));
    compositeCR = compositeRI > 0 ? Number((compositeCI / compositeRI).toFixed(4)) : 0.0;

    if (survey.hasAlternatives && alternatives.length > 0) {
      const synthesized = aggregateAndSynthesizeAlternatives(
        criteria,
        criteriaAHP.weights,
        subcriteriaAHPByCriteria,
        altIds,
        targetResponses.map(r => r.answers.alternatives),
        threshold
      );
      alternativesAHPByCriteria = synthesized.alternativesAHPByCriteria;
      finalAlternativeWeights = synthesized.finalAlternativeWeights;
    }
  }

  const excelBuffer = await generateExcelReport({
    title: survey.title,
    description: survey.description || '',
    createdAt: survey.createdAt,
    status: survey.status,
    criteria,
    alternatives,
    demographics,
    hasAlternatives: survey.hasAlternatives,
    hasSubcriteria: allSubList.length > 0,
    consistencyThreshold: threshold,

    totalResponses: parsedResponses.length,
    validResponses: validResponses.length,
    criteriaAHP,
    subcriteriaAHPByCriteria,
    allSubcriteria: allSubList,
    compositeCR,
    isHierarchyConsistent: compositeCR <= threshold,
    alternativesAHPByCriteria,
    finalAlternativeWeights,
    individualResponses: parsedResponses,
  });

  const filename = encodeURIComponent(`${survey.title}_AHP분석결과.xlsx`);

  return new NextResponse(excelBuffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  });
}
