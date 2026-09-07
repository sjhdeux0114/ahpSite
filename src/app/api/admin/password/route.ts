import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, hashPassword, comparePassword } from '@/lib/auth';

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: admin.id },
    });

    if (!adminUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Optional check: if currentPassword is provided, verify it
    if (currentPassword) {
      const isValid = await comparePassword(currentPassword, adminUser.password);
      if (!isValid) {
        return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
      }
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: '관리자 비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (err: any) {
    console.error('Change admin password error:', err);
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

