'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ItemEntry {
  id: string;
  name: string;
  description: string;
}

export interface SubCriterionEntry {
  id: string;
  name: string;
  description: string;
}

export interface CriterionEntry {
  id: string;
  name: string;
  description: string;
  subcriteria: SubCriterionEntry[];
}

export interface DemographicQuestion {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
  required: boolean;
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('스마트 업무 솔루션 도입 선정 AHP 분석');
  const [description, setDescription] = useState('기업 경쟁력 강화를 위한 업무 솔루션 도입 시 대분류 및 세부영역별 중요도를 도출하기 위한 전문가 설문입니다.');
  const [hasSubcriteria, setHasSubcriteria] = useState(true);
  const [hasAlternatives, setHasAlternatives] = useState(true);

  // Criteria with subcriteria
  const [criteria, setCriteria] = useState<CriterionEntry[]>([
    {
      id: 'crit_1',
      name: '기술성 (Technology)',
      description: '시스템 기능 품질과 기술 완성도',
      subcriteria: [
        { id: 'sub_1_1', name: '기능 완성도', description: '요구 기능의 충실한 구현 여부' },
        { id: 'sub_1_2', name: '시스템 안정성 및 보안', description: '무장애 운영 및 데이터 보안 표준 충족' },
        { id: 'sub_1_3', name: '확장 및 호환성', description: '타 시스템 연동 및 모듈 확장성' },
      ],
    },
    {
      id: 'crit_2',
      name: '경제성 (Cost & ROI)',
      description: '도입 및 총소유비용(TCO) 효율성',
      subcriteria: [
        { id: 'sub_2_1', name: '초기 도입비용', description: '초기 라이선스 및 컨설팅/구축비' },
        { id: 'sub_2_2', name: '연간 유지보수비', description: '정기 유지관리 및 업그레이드 비용' },
        { id: 'sub_2_3', name: '투자회수율 (ROI)', description: '비용 대비 업무효율 및 생산성 향상' },
      ],
    },
    {
      id: 'crit_3',
      name: '운영성 (Operations & UX)',
      description: '사용 편의성과 지속적 유지관리',
      subcriteria: [
        { id: 'sub_3_1', name: '사용자 편의성 (UI/UX)', description: '직관적 인터페이스 및 학습 용이성' },
        { id: 'sub_3_2', name: '기술지원 및 AS 체계', description: '공급사의 신속한 장애 대응과 교육 지원' },
      ],
    },
    {
      id: 'crit_4',
      name: '전략성 (Strategy & Policy)',
      description: '조직 비전과 정부/산업 정책 부합',
      subcriteria: [
        { id: 'sub_4_1', name: '조직 비전 적합도', description: '중장기 디지털 혁신 전략과의 연계' },
        { id: 'sub_4_2', name: '표준 및 법규 준수', description: '산업 규제 및 법적 요건 충족' },
      ],
    },
  ]);

  // Alternatives
  const [alternatives, setAlternatives] = useState<ItemEntry[]>([
    { id: 'alt_1', name: '대안 A', description: '기본형 솔루션' },
    { id: 'alt_2', name: '대안 B', description: '고급형 프리미엄 솔루션' },
    { id: 'alt_3', name: '대안 C', description: '오픈소스 기반 맞춤형 솔루션' },
  ]);

