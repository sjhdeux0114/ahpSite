import { buildMatrix, calculateAHP, calculateIncompleteAHP, PairwiseAnswerMap } from './calculator';

export interface ItemInfo {
  id: string;
  name: string;
}

export interface TriadViolation {
  itemA: ItemInfo;
  itemB: ItemInfo;
  itemC: ItemInfo;
  message: string;
}

export interface WorstInconsistency {
  itemA: ItemInfo;
  itemB: ItemInfo;
  currentValue: number; // raw value (>1: A preferred, <-1: B preferred)
  currentRatio: number; // a_ij in matrix
  recommendedRatio: number; // w_i / w_j
  recommendedRatingLabel: string; // e.g. "동등(1) 또는 B 약간 중요(3)"
  discrepancy: number;
}

export type ConsistencyStatus = 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'CRITICAL';

export interface RealtimeConsistencyCheck {
  totalPairs: number;
  answeredPairs: number;
  isComplete: boolean;
  cr: number;
  status: ConsistencyStatus;
  isAcceptable: boolean; // CR <= 0.10
  triadViolations: TriadViolation[];
  worstInconsistency: WorstInconsistency | null;
  message: string;
}

/**
 * Checks consistency in real time as the respondent fills out the pairwise comparisons.
 */
export function checkRealtimeConsistency(
  items: ItemInfo[],
  answers: PairwiseAnswerMap
): RealtimeConsistencyCheck {
  const n = items.length;
  const totalPairs = (n * (n - 1)) / 2;
  const itemMap = new Map<string, ItemInfo>(items.map(it => [it.id, it]));

  // Count answered pairs
  let answeredCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key1 = `${items[i].id}_${items[j].id}`;
      const key2 = `${items[j].id}_${items[i].id}`;
      if (answers[key1] !== undefined || answers[key2] !== undefined) {
        answeredCount++;
      }
    }
  }

  const isComplete = answeredCount === totalPairs && totalPairs > 0;

  // 1. Detect Triad Directional Violations (Circular contradictions: A > B, B > C, C > A)
  const triadViolations: TriadViolation[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const idA = items[i].id;
        const idB = items[j].id;
        const idC = items[k].id;

        const valAB = getPairValue(answers, idA, idB);
        const valBC = getPairValue(answers, idB, idC);
        const valAC = getPairValue(answers, idA, idC);

        // All 3 pairs in the triad must be answered to evaluate cycle
        if (valAB === null || valBC === null || valAC === null) continue;

        // valAB > 1 means A > B; valAB < 1 means B > A; valAB === 1 means A == B
        // Cycle 1: A > B and B > C, but C > A (valAC < 1)
        if (valAB > 1.05 && valBC > 1.05 && valAC < 0.95) {
          triadViolations.push({
            itemA: itemMap.get(idA)!,
            itemB: itemMap.get(idB)!,
            itemC: itemMap.get(idC)!,
            message: `'${itemMap.get(idA)?.name}'이(가) '${itemMap.get(idB)?.name}'보다 중요하고, '${itemMap.get(idB)?.name}'이(가) '${itemMap.get(idC)?.name}'보다 중요하다고 하셨으나, '${itemMap.get(idC)?.name}'이(가) '${itemMap.get(idA)?.name}'보다 더 중요하다고 선택하셨습니다.`,
          });
        }
        // Cycle 2: A < B and B < C, but C < A (valAC > 1)
        else if (valAB < 0.95 && valBC < 0.95 && valAC > 1.05) {
          triadViolations.push({
            itemA: itemMap.get(idA)!,
            itemB: itemMap.get(idB)!,
            itemC: itemMap.get(idC)!,
            message: `'${itemMap.get(idB)?.name}'이(가) '${itemMap.get(idA)?.name}'보다 중요하고, '${itemMap.get(idC)?.name}'이(가) '${itemMap.get(idB)?.name}'보다 중요하다고 하셨으나, '${itemMap.get(idA)?.name}'이(가) '${itemMap.get(idC)?.name}'보다 더 중요하다고 선택하셨습니다.`,
          });
        }
      }
    }
  }

  // 2. Compute full or partial matrix CR using Harker's Method for incomplete matrices
  let ahpResult: ReturnType<typeof calculateAHP>;
  let cr = 0.0;

  if (isComplete) {
    const matrix = buildMatrix(items.map(it => it.id), answers);
    ahpResult = calculateAHP(matrix);
    cr = ahpResult.cr;
  } else {
    ahpResult = calculateIncompleteAHP(items.map(it => it.id), answers);
    cr = ahpResult.cr;
  }

  // Determine status
  let status: ConsistencyStatus = 'EXCELLENT';
  if (answeredCount < 3) {
    // Fewer than 3 pairs answered: no cycles exist, perfect consistency by definition
    status = 'EXCELLENT';
    cr = 0.0;
  } else if (cr > 0.15) {
    status = 'CRITICAL';
  } else if (cr > 0.10) {
    status = 'CAUTION';
  } else if (cr > 0.05) {
    status = 'GOOD';
  }


  // 3. Find worst inconsistent comparison (if CR > 0.10 and multiple answered)
  let worstInconsistency: WorstInconsistency | null = null;
  if (cr > 0.10 && answeredCount >= 3) {
    let maxDiscrepancy = 0;
    let worstPair: { i: number; j: number; aij: number; ratio: number } | null = null;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const idA = items[i].id;
        const idB = items[j].id;
        const answered = answers[`${idA}_${idB}`] !== undefined || answers[`${idB}_${idA}`] !== undefined;
        if (!answered) continue;

        const aij = ahpResult.matrix[i][j];
        const theoreticalRatio = ahpResult.weights[i] / (ahpResult.weights[j] || 1e-6);
        // Logarithmic discrepancy metric
        const discrepancy = Math.abs(Math.log(aij) - Math.log(theoreticalRatio));

        if (discrepancy > maxDiscrepancy) {
          maxDiscrepancy = discrepancy;
          worstPair = { i, j, aij, ratio: theoreticalRatio };
        }
      }
    }

    if (worstPair) {
      const { i, j, aij, ratio } = worstPair;
      const itemA = items[i];
      const itemB = items[j];
      const rawVal = answers[`${itemA.id}_${itemB.id}`] ?? (answers[`${itemB.id}_${itemA.id}`] ? -answers[`${itemB.id}_${itemA.id}`] : 1);

      let label = '';
      if (ratio >= 7) label = `'${itemA.name}' 매우 중요(7~9)`;
      else if (ratio >= 4) label = `'${itemA.name}' 중요(5)`;
      else if (ratio >= 2) label = `'${itemA.name}' 약간 중요(3)`;
      else if (ratio >= 0.7) label = `동등한 중요도(1)`;
      else if (ratio >= 0.35) label = `'${itemB.name}' 약간 중요(3)`;
      else if (ratio >= 0.2) label = `'${itemB.name}' 중요(5)`;
      else label = `'${itemB.name}' 매우 중요(7~9)`;

      worstInconsistency = {
        itemA,
        itemB,
        currentValue: rawVal,
        currentRatio: aij,
        recommendedRatio: ratio,
        recommendedRatingLabel: label,
        discrepancy: maxDiscrepancy,
      };
    }
  }

  // Summary message
  let message = '';
  if (triadViolations.length > 0) {
    message = `⚠️ 논리적 순환 모순이 감지되었습니다 (${triadViolations.length}건). 선택 항목을 재검토해 주세요.`;
  } else if (cr <= 0.05) {
    message = '✨ 응답의 일관성이 매우 우수합니다 (CR ≤ 0.05).';
  } else if (cr <= 0.10) {
    message = '✅ 일관성이 양호한 기준치 범위 내에 있습니다 (CR ≤ 0.10).';
  } else if (cr <= 0.15) {
    message = `⚠️ 일관성 비율(CR: ${cr})이 기준치(0.10)를 약간 초과했습니다. 문항을 재확인하시면 더 신뢰도 높은 결과가 됩니다.`;
  } else {
    message = `🚨 일관성 비율(CR: ${cr})이 기준치(0.10)를 크게 벗어났습니다. 상충되는 답변을 수정해 주시기 바랍니다.`;
  }

  return {
    totalPairs,
    answeredPairs: answeredCount,
    isComplete,
    cr,
    status,
    isAcceptable: cr <= 0.10,
    triadViolations,
    worstInconsistency,
    message,
  };
}

/**
 * Returns pairwise matrix element a_ij given answers map.
 * Returns null if neither (A, B) nor (B, A) was answered.
 */
function getPairValue(answers: PairwiseAnswerMap, idA: string, idB: string): number | null {
  const key1 = `${idA}_${idB}`;
  const key2 = `${idB}_${idA}`;

  if (answers[key1] !== undefined) {
    const raw = answers[key1];
    return raw >= 1 ? raw : 1 / Math.abs(raw);
  }
  if (answers[key2] !== undefined) {
    const raw = answers[key2];
    return raw >= 1 ? 1 / raw : Math.abs(raw);
  }
  return null;
}
