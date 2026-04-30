# 핸드오프 — 입주ON 업체 모바일 앱 (ipjuon-vendor-app)

> 작성: 2026-04-30 (휴가 인수인계용)
> 위임받는 분이 5분 내 전체 그림 잡을 수 있도록 정리.

---

## 0. 한 줄 소개

**입주ON 협약은행 상담사·팀장이 외근·이동 중 사용하는 모바일 PWA.**

- 기존 PC 사이트(`supabase-connect-zeta.vercel.app`)의 **모바일 보조판** — 외근 시 인박스 확인·메시지·자서일정·DSR 시뮬레이션 등.
- 백엔드 코드 **수정 없이** 기존 ipjuon-backend의 API만 소비.
- 같은 백엔드를 쓰므로 데이터는 PC와 100% 일치.

---

## 1. URL / 배포 / 계정

### 라이브 사이트

| 항목 | URL |
|---|---|
| **vendor-app (이번 인수인계 대상)** | https://ipjuon-vendor-app.vercel.app |
| 백엔드 (ngrok 동적) | https://armadillo-perkiness-routing.ngrok-free.dev |
| (참고) PC 관리자/은행팀 | https://supabase-connect-zeta.vercel.app |
| (참고) B2C 입주민앱 | https://ipjuon-app.vercel.app |
| (참고) 현장앱 | https://resident-connect-lac.vercel.app |

### GitHub repo

- **vendor-app**: https://github.com/jwgeom-boop/ipjuon-vendor-app (Public, main 브랜치)
- 백엔드: https://github.com/jwgeom-boop/ipjuon-backend (⚠️ **redesign-v3 브랜치**가 최신)
- (참고) 관리자: https://github.com/jwgeom-boop/ipjuon-admin
- (참고) 입주민앱: https://github.com/jwgeom-boop/ipjuon-app
- (참고) 현장앱: https://github.com/jwgeom-boop/resident-connect

### Vercel

- 프로젝트: https://vercel.com/jwgeom-boops-projects/ipjuon-vendor-app
- main에 push 시 자동 배포
- 환경변수 1개: `VITE_API_BASE_URL` (백엔드 URL)

### 로그인 테스트 계정 (시드 데이터, 모든 사이트 공통)

| 역할 | ID | PW |
|---|---|---|
| 관리자 (PC만) | `ipjuon` | `ipjuon2024!` |
| 은행 팀장 (8개 은행) | `shinhan` `hana` `kb` `woori` `nh` `ibk` `busan` `daegu` | `{id}2024!` |
| 은행 상담사 (24명) | `{은행키}{01\|02\|03}` (예: `hana01`) | `{id}_2024!` |

상담사 이름: 01=김주임 / 02=이대리 / 03=박과장

vendor-app에서 권장 테스트:
- `hana` 로그인 → 팀 홈 화면 (KPI·팀원별·신규큐·오늘일정·내가챙길것)
- `hana01` 로그인 → 인박스 (본인 건만)

---

## 2. 기술 스택 (실제 동작 기준)

⚠️ 별도 공유받은 "apthome 가이드" 문서는 **다른 프로젝트의 것**이므로 ipjuon에 적용하지 마세요. 실제 스택:

### 백엔드 (ipjuon-backend, redesign-v3 브랜치)
- 패키지: `com.ipjuon.backend`
- Spring Boot 3.5 / Java 21
- **Spring Data JPA + Hibernate** (MyBatis 아님)
- **PostgreSQL** (MySQL 아님)
- JJWT 0.12.6 (인증)
- 포트: **8090** (8081 아님)
- 현재 ngrok agent로 인터넷 노출 중

### vendor-app (이 repo)
- React 18.3 + TypeScript 5.8 + Vite 5.4
- Tailwind CSS 3.4 + shadcn/ui (Radix 풀세트)
- TanStack React Query 5.83
- React Router DOM 6.30
- API 호출: 내장 `fetch` (axios·supabase 의존성 없음)
- PWA (manifest + service worker)

