import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
      _count: {
        select: { responses: true },
      },
    },
  });

  if (!survey || survey.userId !== user.id) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    survey: {
      ...survey,
      criteria: JSON.parse(survey.criteria || '[]'),
      alternatives: JSON.parse(survey.alternatives || '[]'),
      demographics: JSON.parse(survey.demographics || '[]'),
      responseCount: survey._count.responses,
    },
  });
}


export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.id } });
  if (!survey || survey.userId !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status, title, description, criteria, alternatives, hasAlternatives, demographics } = body;

    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: '설문 제목을 입력해주세요.' }, { status: 400 });
    }

    if (criteria !== undefined && (!Array.isArray(criteria) || criteria.length < 2)) {
      return NextResponse.json(
        { error: 'AHP 분석을 위해 최소 2개 이상의 평가 기준(대분류)이 필요합니다.' },
        { status: 400 }
      );
    }

    if (hasAlternatives && alternatives !== undefined && (!Array.isArray(alternatives) || alternatives.length < 2)) {
      return NextResponse.json(
        { error: '대안 평가를 포함할 경우 최소 2개 이상의 대안이 필요합니다.' },
        { status: 400 }
      );
    }

    const updated = await prisma.survey.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(hasAlternatives !== undefined && { hasAlternatives: Boolean(hasAlternatives) }),
        ...(criteria !== undefined && { criteria: JSON.stringify(criteria) }),
        ...(alternatives !== undefined && { alternatives: JSON.stringify(alternatives) }),
        ...(demographics !== undefined && { demographics: JSON.stringify(demographics) }),
      },
    });

    return NextResponse.json({
      success: true,
      survey: {
        ...updated,
        criteria: JSON.parse(updated.criteria || '[]'),
        alternatives: JSON.parse(updated.alternatives || '[]'),
        demographics: JSON.parse(updated.demographics || '[]'),
      },
    });
  } catch (err: any) {
    console.error('Update survey error:', err);
    return NextResponse.json({ error: '수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.id } });
  if (!survey || survey.userId !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  await prisma.survey.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
