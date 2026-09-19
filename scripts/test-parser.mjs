import { parseSurveyMarkdown } from '../src/lib/surveyMarkdownParser.ts';

console.log('=== AHP Survey Markdown Parser Test ===\n');

// Test Case 1: 사용자가 직접 제시한 예시
const userExample = `
1.설문 기본정보
내용:ahp 설문 조사
2.설문 목적 및 설명
내용:ahp 설문을 한다
3.계층형 평가기준
대분류1 : 프로그래밍기초 , 프로그램 개념과 원리를 이해한다
대분류1sub1:기능 완성도 , 요구기능 충실한 구현여부
대분류1sub2:기능 버그위험성 , 버그의 위험성
대분류2 : 디버깅 , 디버깅의 이해
대분류2sub1:디버그 , 디버그하는법
`;

console.log('--- Test 1: User Direct Example ---');
const result1 = parseSurveyMarkdown(userExample);
console.log('Success:', result1.success);
console.log('Title:', result1.title);
console.log('Description:', result1.description);
console.log('Criteria count:', result1.criteria.length);
console.log('Subcriteria count:', result1.stats.subcriteriaCount);
console.log('Has subcriteria:', result1.hasSubcriteria);
console.log('Criteria 1 name:', result1.criteria[0]?.name, 'Sub:', result1.criteria[0]?.subcriteria?.map(s => s.name));
console.log('Criteria 2 name:', result1.criteria[1]?.name, 'Sub:', result1.criteria[1]?.subcriteria?.map(s => s.name));
console.log('Warnings:', result1.warnings);

if (
  result1.title === 'ahp 설문 조사' &&
  result1.description === 'ahp 설문을 한다' &&
  result1.criteria.length === 2 &&
  result1.criteria[0].subcriteria.length === 2 &&
  result1.criteria[1].subcriteria.length === 1
) {
  console.log('✅ Test 1 Passed!\n');
} else {
  console.error('❌ Test 1 Failed!\n');
}

// Test Case 2: 마크다운 헤더, 불릿 및 대안/인적사항 포함 케이스
const markdownWithAltsAndDemo = `
\`\`\`markdown
# 1. 설문 기본정보
내용: 스마트 팩토리 MES 시스템 도입 AHP 평가

# 2. 설문 목적 및 설명
내용: 스마트 제조 혁신을 위한 MES 시스템 선정을 위해
각 평가지표의 상대적 중요도와 솔루션별 적합도를 평가합니다.

# 3. 계층형 평가기준
대분류 1: 기술적 우수성 , 시스템 안정성과 성능
  - 세부 1: 실시간 데이터 수집력 , 설비 연동 프로토콜 지원
  - 세부 2: 시스템 안정성 , 무장애 가동률 99.9%
대분류 2: 경제적 효율성 , 비용 대비 편익
  - 세부 1: 초기 도입비용 , 라이선스 및 컨설팅비
  - 세부 2: 유지보수 비용 , 연간 유지보수율

# 4. 대안
대안1 : A사 스마트 MES , 클라우드 SaaS형 패키지
대안2 : B사 커스텀 MES , 온프레미스 맞춤형 구축
대안3 : C사 오픈소스 MES , 자사 기술진 내재화

# 5. 응답자 인적사항
질문1 : 성별 (객관식) , 남성, 여성
질문2 : MES 관련 경력 (객관식) , 1년 미만, 1~5년, 5년 이상
질문3 : 소속 부서 (주관식)
\`\`\`
`;

console.log('--- Test 2: Comprehensive Markdown with Alts and Demographics ---');
const result2 = parseSurveyMarkdown(markdownWithAltsAndDemo);
console.log('Success:', result2.success);
console.log('Title:', result2.title);
console.log('Description:', result2.description);
console.log('Criteria count:', result2.criteria.length);
console.log('Subcriteria count:', result2.stats.subcriteriaCount);
console.log('Alternatives count:', result2.alternatives.length);
console.log('Demographics count:', result2.demographics.length);
console.log('Has alternatives:', result2.hasAlternatives);
console.log('Warnings:', result2.warnings);

