import { NextResponse } from 'next/server';
import { prisma, ensureDbSchema } from '@/lib/prisma';
import { hashPassword, signToken, AUTH_COOKIE } from '@/lib/auth';

export async function GET() {
  try {
    await ensureDbSchema();
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    return NextResponse.json({
      needsSetup: adminCount === 0,
      adminCount,
      initialized: adminCount > 0,
    });
  } catch (err: any) {
    console.error('Check setup error:', err);
    return NextResponse.json({ error: '설정 상태 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbSchema();
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: '이미 시스템 관리자 계정이 설정되어 있습니다. 일반 로그인을 이용해주세요.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '관리자 이름을 입력해주세요.' }, { status: 400 });
    }
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일 주소를 입력해주세요.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // If a user with this email already exists, promote to ADMIN and update password
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    let adminUser;
    if (existing) {
      adminUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
    } else {
      adminUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
    }

    const token = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: 'ADMIN',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'ADMIN',
      },
      message: '최고 관리자 계정이 성공적으로 생성되었습니다.',
    });

    response.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
    return response;
  } catch (err: any) {
    console.error('Setup admin error:', err);
    return NextResponse.json({ error: '관리자 계정 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

