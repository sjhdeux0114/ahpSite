# 📊 AHP Decision Hub (계층분석 의사결정 설문 & 분석 플랫폼)

AHP(Analytic Hierarchy Process, 계층화 의사결정 프로세스) 설문을 손쉽게 제작하고 배포하며, **응답 시 문항별 실시간 일관성(Consistency Ratio, CR) 검증**을 수행하고, 수집된 데이터를 기하평균(AIJ)으로 종합 분석하여 **Excel(.xlsx) 및 Word(.docx) 보고서로 다운로드**할 수 있는 웹 플랫폼입니다.

---

## 🌟 주요 기능

1. **간편 회원가입 및 관리 (10초 가입)**:
   - 이메일, 비밀번호, 이름만 입력하는 초간단 가입.
   - 내가 만든 설문 현황과 응답 수 모니터링 대시보드 제공.

2. **AHP 설문 제작 마법사**:
   - 다수의 평가 기준(Criteria) 및 선택적 대안(Alternatives) 등록.
   - Thomas L. Saaty의 1~9점 표준 척도 쌍대비교(Pairwise Comparison) 문항 자동 생성.

3. **고유 링크를 통한 대국민/사내 배포**:
   - 설문 생성 시 즉시 고유 단축 URL(`/s/[고유코드]`) 발급.
   - 응답자는 별도 회원가입 없이 모바일 및 PC에서 즉시 참여 가능.

4. **⚡ 문항별 실시간 일관성(CR) 검증 엔진 (핵심 특화 기능)**:
   - 응답자가 문항을 하나씩 체크할 때마다 클라이언트 측에서 즉시 **3자 순환 모순($A>B, B>C$인데 $C>A$ 선택)** 감지.
   - 현재 응답 상태의 **일관성 비율(CR)** 실시간 게이지 표시:
     - 🟢 **우수**: $CR \le 0.05$
     - 🔵 **양호**: $CR \le 0.10$ (학술/실무 신뢰 기준)
     - 🟠 **주의**: $0.10 < CR \le 0.15$
     - 🔴 **심각**: $CR > 0.15$
   - 기준치($CR > 0.10$) 초과 시 **경고 모달 팝업 및 원인 문항 추천 가이드** 제공하여 응답자가 즉시 수정할 수 있도록 지원.

5. **원클릭 배포 중지 / 재개 기능**:
   - 목표한 응답 수가 채워지면 대시보드에서 클릭 한 번으로 **"배포 중지(CLOSED)"** 처리.
   - 배포 중지 시 신규 응답 차단 및 마감 안내 화면 자동 표시.

6. **집단 의사결정 종합 분석 & 인터랙티브 시각화**:
   - 수집된 모든 응답자 데이터를 기하평균(AIJ)으로 자동 통합.
   - 신뢰 응답자($CR \le 0.10$) 필터링 토글 제공.
   - 1위 대안 하이라이트 배너, 대안별 종합 우선순위 바 차트, 평가 기준 가중치 바 차트, 다기준 레이더 차트, 집단 쌍대비교 행렬 표($\lambda_{\max}, CI, CR$) 및 개별 응답자 통과 여부 표 제공.

7. **📥 Excel 및 Word 보고서 다운로드**:
   - **Excel (.xlsx)**: 요약 결과, 가중치 순위, 집단 쌍대비교 행렬, 응답자별 원본 데이터가 서식화된 다중 시트 엑셀 다운로드.
   - **Word (.docx)**: 표지, 연구 배경, 계층도, 평가 기준 분석표, 대안 우선순위, 일관성 검증 결과가 포함된 공식 AHP 결과 보고서 워드 문서 다운로드.

8. **🐳 NAS Docker 완벽 지원**:
   - 무거운 외부 DB 없이 초경량 SQLite 임베디드로 구동.
   - Synology / QNAP / unRAID / Linux 서버에 Docker Compose 한 줄로 즉시 배포.

---

## 🚀 NAS Docker 원클릭 배포 가이드

