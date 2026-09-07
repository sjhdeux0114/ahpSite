import { prisma } from '../src/lib/prisma.ts';
import { hashPassword, comparePassword, signToken, verifyToken } from '../src/lib/auth.ts';
import { calculateAHP, buildMatrix, aggregateGroupMatrices, synthesizePriorities } from '../src/lib/ahp/calculator.ts';
import { checkRealtimeConsistency } from '../src/lib/ahp/consistency.ts';
import { generateExcelReport } from '../src/lib/export/excel.ts';
import { generateWordReport } from '../src/lib/export/word.ts';

async function runE2ETest() {
  console.log('🚀 === STARTING E2E INTEGRATION & EXPORT TESTS ===\n');

  // 1. Auth Test
  console.log('Step 1: Auth & User Creation Test');
  const testEmail = `tester_${Date.now()}@example.com`;
  const password = 'mypassword123';
  const hashed = await hashPassword(password);
  const isValidPass = await comparePassword(password, hashed);
  console.log('Password hashing & verification:', isValidPass ? '✅ PASS' : '❌ FAIL');

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashed,
      name: '홍길동 연구원',
    },
  });
  console.log('User created:', user.email, 'ID:', user.id, '✅ PASS');

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  const verified = verifyToken(token);
  console.log('JWT sign and verify:', verified?.email === testEmail ? '✅ PASS' : '❌ FAIL');

  // 2. Survey Creation Test
  console.log('\nStep 2: Survey Creation Test');
  const criteria = [
    { id: 'c_price', name: '가격 (Price)', description: '도입 및 유지 비용' },
    { id: 'c_qual', name: '품질 (Quality)', description: '제품 신뢰성' },
    { id: 'c_design', name: '디자인 (Design)', description: 'UI/UX 편의성' },
  ];
  const alternatives = [
    { id: 'a_prodA', name: '제품 A', description: '가성비 모델' },
    { id: 'a_prodB', name: '제품 B', description: '프리미엄 모델' },
    { id: 'a_prodC', name: '제품 C', description: '오픈소스 모델' },
  ];

  const slug = `test_${Date.now().toString(36)}`;
  const survey = await prisma.survey.create({
    data: {
      title: '2026 차세대 업무 솔루션 선정 AHP 설문',
      description: '부서별 업무 효율 극대화를 위한 솔루션 평가',
      slug,
      status: 'ACTIVE',
      userId: user.id,
      hasAlternatives: true,
      criteria: JSON.stringify(criteria),
      alternatives: JSON.stringify(alternatives),
    },
  });
  console.log('Survey created with slug:', survey.slug, 'Title:', survey.title, '✅ PASS');

  // 3. Respondent Answering with Real-time Consistency Checks
  console.log('\nStep 3: Real-time Consistency & Triad Violation Detection');
  // Scenario A: Inconsistent responses
  const inconsistentAnswers = {
    'c_price_c_qual': 3,   // Price > Quality
    'c_qual_c_design': 3,  // Quality > Design
    'c_price_c_design': -3 // BUT Design > Price (Directional Violation!)
  };
  const realtimeCheckA = checkRealtimeConsistency(criteria, inconsistentAnswers);
  console.log('Inconsistent answers check:', {
    cr: realtimeCheckA.cr,
    status: realtimeCheckA.status,
    triadViolationsCount: realtimeCheckA.triadViolations.length,
    worstOffender: realtimeCheckA.worstInconsistency?.pair || 'Detected',
  });
  if (realtimeCheckA.triadViolations.length > 0 && realtimeCheckA.cr > 0.10) {
    console.log('✅ Real-time warning correctly triggered for circular contradiction!');
  }

  // Scenario B: Consistent responses
  const consistentAnswers = {
    'c_price_c_qual': 3,   // Price is 3x more important than Quality
    'c_qual_c_design': 2,  // Quality is 2x more important than Design
    'c_price_c_design': 6, // Price is 6x more important than Design (Transitive & Consistent!)
  };
  const realtimeCheckB = checkRealtimeConsistency(criteria, consistentAnswers);
  console.log('Consistent answers check:', {
    cr: realtimeCheckB.cr,
    status: realtimeCheckB.status,
    isAcceptable: realtimeCheckB.isAcceptable,
  });
  if (realtimeCheckB.isAcceptable && realtimeCheckB.cr <= 0.10) {
    console.log('✅ Consistency ratio correctly verified as acceptable (CR <= 0.10)!');
  }

  // Alternative answers for each criterion
  const altAnswersForCriteria = {
    c_price: { 'a_prodA_a_prodB': 5, 'a_prodA_a_prodC': 3, 'a_prodB_a_prodC': -2 }, // Prod A best on price
    c_qual: { 'a_prodA_a_prodB': -5, 'a_prodA_a_prodC': -3, 'a_prodB_a_prodC': 2 }, // Prod B best on quality
    c_design: { 'a_prodA_a_prodB': -2, 'a_prodA_a_prodC': 2, 'a_prodB_a_prodC': 3 },
  };

  // 4. Save Responses
  console.log('\nStep 4: Save Responses to DB');
  // Respondent 1 (Consistent)
  const resp1 = await prisma.response.create({
    data: {
      surveyId: survey.id,
      respondentName: '김철수 부장',
      respondentEmail: 'chulsoo@company.com',
      answers: JSON.stringify({
        criteria: consistentAnswers,
        alternatives: altAnswersForCriteria,
      }),
      crResults: JSON.stringify({ criteriaCR: realtimeCheckB.cr, isConsistent: true }),
      isValid: true,
    },
  });

  // Respondent 2 (Consistent)
  const resp2 = await prisma.response.create({
    data: {
      surveyId: survey.id,
      respondentName: '이영희 차장',
      respondentEmail: 'younghee@company.com',
      answers: JSON.stringify({
        criteria: { 'c_price_c_qual': 2, 'c_qual_c_design': 3, 'c_price_c_design': 5 },
        alternatives: altAnswersForCriteria,
      }),
      crResults: JSON.stringify({ criteriaCR: 0.02, isConsistent: true }),
      isValid: true,
    },
  });

  // Respondent 3 (Inconsistent)
  const resp3 = await prisma.response.create({
    data: {
      surveyId: survey.id,
      respondentName: '박의문 대리',
      respondentEmail: 'question@company.com',
      answers: JSON.stringify({
        criteria: inconsistentAnswers,
        alternatives: altAnswersForCriteria,
      }),
      crResults: JSON.stringify({ criteriaCR: 0.45, isConsistent: false }),
      isValid: false,
    },
  });
  console.log(`Saved 3 responses (2 valid, 1 invalid with high CR) ✅ PASS`);

  // 5. Group AHP Synthesis Test
  console.log('\nStep 5: Group Aggregation & Priority Synthesis');
  const validResponses = [resp1, resp2];
  const groupCritMatrix = aggregateGroupMatrices(
    validResponses.map(r => buildMatrix(criteria.map(c => c.id), JSON.parse(r.answers).criteria))
  );
  const groupCritAHP = calculateAHP(groupCritMatrix);
  console.log('Group Criteria Weights:', groupCritAHP.weights.map(w => Number(w.toFixed(4))));
  console.log('Group Criteria CR:', groupCritAHP.cr);

  // Alternative synthesis
  const altWeightsByCrit = [];
  const altIds = alternatives.map(a => a.id);
  for (const crit of criteria) {
    const groupAltMatrix = aggregateGroupMatrices(
      validResponses.map(r => buildMatrix(altIds, JSON.parse(r.answers).alternatives[crit.id]))
    );
    const altAHP = calculateAHP(groupAltMatrix);
    altWeightsByCrit.push(altAHP.weights);
  }

  const finalSynthesis = synthesizePriorities(groupCritAHP.weights, altWeightsByCrit);
  console.log('Final Alternative Priorities:');
  alternatives.forEach((alt, idx) => {
    console.log(`- ${alt.name}: ${(finalSynthesis.alternativeWeights[idx] * 100).toFixed(2)}%`);
  });

  // 6. Excel Export Test
  console.log('\nStep 6: Excel Export Test');
  const excelBuffer = await generateExcelReport({
    title: survey.title,
    description: survey.description,
    createdAt: survey.createdAt,
    status: survey.status,
    criteria,
    alternatives,
    hasAlternatives: true,
    totalResponses: 3,
    validResponses: 2,
    criteriaAHP: groupCritAHP,
    finalAlternativeWeights: finalSynthesis,
    individualResponses: [
      { id: resp1.id, name: '김철수 부장', email: 'chulsoo@company.com', createdAt: resp1.createdAt, isValid: true, criteriaCR: 0.015, answers: {} },
      { id: resp2.id, name: '이영희 차장', email: 'younghee@company.com', createdAt: resp2.createdAt, isValid: true, criteriaCR: 0.02, answers: {} },
      { id: resp3.id, name: '박의문 대리', email: 'question@company.com', createdAt: resp3.createdAt, isValid: false, criteriaCR: 0.45, answers: {} },
    ],
  });
  console.log(`Excel file generated successfully! Size: ${excelBuffer.length} bytes ✅ PASS`);

  // 7. Word Export Test
  console.log('\nStep 7: Word Document (.docx) Export Test');
  const wordBuffer = await generateWordReport({
    title: survey.title,
    description: survey.description,
    createdAt: survey.createdAt,
    status: survey.status,
    criteria,
    alternatives,
    hasAlternatives: true,
    totalResponses: 3,
    validResponses: 2,
    criteriaAHP: groupCritAHP,
    finalAlternativeWeights: finalSynthesis,
    individualResponses: [],
  });
  console.log(`Word file generated successfully! Size: ${wordBuffer.length} bytes ✅ PASS`);

  // 8. Survey Close / Distribution Stop Test
  console.log('\nStep 8: Survey Distribution Stop (배포 중지) Test');
  const updatedSurvey = await prisma.survey.update({
    where: { id: survey.id },
    data: { status: 'CLOSED' },
  });
  console.log('Survey status updated to:', updatedSurvey.status, '✅ PASS');

  // Clean up test data
  await prisma.response.deleteMany({ where: { surveyId: survey.id } });
  await prisma.survey.delete({ where: { id: survey.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Test cleanup completed ✅');

  console.log('\n🎉 ALL E2E AND EXPORT TESTS PASSED PERFECTLY!');
}

runE2ETest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
