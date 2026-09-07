'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alreadyInitialized, setAlreadyInitialized] = useState(false);

  // Form states
  const [name, setName] = useState('최고관리자');
  const [email, setEmail] = useState('admin@ahp.local');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then(res => res.json())
      .then(data => {
        if (!data.needsSetup) {
          setAlreadyInitialized(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('관리자 이름을 입력해주세요.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '관리자 계정 생성에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/admin/users');
        router.refresh();
      }, 1500);
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">시스템 초기화 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (alreadyInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">초기 설정 완료됨</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            이미 최고 관리자 계정이 등록되어 있습니다.<br />
            로그인 화면으로 이동하여 설정하신 관리자 계정으로 로그인해주세요.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-900/40 transition"
          >
            로그인 화면으로 이동
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          First-Time Setup Wizard
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">AHP Decision Hub</span>
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          최고 관리자(Admin) 비밀번호 설정
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          시스템을 가동하기 위해 최고 관리자 계정의 비밀번호를 지정해주세요.
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">관리자 계정 생성 완료!</h3>
              <p className="text-sm text-slate-400 mb-4">
                설정하신 비밀번호로 관리자 세션이 생성되었습니다.<br />
                잠시 후 관리자 센터로 이동합니다...
              </p>
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Admin Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  관리자 성명 / 닉네임
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="최고관리자"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  관리자 로그인 이메일
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="admin@ahp.local"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  비밀번호 설정 <span className="text-purple-400 font-normal">(최소 6자 이상)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="새 비밀번호 입력"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="비밀번호 다시 입력"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-500'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-500'
                        : 'border-slate-700/80'
                    }`}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-400 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 비밀번호가 일치합니다.
                  </p>
                )}
              </div>

              {/* Security Hint */}
              <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-3 text-xs text-purple-300 leading-relaxed">
                💡 <strong>보안 안내:</strong> 본 계정은 플랫폼 내 회원 탈퇴(삭제), 설문 배포 및 데이터 일괄 관리가 가능한 최고 마스터 계정입니다.
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/50 transition transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    관리자 계정 생성 중...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    관리자 계정 생성 및 시스템 시작
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