### 1. 깃 저장소 복제 (Clone)
NAS 터미널(SSH) 또는 작업 디렉토리에서 다음 명령어를 실행합니다:
```bash
git clone https://github.com/sjhdeux0114/ahpSite.git
cd ahpSite
```

### 2. Docker Compose로 즉시 실행
```bash
docker compose up -d --build
```

실행이 완료되면 웹 브라우저에서 NAS의 IP로 접속합니다:
```
http://[NAS-IP주소]:3000
```
*(예: `http://192.168.1.100:3000`)*

### 3. 영구 데이터 보존 (Data Persistence)
- 컨테이너 내부의 SQLite 데이터베이스(`/app/data/ahp.db`)가 호스트의 `./data` 디렉토리에 마운트되어 있으므로, 컨테이너를 재시작하거나 업데이트해도 모든 회원 정보, 설문지, 응답 데이터가 안전하게 보존됩니다.

---

## 🛠 Synology NAS Container Manager에서 실행하는 방법

1. Synology NAS의 **Container Manager (또는 Docker)** 앱 실행.
2. **프로젝트(Project)** 메뉴 클릭 ➡️ **생성(Create)** 클릭.
3. 프로젝트 이름 입력 (예: `ahp-hub`).
4. 경로 선택: NAS 공유 폴더 내 생성한 `ahpSite` 폴더 지정.
5. 소스: **기존 docker-compose.yaml 파일 사용** 선택.
6. **다음** ➡️ **완료**를 누르면 자동으로 빌드 및 컨테이너가 실행됩니다!

---

## 💻 로컬 개발 환경 실행 방법

```bash
# 의존성 패키지 설치
npm install

# Prisma 클라이언트 생성 및 로컬 DB 동기화
npx prisma generate
npx prisma db push

# 개발 서버 실행
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

### AHP 수학 엔진 및 E2E 검증 테스트 실행
```bash
# 1. Saaty AHP 수학 엔진 단위 검증
npm run test:ahp

# 2. 회원가입/설문/실시간CR/집단가중치/엑셀/워드 전체 E2E 테스트
npx tsx scripts/test-e2e.mjs
```

---

## 📂 프로젝트 구조

```
ahpSite/
├── src/
│   ├── app/
│   │   ├── (auth)/             # 로그인 & 초간단 회원가입 페이지
│   │   ├── api/                # 백엔드 API (인증, 설문, 집단분석, 엑셀/워드 출력)
│   │   ├── dashboard/          # 설문 관리 대시보드, 설문 생성 마법사, 결과 분석 화면
│   │   ├── s/[slug]/           # 실시간 CR 검증 기능이 탑재된 공개 설문 참여 페이지
│   │   ├── layout.tsx
│   │   └── page.tsx            # 소개 랜딩 페이지
│   ├── components/
│   │   ├── ahp/                # 9점 척도 선택기, 실시간 CR 바, 경고 모달 컴포넌트
│   │   ├── analysis/           # 바 차트, 레이더 차트, 쌍대비교 행렬 표 컴포넌트
│   │   └── Navbar.tsx          # 상단 네비게이션
│   └── lib/
│       ├── ahp/                # Saaty AHP 수학 엔진, 트라이어드 순환 모순 감지, 실시간 CR
│       ├── export/             # Excel(.xlsx) 및 Word(.docx) 파일 생성기
│       ├── auth.ts             # bcryptjs 비밀번호 해싱 및 JWT 쿠키 인증
│       └── prisma.ts           # SQLite 데이터베이스 클라이언트
├── prisma/
│   └── schema.prisma           # 사용자, 설문, 응답 스키마
├── scripts/                    # 자동화 수학 검증 및 E2E 통합 테스트 스크립트
├── Dockerfile                  # Alpine 경량 Next.js Standalone 멀티스테이지 빌드
├── docker-compose.yml          # NAS 원클릭 실행 설정 (볼륨 및 포트 매핑)
└── README.md
```

---

## 📄 라이선스
MIT License © 2026 AHP Decision Hub
