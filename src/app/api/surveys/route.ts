import { NextResponse } from 'next/server';
import { prisma, ensureDbSchema } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  await ensureDbSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const surveys = await prisma.survey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { responses: true },
      },
    },
  });

  const formatted = surveys.map(s => ({
    ...s,
    criteria: JSON.parse(s.criteria || '[]'),
    alternatives: JSON.parse(s.alternatives || '[]'),
    demographics: JSON.parse(s.demographics || '[]'),
    responseCount: s._count.responses,
  }));

  return NextResponse.json({ surveys: formatted });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, criteria, alternatives, hasAlternatives, demographics } = body;

    if (!title || !criteria || criteria.length < 2) {
      return NextResponse.json(
        { error: '설문 제목과 최소 2개 이상의 평가 기준을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (hasAlternatives && (!alternatives || alternatives.length < 2)) {
      return NextResponse.json(
        { error: '대안 평가를 포함할 경우 최소 2개 이상의 대안을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = generateSlug();
    let slugExists = await prisma.survey.findUnique({ where: { slug } });
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.survey.findUnique({ where: { slug } });
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || '',
        slug,
        status: 'ACTIVE',
        userId: user.id,
        hasAlternatives: Boolean(hasAlternatives),
        criteria: JSON.stringify(criteria),
        alternatives: JSON.stringify(alternatives || []),
        demographics: JSON.stringify(demographics || []),
      },
    });


    return NextResponse.json({ success: true, survey });
  } catch (err: any) {
    console.error('Create survey error:', err);
    return NextResponse.json({ error: '설문 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