if (
  result2.criteria.length === 2 &&
  result2.alternatives.length === 3 &&
  result2.demographics.length === 3 &&
  result2.hasAlternatives === true
) {
  console.log('✅ Test 2 Passed!\n');
} else {
  console.error('❌ Test 2 Failed!\n');
}

// Test Case 3: 세부영역 없는 단순 기준 평가
const simpleCriteria = `
1. 설문 기본정보
내용: 신규 직원 채용 평가 기준 가중치 산정

2. 설문 설명
내용: 채용 평가 요소별 중요도를 비교합니다.

3. 계층형 평가기준
대분류1 : 전공 지식 및 전문성 , 직무 관련 기초 지식
대분류2 : 문제 해결 능력 , 논리적 사고 및 해결력
대분류3 : 협업 및 인성 , 팀워크와 조직 융화도
대분류4 : 성장 잠재력 , 자기주도 학습 및 열정
`;

console.log('--- Test 3: Simple Criteria without Subcriteria ---');
const result3 = parseSurveyMarkdown(simpleCriteria);
console.log('Criteria count:', result3.criteria.length);
console.log('Has subcriteria:', result3.hasSubcriteria);
console.log('Has alternatives:', result3.hasAlternatives);

if (result3.criteria.length === 4 && result3.hasSubcriteria === false && result3.hasAlternatives === false) {
  console.log('✅ Test 3 Passed!\n');
} else {
  console.error('❌ Test 3 Failed!\n');
}

// Test Case 4: 다양한 구분자(|, -)와 주관식/객관식 인적사항 파싱
const mixedSeparators = `
1. 설문 기본정보
내용: AI 에이전트 도입 타당성 평가

2. 설문 목적 및 설명
내용: AI 에이전트 도입을 위한 우선순위 도출 설문

3. 계층형 평가기준
대분류 1: 기술 역량 | 모델 추론 속도 및 정확도
대분류 1 sub 1: 추론 속도 - 초당 토큰 생성량
대분류 1 sub 2: 정확도 - 벤치마크 점수
대분류 2: 비용 효율성 | 토큰당 과금 체계
대분류 2 sub 1: 입력 토큰 비용 - 백만 토큰당 달러
대분류 2 sub 2: 출력 토큰 비용 - 백만 토큰당 달러

4. 대안
대안 1: GPT-4o | 범용 최고 성능
대안 2: Claude 3.5 Sonnet | 코딩 및 복합 추론 특화
대안 3: Gemini 1.5 Pro | 100만 컨텍스트 윈도우

5. 응답자 인적사항
질문 1: 소속 부서 (주관식)
질문 2: AI 도입 실무 경험 [객관식] : 없음, 1년 미만, 1~3년, 3년 이상
`;

console.log('--- Test 4: Mixed Separators and Question Types ---');
const result4 = parseSurveyMarkdown(mixedSeparators);
console.log('Title:', result4.title);
console.log('Criteria count:', result4.criteria.length);
console.log('Subcriteria count:', result4.stats.subcriteriaCount);
console.log('Alternatives count:', result4.alternatives.length);
console.log('Demographics count:', result4.demographics.length);
console.log('Demo 1 type:', result4.demographics[0]?.type);
console.log('Demo 2 options:', result4.demographics[1]?.options);

if (
  result4.criteria.length === 2 &&
  result4.stats.subcriteriaCount === 4 &&
  result4.alternatives.length === 3 &&
  result4.demographics.length === 2 &&
  result4.demographics[0]?.type === 'text' &&
  result4.demographics[1]?.type === 'select' &&
  result4.demographics[1]?.options.length === 4
) {
  console.log('✅ Test 4 Passed!\n');
} else {
  console.error('❌ Test 4 Failed!\n');
}

