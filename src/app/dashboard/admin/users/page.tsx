'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  Layers,
  MessageSquareText,
  Search,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Clock,
  UserX,
  CheckCircle2,
  X,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  _count: {
    surveys: number;
  };
}

interface StatsData {
  totalUsers: number;
  adminCount: number;
  totalSurveys: number;
  totalResponses: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    adminCount: 0,
    totalSurveys: 0,
    totalResponses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/users');
      if (res.status === 401 || res.status === 403) {
        setError('관리자 권한이 없거나 로그인이 필요합니다.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      } else {
        setError(data.error || '회원 목록을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          if (data.user.role !== 'ADMIN') {
            setError('접근 권한이 없습니다. 시스템 관리자 계정으로 로그인해주세요.');
            setLoading(false);
            return;
          }
          fetchUsers();
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchQuery =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole =
        roleFilter === 'ALL' ? true : u.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Handle Delete Confirmation
  const confirmDelete = (u: UserData) => {
    if (u.id === currentUser?.id) {
      showToast('본인 관리자 계정은 삭제할 수 없습니다.', 'error');
      return;
    }
    setUserToDelete(u);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || '회원이 삭제되었습니다.');
        setDeleteModalOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        showToast(data.error || '회원 삭제에 실패했습니다.', 'error');
      }
    } catch (err) {
      showToast('서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Role Toggle
  const handleToggleRole = async (u: UserData) => {
    const nextRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (u.id === currentUser?.id && nextRole !== 'ADMIN') {
      showToast('본인의 관리자 권한을 직접 해제할 수 없습니다.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || '권한이 변경되었습니다.');
        setUsers(prev =>
          prev.map(item => (item.id === u.id ? { ...item, role: nextRole } : item))
        );
      } else {
        showToast(data.error || '권한 변경에 실패했습니다.', 'error');
      }
    } catch {
      showToast('통신 오류가 발생했습니다.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">관리자 데이터를 조회하는 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">관리자 전용 페이지</h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-rose-600 text-white shadow-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            내 설문 대시보드로 이동
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              관리자 모드 활성화됨
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-purple-300">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  회원 관리 및 관리자 센터
                </h1>
                <p className="text-purple-200 text-sm mt-1">
                  전체 등록된 사용자를 조회하고, 회원 권한 설정 및 탈퇴(삭제)를 관리합니다.
                </p>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-medium transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              목록 새로고침
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 가입 회원</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalUsers}명</div>
            <p className="text-xs text-slate-400 mt-1">플랫폼 누적 회원</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">시스템 관리자</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.adminCount}명</div>
            <p className="text-xs text-slate-400 mt-1">관리 권한 부여 계정</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 생성 설문</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalSurveys}건</div>
            <p className="text-xs text-slate-400 mt-1">회원들이 발행한 설문</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 수집 응답</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalResponses}건</div>
            <p className="text-xs text-slate-400 mt-1">AHP 쌍대비교 수집 데이터</p>
          </div>
        </div>

        {/* Member Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Controls bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="회원 이름 또는 이메일 검색..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  roleFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  roleFilter === 'ADMIN'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                관리자 ({users.filter(u => u.role === 'ADMIN').length})
              </button>
              <button
                onClick={() => setRoleFilter('USER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  roleFilter === 'USER'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                일반회원 ({users.filter(u => u.role === 'USER').length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">No</th>
                  <th className="py-3.5 px-5">회원 정보</th>
                  <th className="py-3.5 px-4 text-center">권한</th>
                  <th className="py-3.5 px-4 text-center">보유 설문</th>
                  <th className="py-3.5 px-4">가입일시</th>
                  <th className="py-3.5 px-5 text-right">회원 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <UserX className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      검색 조건과 일치하는 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/75 transition ${
                          isSelf ? 'bg-purple-50/30' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-4 px-4 text-center text-xs text-slate-400">
                          {idx + 1}
                        </td>

                        {/* User Info */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              {u.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{u.name}</span>
                                {isSelf && (
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                    나(본인)
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-4 text-center">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              관리자
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              일반회원
                            </span>
                          )}
                        </td>

                        {/* Surveys Count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {u._count.surveys}개
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="py-4 px-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(u.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role Toggle Button */}
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? '본인 계정 권한은 해제할 수 없습니다'
                                  : u.role === 'ADMIN'
                                  ? '일반회원으로 강등'
                                  : '관리자로 승격'
                              }
                              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                                isSelf
                                  ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                                  : u.role === 'ADMIN'
                                  ? 'border-purple-200 text-purple-700 hover:bg-purple-50'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {u.role === 'ADMIN' ? '일반 전환' : '관리자 지정'}
                            </button>

                            {/* Delete Button */}
                            {isSelf ? (
                              <span
                                title="본인 계정은 삭제할 수 없습니다"
                                className="text-xs text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed"
                              >
                                본인 보호
                              </span>
                            ) : (
                              <button
                                onClick={() => confirmDelete(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                회원 삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">회원 영구 삭제 확인</h3>
                <p className="text-xs text-rose-600 font-semibold">이 작업은 취소할 수 없습니다</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-4 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">삭제 대상 회원:</span>
                <span className="font-bold text-slate-900">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">이메일 주소:</span>
                <span className="font-mono text-xs text-slate-800">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">보유 설문 수:</span>
                <span className="font-bold text-rose-600">{userToDelete._count.surveys}개 설문 포함</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              회원을 삭제하면 해당 사용자의 계정뿐만 아니라, **해당 회원이 생성한 모든 AHP 설문 및 참여자들이 제출한 응답 데이터 전체가 함께 영구 삭제**됩니다. 정말 삭제하시겠습니까?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    삭제 처리 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    회원 영구 삭제
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

