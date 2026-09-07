/**
 * Thomas L. Saaty's Analytic Hierarchy Process (AHP) Mathematical Engine
 */

export const RANDOM_INDEX: Record<number, number> = {
  1: 0.00,
  2: 0.00,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
  11: 1.51,
  12: 1.54,
  13: 1.56,
  14: 1.57,
  15: 1.59,
};

export function getRandomIndex(n: number): number {
  if (n <= 2) return 0.0;
  if (n in RANDOM_INDEX) return RANDOM_INDEX[n];
  // Standard approximation for n > 15: 1.98 * (n - 2) / n
  return 1.98 * (n - 2) / n;
}

export interface PairwiseAnswerMap {
  [key: string]: number; // key: "idA_idB", value: Saaty scale (>0: idA preferred, <0: idB preferred)
}

/**
 * Builds an n x n reciprocal matrix from items and pairwise comparisons.
 * Rating convention:
 * positive value s (1..9): item A is s times more important than item B -> matrix[a][b] = s, matrix[b][a] = 1/s
 * negative value -s (s in 2..9): item B is s times more important than item A -> matrix[a][b] = 1/s, matrix[b][a] = s
 * value 1: equal importance -> matrix[a][b] = 1, matrix[b][a] = 1
 */
export function buildMatrix(
  itemIds: string[],
  answers: PairwiseAnswerMap
): number[][] {
  const n = itemIds.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1.0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const idA = itemIds[i];
      const idB = itemIds[j];
      const key = `${idA}_${idB}`;
      const revKey = `${idB}_${idA}`;

      let val = 1.0;
      if (answers[key] !== undefined) {
        const raw = answers[key];
        val = raw >= 1 ? raw : 1 / Math.abs(raw);
      } else if (answers[revKey] !== undefined) {
        const raw = answers[revKey];
        val = raw >= 1 ? 1 / raw : Math.abs(raw);
      }

      matrix[i][j] = val;
      matrix[j][i] = 1 / val;
    }
  }

  return matrix;
}

export interface AHPResult {
  weights: number[];          // Normalized priority vector summing to 1.0
  lambdaMax: number;          // Principal eigenvalue
  ci: number;                 // Consistency Index
  cr: number;                 // Consistency Ratio
  isConsistent: boolean;      // true if CR <= 0.10 (or n <= 2)
  matrix: number[][];         // The n x n comparison matrix
}

/**
 * Calculates priority weights and consistency ratio using the Principal Eigenvector (Power Method)
 * with Row Geometric Mean Method (RGMM) as baseline.
 */
export function calculateAHP(matrix: number[][]): AHPResult {
  const n = matrix.length;

  if (n <= 1) {
    return {
      weights: [1.0],
      lambdaMax: 1.0,
      ci: 0.0,
      cr: 0.0,
      isConsistent: true,
      matrix,
    };
  }

  if (n === 2) {
    // For 2x2 matrix, weights are derived directly: w1 = a12 / (1 + a12), w2 = 1 / (1 + a12)
    const a12 = matrix[0][1];
    const w1 = a12 / (1 + a12);
    const w2 = 1.0 - w1;
    return {
      weights: [w1, w2],
      lambdaMax: 2.0,
      ci: 0.0,
      cr: 0.0,
      isConsistent: true,
      matrix,
    };
  }

  // Row Geometric Mean Method (RGMM) for initial weights & robustness
  const geomMeans = matrix.map(row => {
    const logSum = row.reduce((sum, val) => sum + Math.log(val), 0);
    return Math.exp(logSum / n);
  });
  const sumGeom = geomMeans.reduce((acc, val) => acc + val, 0);
  let weights = geomMeans.map(val => val / sumGeom);

  // Power Iteration to refine the principal eigenvector
  const MAX_ITER = 100;
  const EPSILON = 1e-7;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const nextWeights = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        nextWeights[i] += matrix[i][j] * weights[j];
      }
    }

    const sumNext = nextWeights.reduce((acc, val) => acc + val, 0);
    const normalized = nextWeights.map(val => val / sumNext);

    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(normalized[i] - weights[i]);
    }

    weights = normalized;
    if (diff < EPSILON) break;
  }

  // Calculate lambdaMax = (1 / n) * sum_i ((A * w)_i / w_i)
  let lambdaSum = 0;
  for (let i = 0; i < n; i++) {
    let aw_i = 0;
    for (let j = 0; j < n; j++) {
      aw_i += matrix[i][j] * weights[j];
    }
    lambdaSum += aw_i / weights[i];
  }
  const lambdaMax = lambdaSum / n;

  // Consistency Index: CI = (lambdaMax - n) / (n - 1)
  const ci = Math.max(0, (lambdaMax - n) / (n - 1));

  // Consistency Ratio: CR = CI / RI
  const ri = getRandomIndex(n);
  const cr = ri > 0 ? ci / ri : 0.0;

  return {
    weights,
    lambdaMax: Number(lambdaMax.toFixed(4)),
    ci: Number(ci.toFixed(4)),
    cr: Number(cr.toFixed(4)),
    isConsistent: cr <= 0.10,
    matrix,
  };
}

/**
 * Group AHP: Aggregates multiple individual pairwise comparison matrices using
 * the Geometric Mean Method (AIJ - Aggregation of Individual Judgements).
 */
export function aggregateGroupMatrices(individualMatrices: number[][][]): number[][] {
  const m = individualMatrices.length;
  if (m === 0) return [];
  const n = individualMatrices[0].length;

  const groupMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1.0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        groupMatrix[i][j] = 1.0;
        continue;
      }
      let logSum = 0;
      for (let k = 0; k < m; k++) {
        logSum += Math.log(individualMatrices[k][i][j]);
      }
      groupMatrix[i][j] = Math.exp(logSum / m);
    }
  }

  // Ensure reciprocal symmetry groupMatrix[j][i] = 1 / groupMatrix[i][j]
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const val = Math.sqrt(groupMatrix[i][j] / groupMatrix[j][i]);
      groupMatrix[i][j] = val;
      groupMatrix[j][i] = 1 / val;
    }
  }

  return groupMatrix;
}

/**
 * Synthesizes alternative weights across all criteria:
 * Final_Alternative_Weight_j = sum_k (Criterion_Weight_k * Alternative_Weight_jk)
 */
export function synthesizePriorities(
  criteriaWeights: number[],
  alternativesWeightsByCriteria: number[][] // [criterionIndex][alternativeIndex]
): {
  alternativeWeights: number[];
  contributionMatrix: number[][]; // [alternativeIndex][criterionIndex]
} {
  const numCriteria = criteriaWeights.length;
  const numAlternatives = alternativesWeightsByCriteria[0]?.length || 0;

  const finalWeights = new Array(numAlternatives).fill(0);
  const contributionMatrix: number[][] = Array.from({ length: numAlternatives }, () =>
    Array(numCriteria).fill(0)
  );

  for (let alt = 0; alt < numAlternatives; alt++) {
    for (let crit = 0; crit < numCriteria; crit++) {
      const critW = criteriaWeights[crit];
      const altW = alternativesWeightsByCriteria[crit]?.[alt] || 0;
      const contribution = critW * altW;
      contributionMatrix[alt][crit] = contribution;
      finalWeights[alt] += contribution;
    }
  }

  // Normalize final weights to strictly sum to 1.0
  const sum = finalWeights.reduce((acc, v) => acc + v, 0);
  const normalized = sum > 0 ? finalWeights.map(v => v / sum) : finalWeights;

  return {
    alternativeWeights: normalized,
    contributionMatrix,
  };
}
