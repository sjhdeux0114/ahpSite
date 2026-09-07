import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  BarChart3,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  FileText,
  Server,
  Sparkles,
  ArrowRight,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 pt-20 pb-24 lg:pt-28 lg:pb-32 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              실시간 일관성(CR) 검증 엔진 탑재 • NAS Docker 완벽 지원
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              가장 똑똑하고 신뢰할 수 있는 <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                AHP 계층분석 의사결정 플랫폼
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
              설문지 생성부터 배포, <strong>문항별 실시간 일관성 검사(CR)</strong>,
              집단 기하평균 종합 분석, 그리고 <strong>Excel 및 Word 보고서 다운로드</strong>까지 원스톱으로 해결하세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition"
              >
                10초 회원가입 후 무료 시작
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                기존 계정으로 로그인
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                연구와 실무를 위한 완벽한 AHP 설문 솔루션
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                복잡한 수식과 일관성 검증 문제로 고민하지 마세요. 모든 계산을 자동으로 정확하게 수행합니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  문항별 실시간 일관성(CR) 체크
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  응답자가 문항을 체크할 때마다 삼각 순환 모순(A&gt;B, B&gt;C 인데 C&gt;A)과 일관성 비율을 실시간 계산하여, 신뢰도가 떨어지면 즉각 경고 창을 띄워 올바른 응답을 유도합니다.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  원클릭 URL 배포 &amp; 배포 중지
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  생성된 고유 링크를 복사하여 응답자에게 즉시 공유할 수 있습니다. 응답이 충분히 모이면 설문 관리자 대시보드에서 클릭 한 번으로 배포를 중지할 수 있습니다.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  집단 기하평균 종합 분석 &amp; 시각화
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  수집된 응답 데이터를 기하평균(AIJ)으로 자동 통합하여 종합 우선순위, 평가 기준별 가중치, 일관성 지표를 직관적인 차트와 표로 한눈에 제공합니다.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  Excel (.xlsx) 원클릭 내보내기
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  종합 요약, 기준별 가중치 순위, 집단 쌍대비교 행렬, 응답자별 원본 데이터 및 개별 CR 적합성 여부를 깔끔한 서식의 다중 시트 엑셀 파일로 다운로드합니다.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  Word (.docx) 학술/실무 보고서
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  조사 개요, 계층구조, 평가 기준 분석표, 대안 우선순위, 일관성 검증 결과 및 종합 제언이 포함된 정식 워드 보고서 문서를 즉시 생성하여 다운로드합니다.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-7 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-5">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                  NAS Docker 원클릭 자체 구축
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Synology, QNAP 등의 NAS 서버에 별도의 무거운 외부 DB 없이 SQLite 임베디드로 경량 구동되며, Docker Compose 파일 하나로 영구 데이터 보존과 함께 1분 만에 배포할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
          <p>© 2026 AHP Decision Hub. Built with Next.js &amp; Docker.</p>
        </footer>
      </main>
    </>
  );
}
