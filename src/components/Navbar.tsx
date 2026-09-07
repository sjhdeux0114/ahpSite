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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-700 hover:text-indigo-800 transition">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span>AHP Decision Hub</span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
          ) : user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link
                  href="/dashboard/admin/users"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition px-3 py-1.5 rounded-lg shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  회원 관리
                </Link>
              )}
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <LayoutDashboard className="w-4 h-4" />
                대시보드
              </Link>
              <Link
                href="/dashboard/surveys/new"
                className="inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition px-3.5 py-1.5 rounded-lg shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                설문 만들기
              </Link>
              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />
              <div className="flex items-center gap-2 text-sm text-slate-700 font-medium pl-1">
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
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm transition"
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