  // Demographics
  const [demographics, setDemographics] = useState<DemographicQuestion[]>([
    {
      id: 'demo_gender',
      title: '성별',
      type: 'select',
      options: ['남성', '여성', '기타'],
      required: true,
    },
    {
      id: 'demo_age',
      title: '연령대',
      type: 'select',
      options: ['20대 이하', '30대', '40대', '50대', '60대 이상'],
      required: true,
    },
    {
      id: 'demo_exp',
      title: '관련 분야 경력',
      type: 'select',
      options: ['1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'],
      required: true,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // Helpers for Criteria
  const addCriterion = () => {
    const nextId = `crit_${Date.now()}`;
    setCriteria([
      ...criteria,
      {
        id: nextId,
        name: '',
        description: '',
        subcriteria: [
          { id: `sub_${Date.now()}_1`, name: '', description: '' },
          { id: `sub_${Date.now()}_2`, name: '', description: '' },
        ],
      },
    ]);
  };

  const updateCriterion = (index: number, field: 'name' | 'description', val: string) => {
    const updated = [...criteria];
    updated[index][field] = val;
    setCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 2) {
      alert('AHP 분석을 위해 최소 2개 이상의 평가 기준이 필요합니다.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  // Helpers for Subcriteria
  const addSubcriterion = (critIndex: number) => {
    const nextSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const updated = [...criteria];
    if (!updated[critIndex].subcriteria) {
      updated[critIndex].subcriteria = [];
    }
    updated[critIndex].subcriteria.push({ id: nextSubId, name: '', description: '' });
    setCriteria(updated);
  };

  const updateSubcriterion = (
    critIndex: number,
    subIndex: number,
    field: 'name' | 'description',
    val: string
  ) => {
    const updated = [...criteria];
    updated[critIndex].subcriteria[subIndex][field] = val;
    setCriteria(updated);
  };

  const removeSubcriterion = (critIndex: number, subIndex: number) => {
    const updated = [...criteria];
    if (updated[critIndex].subcriteria.length <= 2) {
      alert('세부영역 평가를 위해 해당 대분류 내 최소 2개 이상의 세부영역이 필요합니다.');
      return;
    }
    updated[critIndex].subcriteria = updated[critIndex].subcriteria.filter((_, i) => i !== subIndex);
    setCriteria(updated);
  };

  // Hierarchy Presets
  const applyHierarchyPreset = (type: 'it' | 'vendor' | 'project') => {
    if (type === 'it') {
      setTitle('차세대 스마트 업무 솔루션 도입 선정 AHP 분석');
      setDescription('기업 경쟁력 강화를 위한 업무 솔루션 도입 시 대분류 및 세부영역별 중요도를 도출하기 위한 전문가 설문입니다.');
      setHasSubcriteria(true);
      setCriteria([
        {
          id: 'c_tech',
          name: '기술성 (Technology)',
          description: '기능 완성도와 시스템 신뢰도',
          subcriteria: [
            { id: 's_tech_1', name: '기능 완성도', description: '핵심 업무 프로세스 지원율' },
            { id: 's_tech_2', name: '보안 및 안정성', description: '데이터 암호화 및 무장애 운영' },
            { id: 's_tech_3', name: '연계 확장성', description: '오픈 API 및 외부 시스템 연동' },
          ],
        },
        {
          id: 'c_econ',
          name: '경제성 (Cost & ROI)',
          description: '도입 및 총 유지관리 비용',
          subcriteria: [
            { id: 's_econ_1', name: '초기 도입비용', description: '초기 라이선스 및 구축 컨설팅비' },
            { id: 's_econ_2', name: '유지보수 비용', description: '연간 유지관리 및 업그레이드비' },
            { id: 's_econ_3', name: '투자 대비 효과', description: '인건비 절감 및 생산성 증대' },
          ],
        },
        {
          id: 'c_oper',
          name: '운영성 (Operations & UX)',
          description: '현업 사용 및 관리 편의성',
          subcriteria: [
            { id: 's_oper_1', name: '사용자 편의성', description: '직관적 UI/UX 및 쉬운 학습' },
            { id: 's_oper_2', name: '벤더 기술지원', description: '국내 전담 지원팀 및 교육 체계' },
          ],
        },
        {
          id: 'c_pol',
          name: '전략성 (Strategy & Policy)',
          description: '전사 거버넌스 및 정책 부합',
          subcriteria: [
            { id: 's_pol_1', name: '조직 전략 부합도', description: '전사 디지털 전환(DX) 비전 연계' },
            { id: 's_pol_2', name: '컴플라이언스 준수', description: '개인정보 및 공공 보안 규제' },
          ],
        },
      ]);
      setAlternatives([
        { id: 'alt_1', name: '솔루션 A (글로벌 클라우드 SaaS)', description: '글로벌 표준 SaaS형 서비스' },
        { id: 'alt_2', name: '솔루션 B (국내 맞춤형 패키지)', description: '국내 업무환경 최적화 솔루션' },
        { id: 'alt_3', name: '솔루션 C (자체 온프레미스 구축)', description: '사내 서버 전용 독립 구축형' },
      ]);
    } else if (type === 'vendor') {
      setTitle('우수 협력업체(공급사) 종합 선정 평가');
      setDescription('공정하고 객관적인 부품/서비스 협력업체 선정을 위한 전문가 AHP 설문입니다.');
      setHasSubcriteria(true);
      setCriteria([
        {
          id: 'c_qual',
          name: '품질 수준 (Quality)',
          description: '부품 정밀도 및 불량률 관리',
          subcriteria: [
            { id: 's_qual_1', name: '품질 신뢰도', description: '공정 불량률 및 내구성 검증' },
            { id: 's_qual_2', name: '국제 표준 인증', description: 'ISO 등 공인 품질 규격 보유' },
          ],
        },
        {
          id: 'c_price',
          name: '가격 경쟁력 (Price)',
          description: '납품 단가 및 결제 조건',
          subcriteria: [
            { id: 's_price_1', name: '공급 단가', description: '동종 업계 대비 가격 우수성' },
            { id: 's_price_2', name: '원가 절감 협조', description: '지속적 원가 절감 노력' },
          ],
        },
        {
          id: 'c_deliv',
          name: '납기 및 공급 (Delivery)',
          description: '생산 용량과 납기 준수율',
          subcriteria: [
            { id: 's_deliv_1', name: '납기 준수율', description: '약정 기일 내 정시 납품' },
            { id: 's_deliv_2', name: '긴급 대응 능력', description: '돌발 발주 시 비상 생산력' },
          ],
        },
        {
          id: 'c_tech',
          name: '기술 및 재무 (Tech & Finance)',
          description: 'R&D 역량과 지속가능성',
          subcriteria: [
            { id: 's_tech_1', name: '기술 개발력', description: '신기술 공동 개발 역량' },
            { id: 's_tech_2', name: '재무 안정성', description: '부채비율 및 신용등급' },
          ],
        },
      ]);
      setAlternatives([
        { id: 'alt_1', name: '협력사 Alpha', description: '대규모 양산 라인 보유' },
        { id: 'alt_2', name: '협력사 Beta', description: '고정밀 특화 전문업체' },
        { id: 'alt_3', name: '협력사 Gamma', description: '원가 경쟁력 최우수 업체' },
      ]);
    } else if (type === 'project') {
      setTitle('신규 전략 프로젝트 투자 타당성 분석');
      setDescription('신규 사업 투자의 우선순위를 결정하기 위한 AHP 평가입니다.');
      setHasSubcriteria(true);
      setCriteria([
        {
          id: 'c_mkt',
          name: '시장성 (Market)',
          description: '시장 규모 및 성장 잠재력',
          subcriteria: [
            { id: 's_mkt_1', name: '목표시장 규모', description: '유효 시장의 절대적 크기' },
            { id: 's_mkt_2', name: '연평균 성장률', description: '향후 5개년 예상 성장률' },
          ],
        },
        {
          id: 'c_tech',
          name: '기술 실현성 (Feasibility)',
          description: '핵심 기술 확보 및 난이도',
          subcriteria: [
            { id: 's_tech_1', name: '기술 개발 난이도', description: '사내 기술 인프라 적합도' },
            { id: 's_tech_2', name: '특허 및 지식재산', description: '지식재산권 독점력' },
          ],
        },
        {
          id: 'c_fin',
          name: '수익성 (Financials)',
          description: '예상 ROI 및 손익분기',
          subcriteria: [
            { id: 's_fin_1', name: '순현재가치 (NPV)', description: '할인율 적용 미래 현금흐름' },
            { id: 's_fin_2', name: '투자회수 기간', description: '손익분기점 도달 시기' },
          ],
        },
        {
          id: 'c_risk',
          name: '정책 및 리스크 (Risk & Synergy)',
          description: '규제 리스크와 조직 적합도',
          subcriteria: [
            { id: 's_risk_1', name: '법적/제도적 리스크', description: '인허가 규제 변경 위험' },
            { id: 's_risk_2', name: '기존 사업 시너지', description: '주력 사업과의 연계 효과' },
          ],
        },
      ]);
    }
  };

  // Helpers for Alternatives
  const addAlternative = () => {
    const nextId = `alt_${Date.now()}`;
    setAlternatives([...alternatives, { id: nextId, name: '', description: '' }]);
  };

  const updateAlternative = (index: number, field: 'name' | 'description', val: string) => {
    const updated = [...alternatives];
    updated[index][field] = val;
    setAlternatives(updated);
  };

  const removeAlternative = (index: number) => {
    if (alternatives.length <= 2) {
      alert('대안 평가를 위해 최소 2개 이상의 대안이 필요합니다.');
      return;
    }
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  // Helpers for Demographics
  const addDemographic = (preset?: Partial<DemographicQuestion>) => {
    const nextId = `demo_${Date.now()}`;
    const newDemo: DemographicQuestion = {
      id: nextId,
      title: preset?.title || '새 질문',
      type: preset?.type || 'select',
      options: preset?.options || ['선택지 1', '선택지 2'],
      required: preset?.required ?? true,
    };
    setDemographics([...demographics, newDemo]);
  };

  const updateDemographic = (index: number, field: keyof DemographicQuestion, val: any) => {
    const updated = [...demographics];
    (updated[index] as any)[field] = val;
    setDemographics(updated);
  };

  const removeDemographic = (index: number) => {
    setDemographics(demographics.filter((_, i) => i !== index));
  };

  // Question calculations
  const criteriaPairCount = (criteria.length * (criteria.length - 1)) / 2;
  const subcriteriaPairCount = hasSubcriteria
    ? criteria.reduce((sum, c) => {
        const k = (c.subcriteria || []).length;
        return sum + (k >= 2 ? (k * (k - 1)) / 2 : 0);
      }, 0)
    : 0;
  const altPairPerCrit = hasAlternatives ? (alternatives.length * (alternatives.length - 1)) / 2 : 0;
  const totalPairwiseQuestions = criteriaPairCount + subcriteriaPairCount + (hasAlternatives ? criteria.length * altPairPerCrit : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('설문 제목을 입력해주세요.');
      return;
    }
    const emptyCrit = criteria.some(c => !c.name.trim());
    if (emptyCrit) {
      setError('모든 평가 기준의 이름을 입력해주세요.');
      return;
    }
    if (hasSubcriteria) {
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        if (!c.subcriteria || c.subcriteria.length < 2) {
          setError(`대분류 '${c.name || `C${i + 1}`}'에 최소 2개 이상의 세부영역이 필요합니다.`);
          return;
        }
        const emptySub = c.subcriteria.some(s => !s.name.trim());
        if (emptySub) {
          setError(`대분류 '${c.name}'의 모든 세부영역 이름을 입력해주세요.`);
          return;
        }
      }
    }
    if (hasAlternatives) {
      const emptyAlt = alternatives.some(a => !a.name.trim());
      if (emptyAlt) {
        setError('모든 대안의 이름을 입력해주세요.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          criteria: criteria.map(c => ({
            id: c.id,
            name: c.name.trim(),
            description: c.description.trim(),
            subcriteria: hasSubcriteria
              ? (c.subcriteria || []).map(s => ({
                  id: s.id,
                  name: s.name.trim(),
                  description: s.description.trim(),
                }))
              : [],
          })),
          alternatives: hasAlternatives
            ? alternatives.map(a => ({ id: a.id, name: a.name.trim(), description: a.description.trim() }))
            : [],
          hasAlternatives,
          hasSubcriteria,
          demographics: demographics.map(d => ({
            id: d.id,
            title: d.title.trim(),
            type: d.type,
            options: d.type === 'select' ? d.options.map(o => o.trim()).filter(Boolean) : [],
            required: d.required,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '설문 생성에 실패했습니다.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('서버와 통신할 수 없습니다.');
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">새 AHP 설문지 만들기</h1>
          <p className="text-sm text-slate-600 mt-1">
            평가 기준과 대안을 등록하면 Saaty 표준 9점 척도 쌍대비교 문항이 자동으로 생성됩니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Info */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
              설문 기본 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  설문 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 클라우드 인프라 솔루션 선정을 위한 AHP 평가 조사"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  설문 목적 및 설명 (응답자 안내문)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="응답자에게 설문의 취지와 평가 기준에 대한 배경 설명을 전달합니다."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hierarchical Criteria & Sub-criteria */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
                  계층형 평가 기준 (대분류 및 세부영역) 설정
                  <span className="text-xs font-normal text-slate-500">({criteria.length}개 대분류)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AHP 다계층 모델에 따라 상위 대분류와 각 대분류에 속하는 하위 세부영역을 정의합니다.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={hasSubcriteria}
                    onChange={e => setHasSubcriteria(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>하위 세부영역(중분류) 사용</span>
                </label>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  대분류 추가
                </button>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                표준 AHP 템플릿:
              </span>
              <button
                type="button"
                onClick={() => applyHierarchyPreset('it')}
                className="text-xs bg-white border border-indigo-200 hover:border-indigo-400 text-slate-800 font-medium px-2.5 py-1 rounded-lg transition shadow-2xs hover:text-indigo-600"
              >
                💼 IT 솔루션 도입 모델
              </button>
              <button
                type="button"
                onClick={() => applyHierarchyPreset('vendor')}
                className="text-xs bg-white border border-indigo-200 hover:border-indigo-400 text-slate-800 font-medium px-2.5 py-1 rounded-lg transition shadow-2xs hover:text-indigo-600"
              >
                🏭 우수 협력업체(공급사) 선정 모델
              </button>
              <button
                type="button"
                onClick={() => applyHierarchyPreset('project')}
                className="text-xs bg-white border border-indigo-200 hover:border-indigo-400 text-slate-800 font-medium px-2.5 py-1 rounded-lg transition shadow-2xs hover:text-indigo-600"
              >
                🚀 신규 사업 타당성 분석 모델
              </button>
            </div>

            {/* Criteria List */}
            <div className="space-y-5">
              {criteria.map((crit, cIdx) => (
                <div key={crit.id} className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2 py-1.5 rounded-lg text-center shrink-0">
                      대분류 {cIdx + 1}
                    </span>
                    <div className="flex-1 grid sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={crit.name}
                        onChange={e => updateCriterion(cIdx, 'name', e.target.value)}
                        placeholder="대분류 명칭 (예: 기술성)"
                        className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={crit.description}
                        onChange={e => updateCriterion(cIdx, 'description', e.target.value)}
                        placeholder="대분류 세부 설명 (선택)"
                        className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCriterion(cIdx)}
                      title="대분류 삭제"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sub-criteria Nested Block */}
                  {hasSubcriteria && (
                    <div className="pl-3 sm:pl-6 border-l-2 border-indigo-200 mt-2 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>└ 하위 세부영역</span>
                          <span className="text-indigo-600 text-[11px]">({(crit.subcriteria || []).length}개 항목)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => addSubcriterion(cIdx)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition"
                        >
                          <Plus className="w-3 h-3" />
                          세부영역 추가
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(crit.subcriteria || []).map((sub, sIdx) => (
                          <div key={sub.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[11px] font-semibold text-slate-500 w-9 shrink-0 text-center">
                              S{cIdx + 1}-{sIdx + 1}
                            </span>
                            <input
                              type="text"
                              required
                              value={sub.name}
                              onChange={e => updateSubcriterion(cIdx, sIdx, 'name', e.target.value)}
                              placeholder="세부영역 이름 (예: 기능 완성도)"
                              className="flex-1 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-800"
                            />
                            <input
                              type="text"
                              value={sub.description}
                              onChange={e => updateSubcriterion(cIdx, sIdx, 'description', e.target.value)}
                              placeholder="세부 설명 (선택)"
                              className="hidden sm:block flex-1 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-600"
                            />
                            <button
                              type="button"
                              onClick={() => removeSubcriterion(cIdx, sIdx)}
                              title="세부영역 삭제"
                              className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Alternatives Mode */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
                대안 (Alternatives) 평가 여부
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAlternatives}
                  onChange={e => setHasAlternatives(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {hasAlternatives ? (
              <div>
                <p className="text-xs text-slate-500 mb-4">
                  평가 대상이 되는 최종 후보(제품, 공급업체, 정책 등)를 등록합니다. 각 평가 기준별로 대안 간 쌍대비교가 수행됩니다.
                </p>

                <div className="space-y-3 mb-4">
                  {alternatives.map((alt, idx) => (
                    <div key={alt.id} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-emerald-600 mt-2.5 w-6 text-center shrink-0">
                        A{idx + 1}
                      </span>
                      <div className="flex-1 grid sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={alt.name}
                          onChange={e => updateAlternative(idx, 'name', e.target.value)}
                          placeholder="대안 이름 (예: 대안 A)"
                          className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="text"
                          value={alt.description}
                          onChange={e => updateAlternative(idx, 'description', e.target.value)}
                          placeholder="대안 세부 설명 (선택)"
                          className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAlternative(idx)}
                        title="삭제"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addAlternative}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  대안 추가
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                💡 대안 평가를 비활성화하면, 평가 기준들의 가중치(중요도 순위)만 도출하는 설문으로 생성됩니다.
              </p>
            )}
          </div>

          {/* Section 4: Demographics Questions */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">4</span>
                응답자 인적사항 (프로필) 문항 설정
                <span className="text-xs font-normal text-slate-500">({demographics.length}개 항목)</span>
              </h2>
              <button
                type="button"
                onClick={() => addDemographic({ title: '', type: 'select', options: ['항목 1', '항목 2'], required: true })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                직접 질문 추가
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              AHP 설문 결과 분석 시 응답자 특성별(연령, 성별, 경력, 직급 등) 교차 분석에 활용되는 문항입니다. 아래 프리셋 버튼으로 원클릭 추가하거나 자유롭게 커스텀 질문을 등록하세요.
            </p>

            {/* Presets Button Row */}
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-600 mr-1">빠른 추가 프리셋:</span>
              <button
                type="button"
                onClick={() => addDemographic({ title: '성별', type: 'select', options: ['남성', '여성', '기타'], required: true })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 성별
              </button>
              <button
                type="button"
                onClick={() => addDemographic({ title: '연령대', type: 'select', options: ['20대 이하', '30대', '40대', '50대', '60대 이상'], required: true })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 연령대
              </button>
              <button
                type="button"
                onClick={() => addDemographic({ title: '관련 분야 경력', type: 'select', options: ['1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'], required: true })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 관련 경력
              </button>
              <button
                type="button"
                onClick={() => addDemographic({ title: '직급 / 직책', type: 'select', options: ['실무자/사원', '대리/과장', '차장/부장', '임원/대표'], required: true })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 직급/직책
              </button>
              <button
                type="button"
                onClick={() => addDemographic({ title: '최종 학력', type: 'select', options: ['학사 재학/졸업', '석사 재학/졸업', '박사 재학/졸업', '기타'], required: false })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 최종 학력
              </button>
              <button
                type="button"
                onClick={() => addDemographic({ title: '소속 부서 / 기관', type: 'text', options: [], required: false })}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition hover:text-indigo-600"
              >
                + 소속 부서 (주관식)
              </button>
            </div>

            {/* Demographics List */}
            {demographics.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                등록된 인적사항 질문이 없습니다. 상단 프리셋 버튼이나 질문 추가 버튼을 눌러보세요.
              </p>
            ) : (
              <div className="space-y-3">
                {demographics.map((demo, idx) => (
                  <div key={demo.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-5">D{idx + 1}</span>
                      <input
                        type="text"
                        value={demo.title}
                        onChange={e => updateDemographic(idx, 'title', e.target.value)}
                        placeholder="질문 명칭 (예: 연령대, 관련 분야 경력)"
                        className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800"
                      />
                      <select
                        value={demo.type}
                        onChange={e => updateDemographic(idx, 'type', e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="select">객관식 (선택형)</option>
                        <option value="text">주관식 (단답형)</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer px-2">
                        <input
                          type="checkbox"
                          checked={demo.required}
                          onChange={e => updateDemographic(idx, 'required', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>필수</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDemographic(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {demo.type === 'select' && (
                      <div className="pl-7">
                        <input
                          type="text"
                          value={demo.options.join(', ')}
                          onChange={e =>
                            updateDemographic(
                              idx,
                              'options',
                              e.target.value.split(',').map(s => s.trim())
                            )
                          }
                          placeholder="선택지 항목들을 쉼표(,)로 구분하여 입력하세요 (예: 20대, 30대, 40대, 50대 이상)"
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-600"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          쉼표(,)로 각 선택지를 구분합니다. (현재 {demo.options.filter(Boolean).length}개 옵션)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Summary & Question Count Preview */}
          <div className="bg-indigo-50/70 p-6 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                예상 쌍대비교 문항 수 계산 (AHP 다계층 모형)
              </h3>
              <div className="text-xs text-indigo-700 space-y-0.5">
                <p>• <strong>1단계 (대분류 쌍대비교)</strong>: {criteriaPairCount}문항</p>
                {hasSubcriteria && (
                  <p>• <strong>2단계 (대분류별 세부영역 쌍대비교)</strong>: {subcriteriaPairCount}문항</p>
                )}
                {hasAlternatives && (
                  <p>• <strong>3단계 (대안 평가 쌍대비교)</strong>: {criteria.length}개 기준 × {altPairPerCrit}문항 = {criteria.length * altPairPerCrit}문항</p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">총 설문 문항</span>
              <span className="text-3xl font-extrabold text-indigo-900">{totalPairwiseQuestions}개 문항</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? '설문 생성 중...' : '설문 생성 및 배포 준비 완료'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
