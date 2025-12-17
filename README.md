# 언니야 - 연애 전문가가 떠먹여주는 은밀한 상담

AI 기반 연애 상담 채팅 서비스입니다. "언니"라는 캐릭터가 친밀도 레벨에 따라 말투를 바꿔가며 연애 상담을 해드립니다.

## ✨ 주요 기능

- **AI 연애 상담**: 연애 고민, 썸 타는 단계, 이별 후 마음 정리 등 다양한 연애 고민 상담
- **친밀도 시스템**: 대화가 쌓일수록 친밀도가 올라가며, 언니의 말투가 점점 친해집니다 (5단계)
- **프롬프트 관리**: DB 기반 프롬프트 관리로 재배포 없이 실시간 수정 가능
- **다중 AI 지원**: OpenAI, Claude, Gemini, Grok, Deepseek 등 다양한 AI 모델 지원
- **i18n 지원**: 다국어 프롬프트 확장 가능

## 🛠 기술 스택

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: TailwindCSS, shadcn/ui
- **Backend**: tRPC
- **Database**: PostgreSQL (Supabase), Prisma ORM
- **AI**: OpenAI / Claude / Gemini / Grok / Deepseek API 지원
- **Deployment**: Vercel + Supabase

## 🚀 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

`.env.example`을 참고하여 `.env.local` 파일을 생성하세요:

```bash
cp .env.example .env.local
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
npx prisma migrate dev

# 초기 프롬프트 데이터 삽입
npx tsx prisma/seed-prompts.ts
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어주세요.

---

## 📝 프롬프트 관리

### 프롬프트 구조

프롬프트는 DB에 저장되며, 3가지 타입이 있습니다:

| key | intimacyLevel | 설명 |
|-----|---------------|------|
| `system` | null | 공통 시스템 프롬프트 (캐릭터 설정, 상담 원칙 등) |
| `intimacy_modifier` | 1~5 | 친밀도 레벨별 말투 스타일 |
| `greeting` | 1~5 | 친밀도 레벨별 인사말 |

### 프롬프트 편집 방법

#### 방법 1: Prisma Studio (권장 👍)

```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555`가 열리면 → `Prompt` 테이블 선택 → 원하는 프롬프트의 `content` 수정

#### 방법 2: SQL 직접 실행

```sql
-- 예: 친밀도 3단계 인사말 수정
UPDATE "Prompt" 
SET content = '새로운 인사말 내용...',
    "updatedAt" = NOW()
WHERE key = 'greeting' 
  AND locale = 'ko' 
  AND "intimacyLevel" = 3;
```

#### 방법 3: Seed 파일 수정 후 재실행

`prisma/seed-prompts.ts`를 수정한 후:

```bash
npx tsx prisma/seed-prompts.ts
```

### 프롬프트 사용법 (코드)

```typescript
import { buildSystemPrompt, getGreeting, getFullPromptSet } from '@/lib/prompts';

// 친밀도 3단계의 시스템 프롬프트 (공통 + 말투 modifier 조합)
const systemPrompt = await buildSystemPrompt(3);

// 인사말만 가져오기
const greeting = await getGreeting(2);

// 전체 세트 가져오기
const { systemPrompt, greeting } = await getFullPromptSet(4);

// 캐시 활용 버전 (5분 TTL)
const cached = await getPromptCached({ key: 'system', locale: 'ko' });
```

### 새로운 언어 추가 (i18n)

```sql
-- 영어 프롬프트 추가 예시
INSERT INTO "Prompt" (id, key, locale, "intimacyLevel", content, description, version, "isActive", "createdAt", "updatedAt")
VALUES (
  'new-id-here',
  'system',
  'en',
  NULL,
  'You are "Unni", a dating expert counselor...',
  'English system prompt',
  1,
  true,
  NOW(),
  NOW()
);
```

---

## 📁 프로젝트 구조

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
│   ├── prompts/        # 프롬프트 관리
│   │   ├── index.ts    # 서비스 레이어 (DB 조회 + fallback)
│   │   ├── defaults.ts # 기본 프롬프트 (fallback용)
│   │   └── unni.ts     # 레거시 호환
│   ├── trpc/           # tRPC 클라이언트
│   └── db.ts           # Prisma 클라이언트
└── server/             # 서버 사이드 코드
    └── trpc/           # tRPC 라우터

prisma/
├── schema.prisma       # DB 스키마
├── seed-prompts.ts     # 프롬프트 시드 데이터
└── migrations/         # 마이그레이션 히스토리
```

---

## 🤖 AI 프로바이더 변경

`AI_PROVIDER` 환경변수를 변경하여 다른 AI 서비스를 사용할 수 있습니다:

| Provider | 모델 | 환경변수 |
|----------|------|----------|
| `openai` | GPT-4o | `OPENAI_API_KEY` |
| `anthropic` | Claude Sonnet 4 | `ANTHROPIC_API_KEY` |
| `google` | Gemini 2.0 Flash | `GOOGLE_API_KEY` |
| `xai` | Grok 2 | `XAI_API_KEY` |
| `deepseek` | Deepseek Chat | `DEEPSEEK_API_KEY` |

## 📜 라이선스

Private
