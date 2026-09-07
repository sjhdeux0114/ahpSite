import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  buildMatrix,
  calculateAHP,
  aggregateGroupMatrices,
  synthesizePriorities,
  AHPResult,
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
  const criteriaIds = criteria.map(c => c.id);
  const altIds = alternatives.map(a => a.id);

  // Parse raw responses
  const parsedResponses = survey.responses.map(r => {
    let answers: any = {};
    let crResults: any = {};
    try { answers = JSON.parse(r.answers); } catch {}
    try { crResults = JSON.parse(r.crResults); } catch {}

    return {
      id: r.id,
      name: r.respondentName || '익명 응답자',
      email: r.respondentEmail || '',
      createdAt: r.createdAt,
      isValid: r.isValid,
      criteriaCR: crResults.criteriaCR ?? 0,
      alternativesCR: crResults.alternativesCR ?? {},
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
    },
    analysis: {
      totalResponses: parsedResponses.length,
      analyzedResponses: targetResponses.length,
      validResponsesCount: parsedResponses.filter(r => r.isValid).length,
      criteriaAHP,
      alternativesAHPByCriteria,
      finalAlternativeWeights,
    },
    responses: parsedResponses,
  });
}
