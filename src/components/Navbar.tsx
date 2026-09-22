'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, LogOut, PlusCircle, LayoutDashboard, ShieldCheck, User as UserIcon } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : { user: null }))
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-indigo-700 hover:text-indigo-800 transition shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="hidden min-[440px]:inline">AHP Decision Hub</span>
          <span className="min-[440px]:hidden">AHP</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {loading ? (
            <div className="h-8 w-16 sm:w-20 bg-slate-100 rounded animate-pulse" />
          ) : user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link
                  href="/dashboard/admin/users"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition px-2 sm:px-3 py-1.5 rounded-lg shadow-xs shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                  <span className="hidden min-[480px]:inline">회원 관리</span>
                  <span className="min-[480px]:hidden">회원</span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 transition px-2 sm:px-3 py-1.5 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" />
                <span>대시보드</span>
              </Link>
              <Link
                href="/dashboard/surveys/new"
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden min-[360px]:inline">설문 만들기</span>
                <span className="min-[360px]:hidden">만들기</span>
              </Link>
              <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1 hidden md:block" />
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-700 font-medium pl-0.5 sm:pl-1 shrink-0">
                <span className="hidden md:inline-flex items-center gap-1.5 text-slate-500">
                  <span className="text-slate-800 font-semibold">{user.name}</span>님
                  {user.role === 'ADMIN' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                      ADMIN
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  title="로그아웃"
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 px-2.5 sm:px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="text-xs sm:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
