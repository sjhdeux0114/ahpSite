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
import { generateWordReport } from '@/lib/export/word';

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

  const criteria: Array<{ id: string; name: string; description?: string }> = JSON.parse(survey.criteria || '[]');
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


  const validResponses = parsedResponses.filter(r => r.isValid);
  const targetResponses = validResponses.length > 0 ? validResponses : parsedResponses;

  let criteriaAHP: AHPResult;
  let alternativesAHPByCriteria: Record<string, AHPResult> = {};
  let finalAlternativeWeights: { alternativeWeights: number[]; contributionMatrix: number[][] } | undefined = undefined;

  if (targetResponses.length === 0) {
    criteriaAHP = calculateAHP(buildMatrix(criteriaIds, {}));
  } else {
    const individualCritMatrices = targetResponses.map(r =>
      buildMatrix(criteriaIds, r.answers.criteria || {})
    );
    const groupCritMatrix = aggregateGroupMatrices(individualCritMatrices);
    criteriaAHP = calculateAHP(groupCritMatrix);

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
  }

  const wordBuffer = await generateWordReport({
    title: survey.title,
    description: survey.description || '',
    createdAt: survey.createdAt,
    status: survey.status,
    criteria,
    alternatives,
    demographics,
    hasAlternatives: survey.hasAlternatives,

    totalResponses: parsedResponses.length,
    validResponses: validResponses.length,
    criteriaAHP,
    alternativesAHPByCriteria,
    finalAlternativeWeights,
    individualResponses: parsedResponses,
  });

  const filename = encodeURIComponent(`${survey.title}_AHP보고서.docx`);

  return new NextResponse(wordBuffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  });
}
