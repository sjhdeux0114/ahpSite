import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const targetId = params.id;
  if (targetId === admin.id) {
    return NextResponse.json(
      { error: '관리자 본인 계정은 삭제할 수 없습니다.' },
      { status: 400 }
    );
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        _count: {
          select: { surveys: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: '존재하지 않는 회원입니다.' },
        { status: 404 }
      );
    }

    // Cascade deletion of user, which cascades to surveys and responses
    await prisma.user.delete({
      where: { id: targetId },
    });

    return NextResponse.json({
      success: true,
      message: `'${targetUser.name}(${targetUser.email})' 회원이 성공적으로 삭제되었습니다.`,
    });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json(
      { error: '회원 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const targetId = params.id;
  try {
    const { role } = await request.json();
    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: '유효한 권한(ADMIN 또는 USER)을 지정해주세요.' }, { status: 400 });
    }

    if (targetId === admin.id && role !== 'ADMIN') {
      return NextResponse.json(
        { error: '본인의 관리자 권한을 해제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `'${updatedUser.name}' 님의 권한이 ${role === 'ADMIN' ? '관리자' : '일반회원'}(으)로 변경되었습니다.`,
    });
  } catch (err: any) {
    console.error('Update user role error:', err);
    return NextResponse.json({ error: '회원 권한 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
