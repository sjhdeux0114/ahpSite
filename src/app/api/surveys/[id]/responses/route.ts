import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  buildMatrix,
  calculateAHP,
  aggregateGroupMatrices,
  synthesizePriorities,
  getRandomIndex,
  AHPResult,
  SubCriterionResult,
} from '@/lib/ahp/calculator';

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

  const { searchParams } = new URL(request.url);
  const onlyValid = searchParams.get('onlyValid') === 'true';

  const criteria: Array<{ id: string; name: string; description?: string }> = JSON.parse(survey.criteria || '[]');
  const alternatives: Array<{ id: string; name: string; description?: string }> = JSON.parse(survey.alternatives || '[]');
  const demographics: Array<any> = JSON.parse(survey.demographics || '[]');
  const criteriaIds = criteria.map(c => c.id);
  const altIds = alternatives.map(a => a.id);

  // Parse raw responses
  const parsedResponses = survey.responses.map(r => {
    let answers: any = {};
    let crResults: any = {};
    let demographicAnswers: any = {};
    try { answers = JSON.parse(r.answers); } catch {}
    try { crResults = JSON.parse(r.crResults); } catch {}
    try { demographicAnswers = JSON.parse(r.demographics || '{}'); } catch {}

    return {
      id: r.id,
      name: r.respondentName || '익명 응답자',
      email: r.respondentEmail || '',
      createdAt: r.createdAt,
      isValid: r.isValid,
      criteriaCR: crResults.criteriaCR ?? 0,
      alternativesCR: crResults.alternativesCR ?? {},
      demographics: demographicAnswers,
      answers,
    };
  });


  // Filter if requested
  const targetResponses = onlyValid
    ? parsedResponses.filter(r => r.isValid)
    : parsedResponses;

  // If no responses, return empty baseline
  if (targetResponses.length === 0) {
    const emptyCriteriaMatrix = buildMatrix(criteriaIds, {});
    const emptyCriteriaAHP = calculateAHP(emptyCriteriaMatrix);

    return NextResponse.json({
      survey: {
        ...survey,
        criteria,
        alternatives,
      },
      analysis: {
        totalResponses: parsedResponses.length,
        analyzedResponses: 0,
        validResponsesCount: parsedResponses.filter(r => r.isValid).length,
        criteriaAHP: emptyCriteriaAHP,
        alternativesAHPByCriteria: {},
        finalAlternativeWeights: null,
      },
      responses: parsedResponses,
    });
  }

  // 1. Group Criteria Matrix Aggregation
  const individualCritMatrices = targetResponses.map(r =>
    buildMatrix(criteriaIds, r.answers.criteria || {})
  );
  const groupCritMatrix = aggregateGroupMatrices(individualCritMatrices);
  const criteriaAHP = calculateAHP(groupCritMatrix);

  // 1-B. Group Subcriteria Matrix Aggregation (per criterion)
  const subcriteriaAHPByCriteria: Record<string, AHPResult> = {};
  const allSubList: Array<SubCriterionResult> = [];
  let sumWeightedCI = 0;
  let sumWeightedRI = 0;
  let hasAnySubcriteria = false;

  criteria.forEach((crit: any, cIdx: number) => {
    const subs = crit.subcriteria || [];
    const critWeight = criteriaAHP.weights[cIdx] || 0;

    if (subs.length >= 2) {
      hasAnySubcriteria = true;
      const subIds = subs.map((s: any) => s.id);
      const individualSubMatrices = targetResponses.map(r =>
        buildMatrix(subIds, r.answers.subcriteria?.[crit.id] || {})
      );
      const groupSubMatrix = aggregateGroupMatrices(individualSubMatrices);
      const subAHP = calculateAHP(groupSubMatrix);
      subcriteriaAHPByCriteria[crit.id] = subAHP;

      const subRI = getRandomIndex(subs.length);
      sumWeightedCI += critWeight * subAHP.ci;
      sumWeightedRI += critWeight * subRI;

      subs.forEach((s: any, sIdx: number) => {
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
  const compositeCR = compositeRI > 0 ? Number((compositeCI / compositeRI).toFixed(4)) : 0.0;

  // 2. Group Alternatives Matrix Aggregation (per criterion)
  let alternativesAHPByCriteria: Record<string, AHPResult> = {};
  let finalAlternativeWeights: { alternativeWeights: number[]; contributionMatrix: number[][] } | null = null;

  if (survey.hasAlternatives && alternatives.length > 0) {
    const altWeightsByCriteria: number[][] = [];

    for (const crit of criteria) {
      const individualAltMatrices = targetResponses.map(r =>
        buildMatrix(altIds, r.answers.alternatives?.[crit.id] || {})
      );
      const groupAltMatrix = aggregateGroupMatrices(individualAltMatrices);
      const altAHP = calculateAHP(groupAltMatrix);
      alternativesAHPByCriteria[crit.id] = altAHP;
      altWeightsByCriteria.push(altAHP.weights);
    }

    finalAlternativeWeights = synthesizePriorities(criteriaAHP.weights, altWeightsByCriteria);
  }

  return NextResponse.json({
    survey: {
      ...survey,
      criteria,
      alternatives,
      demographics,
    },

    analysis: {
      totalResponses: parsedResponses.length,
      analyzedResponses: targetResponses.length,
      validResponsesCount: parsedResponses.filter(r => r.isValid).length,
      criteriaAHP,
      subcriteriaAHPByCriteria,
      allSubcriteria: allSubList,
      compositeCI,
      compositeRI,
      compositeCR,
      isHierarchyConsistent: compositeCR <= 0.10,
      hasSubcriteria: hasAnySubcriteria,
      alternativesAHPByCriteria,
      finalAlternativeWeights,
    },
    responses: parsedResponses,
  });
}