다른 3개 프론트(admin, resident-connect, ipjuon-app)와 같은 Lovable 스캐폴드(`vite_react_shadcn_ts`) 사용. 단 vendor-app만 Supabase 클라이언트 미포함 (백엔드 API만 사용).

---

## 3. 폴더 구조

```
src/
├── shell/                 # 멀티모듈 공용 레이어
│   ├── api/client.ts      # fetch 기반 API 클라이언트 (ApiError 포함)
│   ├── auth/              # AuthContext (localStorage 기반 영속 로그인)
│   │                      #   + RequireAuth 라우터 가드
│   ├── layout/            # MobileShell · FullScreenShell · BottomNav · PageHeader
│   └── push/              # Web Push 구독 hook + UI
└── modules/
    └── bank/              # 은행 도메인 (현재 유일)
        ├── types.ts       # Consultation, LoanStatus 등 핵심 타입
        ├── format.ts      # formatWon, daysUntil, ddayLabel, maskRrn
        ├── inbox/         # InboxList · InboxDetail · KpiStrip · TaskBox
        ├── messages/      # MessagesPage (양방향 채팅)
        ├── pre-screening/ # 가심사 수용 (apply 단계만 노출)
        ├── signing/       # 자서 일정 캘린더 (result/signing_reservation 단계)
        ├── settlement/    # 정산서 read-only (executing/done)
        ├── share/         # 상환 안내문 + 법무사 송부 (Web Share API)
        ├── notifications/ # 입주민 액션 알림 + 푸시 설정
        ├── tools/         # DSR 시뮬레이터 (스트레스 DSR 풀버전)
        ├── customers/     # 신규 고객 등록 시트
        ├── profile/       # 프로필 + 비밀번호 변경
        ├── performance/   # 월 실적 (팀장: 팀/본인/팀원별 토글)
        ├── complex/       # 단지 협약 정보 조회
        ├── intervention/  # 개입 큐 (취소요청·실행임박·정체·미상담)
        ├── dsr/           # DSR 계산 엔진 (constants·formulas·calculator)
        └── team/          # TeamHomePage (팀장 전용 메인 화면)
```

향후 다른 업종(예: 법무사·이사·인테리어) 추가 시: `modules/<vendor>/` 폴더 신설 + 라우터 등록.

---

## 4. 역할별 화면

### 팀장 (`bank_manager`, 예: hana)
- `/` → **TeamHomePage** (KPI 4개, 팀원별, 신규큐, 오늘일정, 내가챙길것)
- 바텀탭: [팀 홈] [인박스] [알림] [DSR]
- 메뉴: + "팀 홈" / "전체 상담" / "내가 챙길 것" 추가 노출
- 인박스 헤더: assignee 칩 필터 (팀 전체 / 김주임 / 이대리 / 박과장)
- 월 실적: 팀 전체 / 본인 / 팀원별 토글 + 팀원 랭킹

### 상담사 (`bank_consultant`, 예: hana01)
- `/` → `/inbox` 자동 redirect (본인 건만)
- 바텀탭: [인박스] [알림] [DSR]
- 메뉴: 본인 정보 + "개입 큐" 표시
- 백엔드가 자동으로 본인 assignee 건만 반환

---

## 5. 알려진 이슈 / 위임받는 분이 처리할 것

### 🔴 백엔드 변경 필요 (vendor-app 미완 부분)

#### A. Vendor 푸시 알림 엔드포인트 (필수)
- 현재: `/api/b2c/push-subscriptions` 는 입주민 phone 기반 (vendor 식별 불가)
- 필요: `/api/vendor/push-subscriptions` 신규 추가 (loginId 기반)
- vendor-app 측 코드는 `src/shell/push/usePushSubscription.ts` 의 TODO 주석 위치에 register API 호출만 추가하면 됨
- 효과: 새 메시지·신청서 도착·자서 변경 등 즉시 푸시 알림

