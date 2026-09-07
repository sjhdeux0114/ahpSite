import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildMatrix, calculateAHP } from '@/lib/ahp/calculator';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const survey = await prisma.survey.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      slug: true,
      criteria: true,
      alternatives: true,
      hasAlternatives: true,
      demographics: true,
      createdAt: true,
    },
  });

  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    survey: {
      ...survey,
      criteria: JSON.parse(survey.criteria || '[]'),
      alternatives: JSON.parse(survey.alternatives || '[]'),
      demographics: JSON.parse(survey.demographics || '[]'),
    },
  });
}


export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const survey = await prisma.survey.findUnique({
    where: { slug: params.slug },
  });

  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (survey.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: '이 설문은 현재 배포가 종료되어 응답을 제출할 수 없습니다.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { respondentName, respondentEmail, answers, demographics } = body;

    const criteria: Array<{ id: string; name: string }> = JSON.parse(survey.criteria || '[]');
    const alternatives: Array<{ id: string; name: string }> = JSON.parse(survey.alternatives || '[]');
    const criteriaIds = criteria.map(c => c.id);
    const altIds = alternatives.map(a => a.id);

    // Calculate Criteria CR
    const criteriaMatrix = buildMatrix(criteriaIds, answers.criteria || {});
    const criteriaAHP = calculateAHP(criteriaMatrix);

    let isAllConsistent = criteriaAHP.isConsistent;
    const alternativesCR: Record<string, number> = {};

    if (survey.hasAlternatives && alternatives.length > 0) {
      for (const crit of criteria) {
        const altMatrix = buildMatrix(altIds, answers.alternatives?.[crit.id] || {});
        const altAHP = calculateAHP(altMatrix);
        alternativesCR[crit.id] = altAHP.cr;
        if (!altAHP.isConsistent) {
          isAllConsistent = false;
        }
      }
    }

    const crResults = {
      criteriaCR: criteriaAHP.cr,
      criteriaCI: criteriaAHP.ci,
      alternativesCR,
      isConsistent: isAllConsistent,
    };

    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        respondentName: respondentName?.trim() || null,
        respondentEmail: respondentEmail?.trim() || null,
        demographics: JSON.stringify(demographics || {}),
        answers: JSON.stringify(answers),
        crResults: JSON.stringify(crResults),
        isValid: isAllConsistent,
      },
    });


    return NextResponse.json({
      success: true,
      responseId: response.id,
      crResults,
    });
  } catch (err: any) {
    console.error('Submit response error:', err);
    return NextResponse.json({ error: '응답 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
