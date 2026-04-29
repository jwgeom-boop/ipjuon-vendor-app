# 입주ON 업체용 모바일 앱 (ipjuon-vendor-app)

협약은행 상담사가 모바일에서 인박스를 확인하고 고객과 메시지를 주고받기 위한 PWA.

## 폴더 구조

```
src/
├── shell/                 # 멀티모듈 공용 (인증·API·레이아웃)
│   ├── api/               # API 클라이언트 (fetch 기반)
│   ├── auth/              # 로그인 컨텍스트 + 가드
│   └── layout/            # MobileShell, BottomNav, PageHeader
├── modules/
│   └── bank/              # 은행 모듈 (현재 유일)
│       ├── login/         # 로그인 페이지
│       ├── inbox/         # 인박스 리스트 + 상세
│       ├── notifications/ # 알림 페이지
│       ├── messages/      # 메시지 (양방향)
│       └── pre-screening/ # 가심사 수용
└── components/ui/         # shadcn 베이스 컴포넌트
```

새 업체 모듈 추가 시 `src/modules/<vendor>/` 폴더만 추가하고 `src/App.tsx` 라우터에 등록하면 됩니다.

## 셋업

```bash
npm install
npm run dev
```

기본 포트: 8082 (admin=8081, ipjuon-app=8080 충돌 방지)

## 환경변수

`.env.local`:

```
VITE_API_BASE_URL=https://banking-coroner-grader.ngrok-free.dev/api
```

ngrok URL이 바뀔 때 한 곳만 고치면 됩니다.

## 백엔드 API

기존 supabase-connect와 동일한 Spring Boot 백엔드를 재사용:

- `POST /api/auth/login` — `{ username, password }` → `{ success, token, role, bank_name, ... }`
- `GET /api/bank/consultations` — 은행 인박스 리스트
- `GET /api/consultation/:id` — 상세
- `PATCH /api/bank/consultations/:id/status` — 단계 변경
- `POST /api/bank/consultations/:id/message` — 메시지 발송

CORS: 백엔드에서 새 도메인 `ipjuon-vendor-app.vercel.app` 허용 필요.

## PWA

- `public/manifest.webmanifest` — 앱 메타데이터
- `public/sw.js` — Service Worker (push 수신 + 클릭 처리)
- 아이콘 미포함 (icon-192.png, icon-512.png 추가 필요)

## 배포 (Vercel)

```
vercel link
vercel --prod
```

환경변수 `VITE_API_BASE_URL` 을 Vercel Project Settings에 추가.

## 다음 작업

- [ ] 아이콘 자산 (icon-192.png, icon-512.png, favicon.ico)
- [ ] 푸시 구독 등록 (백엔드 VAPID 공개키 사용)
- [ ] 자서일정·정산 등 후속 워크플로