#### B. 신규 큐 배정 API (선택)
- 현재: vendor-app에서 팀장이 신규 큐의 건을 다른 팀원에게 재배정 못 함 (PC에서만 가능)
- 필요: `PATCH /api/bank/consultations/{id}/assign` 추가 — body로 vendor name 받아서 `assignee_vendor_id` + `manager` 양쪽 갱신
- 추가 후 vendor-app TeamHomePage 신규큐 카드에 [팀원 ▼] 드롭다운 추가 가능

#### C. CORS 화이트리스트 추가
백엔드 CORS 설정에 vendor-app 도메인 추가:
```
https://ipjuon-vendor-app.vercel.app
```
현재는 vercel.app 와일드카드 또는 다른 도메인 매칭으로 임시 동작 가능성 (확인 필요).

### 🟡 vendor-app 측 보강 (선택)

- **PWA 아이콘 디자인 교체** — 현재 placeholder("은" 텍스트, 검은 배경). 실제 브랜드 로고로 교체 권장
- **에러 페이지 개선** — 현재 단순 토스트만. 401/500/네트워크에러 별 안내 분리 시 UX ↑
- **Pull-to-refresh** — 모바일 표준 UX, 미구현
- **Loading skeleton** — 페이지 전환 시 깜빡임. shadcn `<Skeleton>` 활용 가능
- **CompletedDetail** — `done` 단계 건 별도 뷰 (현재는 일반 상세에서 처리)
- **위저드 (예약/자서/실행)** — PC 위저드의 모바일 변형 — 옵션 2 범위 외였음

### 🟢 인프라 결정 사항 (휴가 후 협의)

- **백엔드 호스팅 전환**: 현재 ngrok-free (URL 동적, 8h 세션 한계). 장기 옵션:
  - Cloudflare Tunnel (무료, 도메인 필요)
  - ngrok Personal ($10/월)
  - Render 무료 (DB 이전 필요할 수 있음)
  - 사무실 신규 PC 서버 + Cloudflare Tunnel (장기 계획)
- **DB 위치 결정** — 현재 로컬 PC PostgreSQL (추정). Supabase 등으로 이전 시 백엔드만 갈아끼우면 vendor-app 무영향
- **푸시 vendor 엔드포인트 설계** — 위 A 항목

---

## 6. 휴가 중 운영 관리

### 모니터링
- **UptimeRobot** (등록 예정 또는 완료): 5분 간격 헬스체크
  - vendor-app (`https://ipjuon-vendor-app.vercel.app`)
  - 백엔드 (`https://armadillo-perkiness-routing.ngrok-free.dev/api/auth/login`)
  - 죽으면 등록 이메일로 즉시 알림

### ngrok 한계 (휴가 중 발생 가능)
- ngrok-free 무료 플랜은 8시간 세션 후 자동 종료 → URL 변경
- URL 변경 시 vendor-app·admin 등 모든 프론트의 Vercel 환경변수 갱신 필요
- 휴가 출발 직전 권장: **ngrok Personal $10/월 1개월 결제** 후 안정 도메인 예약 → 위 문제 해소
- 또는 사무실 PC에서 ngrok agent 자동 재시작 스크립트 등록

### 사무실 PC 의존
백엔드는 사무실 PC + ngrok agent로 동작 중. PC 꺼지면 모든 사이트 다운.
- 사무실 PC 절전 모드 끔
- Windows 자동 업데이트 재시작 비활성
- 동료에게 "PC 끄지 마세요" 메모

---

## 7. 권한 위임 절차 (휴가 출발 전)

### GitHub
1. https://github.com/jwgeom-boop/ipjuon-vendor-app → Settings → Collaborators
2. **Add people** → 위임받는 분 GitHub username
3. Role: **Admin**
4. 상대방이 초대 이메일 수락하면 즉시 활성

(같은 절차로 다른 4개 repo도 진행 — 백엔드 수정도 가능해야 하므로 ipjuon-backend 필수)

