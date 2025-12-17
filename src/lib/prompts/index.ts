/**
 * 프롬프트 관리 서비스
 * 
 * DB 우선 조회 + 코드 fallback 방식으로 프롬프트를 가져옵니다.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_INTIMACY_MODIFIERS,
    DEFAULT_GREETINGS,
    PROMPT_KEYS,
    type PromptKey,
} from './defaults';

// ============================================
// 타입 정의
// ============================================
export interface GetPromptOptions {
    key: PromptKey;
    locale?: string;
    intimacyLevel?: number | null;
}

export interface BuiltPrompt {
    systemPrompt: string;
    greeting: string;
}

interface PromptRow {
    id: string;
    key: string;
    locale: string;
    intimacyLevel: number | null;
    content: string;
    description: string | null;
    version: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// 단일 프롬프트 조회
// ============================================

/**
 * DB에서 프롬프트를 조회하고, 없으면 fallback 사용
 */
export async function getPrompt(options: GetPromptOptions): Promise<string> {
    const { key, locale = 'ko', intimacyLevel = null } = options;

    try {
        // DB에서 활성화된 프롬프트 조회 (raw SQL 사용)
        const results = await prisma.$queryRaw<PromptRow[]>`
      SELECT * FROM "Prompt" 
      WHERE key = ${key} 
        AND locale = ${locale} 
        AND ("intimacyLevel" = ${intimacyLevel} OR (${intimacyLevel} IS NULL AND "intimacyLevel" IS NULL))
        AND "isActive" = true
      ORDER BY version DESC
      LIMIT 1
    `;

        if (results && results.length > 0) {
            return results[0].content;
        }
    } catch (error) {
        console.warn(`[PromptService] DB 조회 실패, fallback 사용: ${error}`);
    }

    // Fallback: 코드에 정의된 기본값 사용
    return getFallbackPrompt(key, intimacyLevel);
}

/**
 * Fallback 프롬프트 반환
 */
function getFallbackPrompt(key: PromptKey, intimacyLevel: number | null): string {
    switch (key) {
        case PROMPT_KEYS.SYSTEM:
            return DEFAULT_SYSTEM_PROMPT;

        case PROMPT_KEYS.INTIMACY_MODIFIER:
            return DEFAULT_INTIMACY_MODIFIERS[intimacyLevel ?? 1] ?? DEFAULT_INTIMACY_MODIFIERS[1];

        case PROMPT_KEYS.GREETING:
            return DEFAULT_GREETINGS[intimacyLevel ?? 1] ?? DEFAULT_GREETINGS[1];

        default:
            console.warn(`[PromptService] 알 수 없는 프롬프트 키: ${key}`);
            return '';
    }
}

// ============================================
// 조합된 프롬프트 조회
// ============================================

/**
 * 시스템 프롬프트와 친밀도 modifier를 조합하여 반환
 */
export async function buildSystemPrompt(
    intimacyLevel: number = 1,
    locale: string = 'ko'
): Promise<string> {
    const [systemPrompt, intimacyModifier] = await Promise.all([
        getPrompt({ key: PROMPT_KEYS.SYSTEM, locale }),
        getPrompt({ key: PROMPT_KEYS.INTIMACY_MODIFIER, locale, intimacyLevel }),
    ]);

    return `${systemPrompt}\n\n${intimacyModifier}`;
}

/**
 * 인사말 조회
 */
export async function getGreeting(
    intimacyLevel: number = 1,
    locale: string = 'ko'
): Promise<string> {
    return getPrompt({ key: PROMPT_KEYS.GREETING, locale, intimacyLevel });
}

/**
 * 전체 프롬프트 세트 조회 (시스템 프롬프트 + 인사말)
 */
export async function getFullPromptSet(
    intimacyLevel: number = 1,
    locale: string = 'ko'
): Promise<BuiltPrompt> {
    const [systemPrompt, greeting] = await Promise.all([
        buildSystemPrompt(intimacyLevel, locale),
        getGreeting(intimacyLevel, locale),
    ]);

    return { systemPrompt, greeting };
}

// ============================================
// 캐싱 (선택적 - 성능 최적화)
// ============================================

const promptCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

function getCacheKey(key: PromptKey, locale: string, intimacyLevel: number | null): string {
    return `${key}:${locale}:${intimacyLevel ?? 'null'}`;
}

/**
 * 캐시를 사용하는 프롬프트 조회 (성능 중요 시 사용)
 */
export async function getPromptCached(options: GetPromptOptions): Promise<string> {
    const { key, locale = 'ko', intimacyLevel = null } = options;
    const cacheKey = getCacheKey(key, locale, intimacyLevel);

    const cached = promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.content;
    }

    const content = await getPrompt(options);
    promptCache.set(cacheKey, { content, timestamp: Date.now() });

    return content;
}

/**
 * 캐시 무효화 (프롬프트 수정 시 호출)
 */
export function invalidatePromptCache(
    key?: PromptKey,
    locale?: string,
    intimacyLevel?: number | null
): void {
    if (!key) {
        // 전체 캐시 클리어
        promptCache.clear();
        return;
    }

    const cacheKey = getCacheKey(key, locale ?? 'ko', intimacyLevel ?? null);
    promptCache.delete(cacheKey);
}

// Re-export types and constants
export { PROMPT_KEYS, type PromptKey } from './defaults';
