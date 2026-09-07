import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            surveys: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'ADMIN').length;
    const totalSurveys = await prisma.survey.count();
    const totalResponses = await prisma.response.count();

    return NextResponse.json({
      users,
      stats: {
        totalUsers,
        adminCount,
        totalSurveys,
        totalResponses,
      },
    });
  } catch (err: any) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ error: '회원 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
