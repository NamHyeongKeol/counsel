# 언니야 - 연애 전문가가 떠먹여주는 은밀한 상담

AI 기반 연애 상담 채팅 서비스입니다.

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: TailwindCSS, shadcn/ui
- **Backend**: tRPC
- **Database**: PostgreSQL (Supabase), Prisma ORM
- **AI**: OpenAI / Claude / Gemini / Grok / Deepseek API 지원
- **Deployment**: Vercel + Supabase

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

필수 환경변수:
- `DATABASE_URL`: Supabase PostgreSQL 연결 URL
- `AI_PROVIDER`: 사용할 AI 서비스 (openai / anthropic / google / xai / deepseek)
- 해당 AI 서비스의 API 키

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어주세요.

## 배포

### Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경변수 설정 (DATABASE_URL, AI_PROVIDER, API 키들)
3. 배포

### Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Settings > Database에서 Connection String 복사
3. `DATABASE_URL` 환경변수에 설정

## 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── api/trpc/       # tRPC API 라우트
│   ├── layout.tsx      # 루트 레이아웃
│   └── page.tsx        # 메인 페이지
├── components/          # React 컴포넌트
│   ├── ui/             # shadcn/ui 컴포넌트
│   ├── ChatInterface.tsx
│   └── MessageBubble.tsx
├── lib/                 # 유틸리티
│   ├── ai/             # AI 프로바이더 추상화
│   ├── prompts/        # 언니 캐릭터 프롬프트
│   ├── trpc/           # tRPC 클라이언트
│   └── db.ts           # Prisma 클라이언트
└── server/             # 서버 사이드 코드
    └── trpc/           # tRPC 라우터
```

## AI 프로바이더 변경

`AI_PROVIDER` 환경변수를 변경하여 다른 AI 서비스를 사용할 수 있습니다:

- `openai`: OpenAI GPT-4o
- `anthropic`: Claude Sonnet 4
- `google`: Gemini 2.0 Flash
- `xai`: Grok 2
- `deepseek`: Deepseek Chat

## 라이선스

Private
