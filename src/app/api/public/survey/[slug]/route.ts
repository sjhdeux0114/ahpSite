import { NextResponse } from 'next/server';
import { prisma, ensureDbSchema } from '@/lib/prisma';
import { buildMatrix, calculateAHP, getLeafCriteria } from '@/lib/ahp/calculator';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  await ensureDbSchema();
  const survey = await prisma.survey.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      description: true,
      surveyType: true,
      status: true,
      slug: true,
      criteria: true,
      alternatives: true,
      hasAlternatives: true,
      demographics: true,
      formConfig: true,
      consistencyThreshold: true,
      createdAt: true,
    },
  });

  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
  }

  const parsedFormConfig = JSON.parse((survey as any).formConfig || '{}');
  const settings = parsedFormConfig?.settings || {};
  const responseCount = await prisma.response.count({ where: { surveyId: survey.id } });

  const now = new Date();
  const isBeforeStart = settings.startAt ? now < new Date(settings.startAt) : false;
  const isExpired = settings.endAt ? now > new Date(settings.endAt) : false;
  const isFull =
    typeof settings.maxResponses === 'number' && settings.maxResponses > 0
      ? responseCount >= settings.maxResponses
      : false;
  const requiresAccessCode = Boolean(settings.accessCode && String(settings.accessCode).trim());

  // Never expose accessCode in public GET response
  const safeFormConfig = {
    ...parsedFormConfig,
    settings: {
      ...settings,
      accessCode: undefined,
    },
  };

  return NextResponse.json({
    survey: {
      ...survey,
      surveyType: (survey as any).surveyType || 'AHP',
      criteria: JSON.parse(survey.criteria || '[]'),
      alternatives: JSON.parse(survey.alternatives || '[]'),
      demographics: JSON.parse(survey.demographics || '[]'),
      formConfig: safeFormConfig,
      consistencyThreshold: survey.consistencyThreshold ?? 0.1,
      availability: {
        isBeforeStart,
        isExpired,
        isFull,
        requiresAccessCode,
        responseCount,
        startAt: settings.startAt || null,
        endAt: settings.endAt || null,
        maxResponses: settings.maxResponses || null,
      },
    },
  });
}


export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  await ensureDbSchema();
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
    const { respondentName, respondentEmail, demographics } = body;
    const isForm = ((survey as any).surveyType || 'AHP') === 'FORM';

    if (isForm) {
      const parsedFormConfig = JSON.parse((survey as any).formConfig || '{}');
      const settings = parsedFormConfig?.settings || {};
      const expectedCode = settings.accessCode ? String(settings.accessCode).trim() : '';

      // Access code verification action
      if (body.action === 'verify_code') {
        const provided = String(body.accessCode || '').trim();
        if (!expectedCode || provided === expectedCode) {
          return NextResponse.json({ valid: true });
        }
        return NextResponse.json({ valid: false, error: '참여 코드가 올바르지 않습니다.' }, { status: 403 });
      }

      // Check schedule & maxResponses
      const now = new Date();
      if (settings.startAt && now < new Date(settings.startAt)) {
        return NextResponse.json({ error: '아직 설문 참여 기간이 시작되지 않았습니다.' }, { status: 400 });
      }
      if (settings.endAt && now > new Date(settings.endAt)) {
        return NextResponse.json({ error: '설문 참여 기간이 종료되었습니다.' }, { status: 400 });
      }
      if (typeof settings.maxResponses === 'number' && settings.maxResponses > 0) {
        const count = await prisma.response.count({ where: { surveyId: survey.id } });
        if (count >= settings.maxResponses) {
          return NextResponse.json({ error: '최대 응답 인원에 도달하여 설문이 마감되었습니다.' }, { status: 400 });
        }
      }
      if (expectedCode && String(body.accessCode || '').trim() !== expectedCode) {
        return NextResponse.json({ error: '올바른 참여 코드가 필요합니다.' }, { status: 403 });
      }

      const formAnswers = body.answers || {};
      const response = await prisma.response.create({
        data: {
          surveyId: survey.id,
          respondentName: respondentName?.trim() || null,
          respondentEmail: respondentEmail?.trim() || null,
          demographics: JSON.stringify(demographics || {}),
          answers: JSON.stringify(formAnswers),
          crResults: JSON.stringify({}),
          isValid: true,
        },
      });
      return NextResponse.json({
        success: true,
        responseId: response.id,
        surveyType: 'FORM',
      });
    }

    const answers = body.answers || {
      criteria: body.criteriaAnswers || {},
      subcriteria: body.subcriteriaAnswers || {},
      alternatives: body.alternativesAnswers || {},
    };

    const threshold = survey.consistencyThreshold ?? 0.1;
    const criteria: Array<{ id: string; name: string; description?: string; subcriteria?: Array<{ id: string; name: string; description?: string }> }> = JSON.parse(survey.criteria || '[]');
    const alternatives: Array<{ id: string; name: string }> = JSON.parse(survey.alternatives || '[]');
    const criteriaIds = criteria.map(c => c.id);
    const altIds = alternatives.map(a => a.id);

    // Calculate Criteria CR with threshold
    const criteriaMatrix = buildMatrix(criteriaIds, answers.criteria || {});
    const criteriaAHP = calculateAHP(criteriaMatrix, threshold);

    let isAllConsistent = criteriaAHP.isConsistent;
    const subcriteriaCR: Record<string, number> = {};

    // Calculate Subcriteria CR with threshold
    for (const crit of criteria) {
      const subs = crit.subcriteria || [];
      if (subs.length >= 2) {
        const subIds = subs.map(s => s.id);
        const subMatrix = buildMatrix(subIds, answers.subcriteria?.[crit.id] || {});
        const subAHP = calculateAHP(subMatrix, threshold);
        subcriteriaCR[crit.id] = subAHP.cr;
        if (!subAHP.isConsistent) {
          isAllConsistent = false;
        }
      }
    }

    const alternativesCR: Record<string, number> = {};

    if (survey.hasAlternatives && alternatives.length > 0) {
      const leafCriteria = getLeafCriteria(criteria);
      for (const leaf of leafCriteria) {
        const altMatrix = buildMatrix(altIds, answers.alternatives?.[leaf.id] || {});
        const altAHP = calculateAHP(altMatrix, threshold);
        alternativesCR[leaf.id] = altAHP.cr;
        if (!altAHP.isConsistent) {
          isAllConsistent = false;
        }
      }
    }

    const crResults = {
      criteriaCR: criteriaAHP.cr,
      criteriaCI: criteriaAHP.ci,
      subcriteriaCR,
      alternativesCR,
      isConsistent: isAllConsistent,
      consistencyThreshold: threshold,
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
