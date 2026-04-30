# 입주ON 업체 모바일 앱 (ipjuon-vendor-app)

협약은행 팀장·상담사가 외근·이동 중 사용하는 모바일 PWA. 기존 PC 사이트의 모바일 보조판.

> 휴가 인수인계용 상세 문서: **[HANDOFF.md](./HANDOFF.md)**

## 빠른 시작

```bash
npm install
npm run dev          # 포트 8082
```

브라우저 → http://localhost:8082 → `hana` / `hana2024!` 로 팀장 로그인 (또는 `hana01` / `hana01_2024!` 상담사)

## 라이브 / 배포

- **Production**: https://ipjuon-vendor-app.vercel.app
- **GitHub**: https://github.com/jwgeom-boop/ipjuon-vendor-app
- **Vercel 프로젝트**: https://vercel.com/jwgeom-boops-projects/ipjuon-vendor-app
- main 브랜치 push 시 자동 배포

## 환경변수

`.env.local` (gitignored):

```
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8090
```

→ 로컬 dev: vite proxy로 백엔드 직접 호출 (CORS 우회)

Vercel:
```
VITE_API_BASE_URL=https://armadillo-perkiness-routing.ngrok-free.dev/api
```

→ ngrok URL은 동적이라 재시작 시 갱신 필요. 안정 URL은 Cloudflare Tunnel 또는 ngrok Personal로 전환 권장.

## 폴더 구조

```
src/
├── shell/                 # 공용 (인증·API·레이아웃·푸시)
│   ├── api/               # fetch 기반 클라이언트 + ApiError
│   ├── auth/              # AuthContext + RequireAuth 라우터 가드
│   ├── layout/            # MobileShell·FullScreenShell·BottomNav·PageHeader
│   └── push/              # Web Push 구독 hook + UI
└── modules/
    └── bank/              # 은행 모듈 (현재 유일)
        ├── inbox/         # 인박스 리스트·상세·KPI·TaskBox
        ├── messages/      # 양방향 채팅
        ├── pre-screening/ # 가심사 수용 (apply 단계)
        ├── signing/       # 자서 일정 캘린더 (result/예약)
        ├── settlement/    # 정산서 read-only (실행/완료)
        ├── share/         # 상환 안내문 + 법무사 송부 (Web Share API)
        ├── notifications/ # 알림 + 푸시 설정
        ├── tools/         # DSR 시뮬레이터 (스트레스 DSR 풀버전)
        ├── customers/     # 신규 고객 등록 시트
        ├── profile/       # 프로필 + 비밀번호 변경
        ├── performance/   # 월 실적 (팀/본인/팀원별)
        ├── complex/       # 단지 협약 정보 조회
        ├── intervention/  # 개입 큐 (취소요청·실행임박·정체·미상담)
        ├── dsr/           # DSR 계산 엔진
        └── team/          # TeamHomePage (팀장 전용 메인)
```

새 업종(법무사·이사·인테리어 등) 추가 시: `src/modules/<vendor>/` 폴더 + 라우터 등록.

## 역할별 화면

| 역할 | 첫 화면 | 바텀탭 | 특징 |
|---|---|---|---|
| 팀장 (`bank_manager`) | `/team` (TeamHomePage) | 팀 홈·인박스·알림·DSR (4개) | 팀원별 KPI·신규큐·개입큐·assignee 필터 |
| 상담사 (`bank_consultant`) | `/inbox` | 인박스·알림·DSR (3개) | 본인 건만 |

## 기술 스택

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui (Radix 기반)
- TanStack React Query
- React Router DOM 6
- 내장 fetch (axios·supabase 의존성 없음)
- PWA (manifest + service worker)

백엔드(`ipjuon-backend`, branch `redesign-v3`)는 Spring Boot 3 / JPA / PostgreSQL / 포트 8090. vendor-app은 백엔드 API만 소비하며 코드 수정 안 함.

## 백엔드 API (주요)

```
POST  /api/auth/login                                → JWT 발급
GET   /api/bank/consultations                        → 인박스 (팀장: 팀 전체 / 상담사: 본인)
GET   /api/consultation/:id                          → 상세
PUT   /api/bank/consultations/:id                    → 상담 수정 (manager 등)
PATCH /api/bank/consultations/:id/status             → 단계 변경
PUT   /api/bank/consultations/:id/signing-calendar   → 자서 캘린더 설정
POST  /api/bank/consultations/:id/confirm-signing-... → 자서 확정
POST  /api/bank/consultations/:id/message            → 메시지 발송
POST  /api/auth/change-password                      → 비밀번호 변경
GET   /api/v4/complex-templates                      → 단지 템플릿
GET   /api/b2c/push-subscriptions/public-key         → VAPID 공개키
```

## PWA

- `public/manifest.webmanifest` — 앱 메타데이터
- `public/sw.js` — Service Worker (push 수신 + 클릭 처리)
- 아이콘: placeholder("은" 텍스트, 검은 배경) — 실서비스 시 교체 권장

## 빌드

```bash
npm run build       # → dist/
npm run preview     # 빌드 결과 로컬 확인
```

## 휴가 인수인계 시

[HANDOFF.md](./HANDOFF.md) 참고. 다음 항목 포함:
- 5개 시스템 URL · 시드 계정 · GitHub repo
- 알려진 백엔드 변경 필요 사항 (vendor push, assign API, CORS)
- 운영 모니터링 (UptimeRobot)
- 권한 위임 절차
