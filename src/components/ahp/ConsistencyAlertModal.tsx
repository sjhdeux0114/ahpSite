'use client';

import React from 'react';
import { RealtimeConsistencyCheck } from '@/lib/ahp/consistency';
import { AlertTriangle, AlertOctagon, RotateCcw, ArrowRight } from 'lucide-react';

interface ConsistencyAlertModalProps {
  isOpen: boolean;
  check: RealtimeConsistencyCheck | null;
  onClose: () => void;
  onScrollToOffender?: (pairKey: string) => void;
}

export default function ConsistencyAlertModal({
  isOpen,
  check,
  onClose,
  onScrollToOffender,
}: ConsistencyAlertModalProps) {
  if (!isOpen || !check) return null;

  const hasTriad = check.triadViolations.length > 0;
  const worst = check.worstInconsistency;

  const handleFix = () => {
    if (worst && onScrollToOffender) {
      const key = `${worst.itemA.id}_${worst.itemB.id}`;
      onScrollToOffender(key);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            {hasTriad ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {hasTriad ? '논리적 상충(순환 모순) 감지' : '일관성 비율(CR) 초과 경고'}
            </h3>
            <p className="text-xs text-slate-500">
              현재 일관성 비율: <strong className="text-rose-600">{check.cr.toFixed(3)}</strong> (학술 기준치: 0.10 이하)
            </p>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="space-y-3 mb-6 text-sm text-slate-600 leading-relaxed">
          {hasTriad ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm">
              <p className="font-semibold mb-1">상충 내용:</p>
              <p>{check.triadViolations[0].message}</p>
            </div>
          ) : (
            <p>
              방금 선택하신 응답으로 인해 평가 문항 간의 논리적 일관성 비율(CR)이 기준치(0.10)를 초과하였습니다.
              AHP 분석에서 일관성이 결여되면 최종 우선순위의 신뢰도가 크게 떨어집니다.
            </p>
          )}

          {worst && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm">
              <p className="font-semibold mb-1">가장 큰 불일치 문항:</p>
              <p>
                <strong>[{worst.itemA.name}] vs [{worst.itemB.name}]</strong>
              </p>
              <p className="mt-1 text-slate-600">
                💡 권장 조정 방향: <strong>{worst.recommendedRatingLabel}</strong> 수준으로 조정하시면 일관성이 크게 향상됩니다.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition order-2 sm:order-1"
          >
            현재 선택 유지하기
          </button>
          <button
            type="button"
            onClick={handleFix}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 order-1 sm:order-2"
          >
            <RotateCcw className="w-4 h-4" />
            불일치 문항 다시 확인/수정
          </button>
        </div>
      </div>
    </div>
  );
}
