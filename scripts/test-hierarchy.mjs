import { calculateHierarchicalAHP } from '../src/lib/ahp/calculator.ts';

console.log('=== Testing Hierarchical AHP Engine ===');

const criteria = [
  {
    id: 'c_tech',
    name: '기술성',
    subcriteria: [
      { id: 's_func', name: '기능 완성도' },
      { id: 's_stab', name: '시스템 안정성' },
      { id: 's_scal', name: '확장 용이성' },
    ],
  },
  {
    id: 'c_econ',
    name: '경제성',
    subcriteria: [
      { id: 's_init', name: '초기 도입비용' },
      { id: 's_maint', name: '연간 유지비' },
      { id: 's_roi', name: '투자회수율(ROI)' },
    ],
  },
  {
    id: 'c_oper',
    name: '운영성',
    subcriteria: [
      { id: 's_ux', name: '사용자 편의성' },
      { id: 's_sup', name: '기술지원 체계' },
    ],
  },
  {
    id: 'c_pol',
    name: '정책성',
    subcriteria: [
      { id: 's_std', name: '표준 규격 준수' },
      { id: 's_sec', name: '보안 규정 적합' },
    ],
  },
];

const criteriaAnswers = {
  'c_tech_c_econ': 2,
  'c_tech_c_oper': 3,
  'c_tech_c_pol': 4,
  'c_econ_c_oper': 2,
  'c_econ_c_pol': 3,
  'c_oper_c_pol': 2,
};

const subcriteriaAnswersByCrit = {
  c_tech: {
    's_func_s_stab': 2,
    's_func_s_scal': 3,
    's_stab_s_scal': 2,
  },
  c_econ: {
    's_init_s_maint': 1.5,
    's_init_s_roi': 2,
    's_maint_s_roi': 1.5,
  },
  c_oper: {
    's_ux_s_sup': 2,
  },
  c_pol: {
    's_sec_s_std': 2,
  },
};

const result = calculateHierarchicalAHP(criteria, criteriaAnswers, subcriteriaAnswersByCrit);

console.log('Main Criteria Weights:');
criteria.forEach((c, idx) => {
  console.log('  ' + c.name + ': ' + (result.criteriaAHP.weights[idx] * 100).toFixed(2) + '%');
});
console.log('Main CR: ' + result.criteriaAHP.cr + ' (Consistent: ' + result.criteriaAHP.isConsistent + ')');

console.log('\nSubcriteria Global Ranking:');
result.allSubcriteria.forEach(sub => {
  console.log('  [' + sub.globalRank + '위] ' + sub.criterionName + ' > ' + sub.name + ': Global ' + (sub.globalWeight * 100).toFixed(2) + '% (Local ' + (sub.localWeight * 100).toFixed(2) + '%)');
});

const globalWeightSum = result.allSubcriteria.reduce((sum, s) => sum + s.globalWeight, 0);
console.log('\nTotal Subcriteria Global Weight Sum: ' + (globalWeightSum * 100).toFixed(2) + '%');
console.log('Hierarchy Composite CI (CI_H): ' + result.compositeCI);
console.log('Hierarchy Composite RI (RI_H): ' + result.compositeRI);
console.log('Hierarchy Composite CR (CR_H): ' + result.compositeCR + ' (Consistent: ' + result.isHierarchyConsistent + ')');

if (Math.abs(globalWeightSum - 1.0) < 0.02 && result.compositeCR <= 0.10) {
  console.log('✅ HIERARCHICAL AHP ENGINE TEST PASSED!');
} else {
  console.error('❌ Hierarchy test failed');
  process.exit(1);
}
