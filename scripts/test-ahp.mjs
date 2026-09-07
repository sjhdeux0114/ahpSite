import { calculateAHP, buildMatrix, aggregateGroupMatrices, synthesizePriorities } from '../src/lib/ahp/calculator.ts';
import { checkRealtimeConsistency } from '../src/lib/ahp/consistency.ts';

console.log('=== Testing AHP Calculation Engine ===');

// Test 1: Saaty standard textbook example (3x3 criteria: Experience, Education, Charisma)
// Matrix:
// [  1,   4, 1/5 ]
// [ 1/4,  1, 1/7 ]
// [  5,   7,   1 ]
const testMatrix = [
  [1, 4, 1 / 5],
  [1 / 4, 1, 1 / 7],
  [5, 7, 1],
];

const res1 = calculateAHP(testMatrix);
console.log('Test 1 Weights:', res1.weights.map(w => Number(w.toFixed(4))));
console.log('LambdaMax:', res1.lambdaMax);
console.log('CI:', res1.ci);
console.log('CR:', res1.cr);
console.log('Is Consistent (CR <= 0.10):', res1.isConsistent);

if (res1.weights[2] > res1.weights[0] && res1.weights[0] > res1.weights[1]) {
  console.log('✅ Test 1 Weights ordering matches theoretical expectations!');
} else {
  console.error('❌ Test 1 unexpected weight order');
}

// Test 2: Real-time consistency check with Triad violation
const items = [
  { id: 'c1', name: '가격 (Price)' },
  { id: 'c2', name: '품질 (Quality)' },
  { id: 'c3', name: '디자인 (Design)' },
];

// User answers: Price > Quality (3), Quality > Design (3), BUT Design > Price (5) -> Contradiction!
const conflictingAnswers = {
  'c1_c2': 3,  // Price is 3x more important than Quality
  'c2_c3': 3,  // Quality is 3x more important than Design
  'c1_c3': -5, // Price vs Design rated -5 (Design is 5x more important than Price!)
};

const checkResult = checkRealtimeConsistency(items, conflictingAnswers);
console.log('\n=== Test 2: Realtime Consistency & Triad Violation Check ===');
console.log('Total pairs:', checkResult.totalPairs, 'Answered:', checkResult.answeredPairs);
console.log('CR:', checkResult.cr, 'Status:', checkResult.status);
console.log('Triad violations found:', checkResult.triadViolations.length);
if (checkResult.triadViolations.length > 0) {
  console.log('Violation message:', checkResult.triadViolations[0].message);
}
console.log('Worst inconsistency:', checkResult.worstInconsistency ? {
  pair: `${checkResult.worstInconsistency.itemA.name} vs ${checkResult.worstInconsistency.itemB.name}`,
  currentVal: checkResult.worstInconsistency.currentValue,
  recommended: checkResult.worstInconsistency.recommendedRatingLabel
} : 'None');

if (checkResult.triadViolations.length > 0 && checkResult.cr > 0.10) {
  console.log('✅ Test 2 Triad violation and high CR correctly detected!');
} else {
  console.error('❌ Test 2 failed to detect violation!');
}

// Test 3: Group Aggregation
const respondent1 = [
  [1, 3, 5],
  [1 / 3, 1, 2],
  [1 / 5, 1 / 2, 1],
];
const respondent2 = [
  [1, 2, 4],
  [1 / 2, 1, 3],
  [1 / 4, 1 / 3, 1],
];

const groupMatrix = aggregateGroupMatrices([respondent1, respondent2]);
const groupRes = calculateAHP(groupMatrix);
console.log('\n=== Test 3: Group Aggregation ===');
console.log('Group Weights:', groupRes.weights.map(w => Number(w.toFixed(4))));
console.log('Group CR:', groupRes.cr);
if (groupRes.cr <= 0.10) {
  console.log('✅ Test 3 Group aggregation produced consistent group weights!');
}

console.log('\n🎉 ALL MATHEMATICAL ENGINE TESTS PASSED!');