### Vercel
1. https://vercel.com/jwgeom-boops-projects → 우상단 본인 아바타 → **Account Settings**
2. Hobby 플랜은 멤버 초대 불가. **계정 공유** 또는 **Pro 업그레이드** 중 선택
3. 빠른 길: 비밀번호 매니저(1Password / Bitwarden)로 계정 정보 안전 공유

### 백엔드 환경 (ngrok / Render / 로컬)
- ngrok 계정 정보 공유
- 사무실 PC 접근 정보 (필요 시)
- DB 접근 정보 (PostgreSQL credentials)

### 환경변수 / 시크릿
- vendor-app `.env.local` 내용 (현재는 `VITE_API_BASE_URL` 1개)
- 백엔드 `application.yml` 의 시크릿 (DB 비번, JWT secret 등)

→ Bitwarden Free 또는 1Password Family 7일 trial 권장

---

## 8. 긴급 연락 / 휴가 중 대응

(아래 본인 정보로 채워서 위임받는 분에게 전달)

```
휴가 기간: 2026-XX-XX ~ 2026-XX-XX
긴급 연락: +82-XX-XXXX-XXXX (카톡 답장 12시간 내)
응급 시: PC 재시작 → ngrok URL 변경되면 카톡으로 알려주세요
```

---

## 9. vendor-app 내부 변경 가이드

### 코드 수정 워크플로우
```
1. 로컬 clone: git clone https://github.com/jwgeom-boop/ipjuon-vendor-app
2. npm install
3. npm run dev (포트 8082)
4. 코드 수정
5. git commit + git push origin main
6. Vercel 자동 재배포 (1-2분)
```

### 주요 컨벤션
- TypeScript strict 모드는 OFF (기존 코드 호환)
- ESLint 룰: 기본 React + react-hooks
- 컴포넌트: 함수형 + hooks
- 스타일: Tailwind utility 클래스 위주 + `cn()` 헬퍼
- 백엔드 응답 타입: `Consultation` 등 `src/modules/bank/types.ts` 참조
- 새 페이지 추가: `src/App.tsx` 라우트 + (필요 시) BottomNav·메뉴 분기

### 빌드·배포
- `npm run build` → `dist/` (Vercel이 자동 처리)
- main 브랜치 push만 production 배포 (Preview는 다른 브랜치)
- 환경변수: Vercel Project Settings에서 관리

---

## 10. 참고 자료 / 연결된 문서

- [README.md](./README.md) — 빠른 시작 가이드
- [PerformancePage.tsx](./src/modules/bank/performance/PerformancePage.tsx) — 팀 실적 분기 예시 (역할별 분기 패턴 참고용)
- [TeamHomePage.tsx](./src/modules/bank/team/TeamHomePage.tsx) — 팀장 전용 메인
- [intervention.ts](./src/modules/bank/intervention/intervention.ts) — 개입 큐 derive 로직

---

## 11. 변경 이력

- **2026-04-29**: 초기 셋업 (옵션 2 — 로그인 + 인박스 + 상세 + 알림 + 메시지 + 가심사 수용)
- **2026-04-29**: DSR 시뮬레이터 풀 기능, 자서일정 캘린더, 정산서, 상환 공유, 법무사 송부, 신규 등록, 프로필, 단지 협약 정보, 푸시 구독 골격
- **2026-04-29**: 팀장/상담사 화면 분리 (TeamHomePage 신설, 라우팅·메뉴·바텀탭 분기, assignee 필터)
- **2026-04-30**: GitHub repo 생성 + Vercel 배포 + 휴대폰 동작 검증
- **2026-04-30**: 월 실적 팀/본인/팀원별 분기, PWA 아이콘 placeholder, 개입 큐 풀 페이지

---

위임 대상자께: 이 문서로 부족한 부분 있으면 카톡·이메일 부탁드립니다. 휴가 후 천천히 응답드리겠습니다.
