/**
 * 언니야 프롬프트 (deprecated)
 * 
 * ⚠️ 이 파일은 레거시 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 src/lib/prompts/index.ts의 함수를 사용하세요.
 * 
 * 예시:
 * import { buildSystemPrompt, getGreeting } from '@/lib/prompts';
 * const systemPrompt = await buildSystemPrompt(intimacyLevel);
 */

export {
    DEFAULT_SYSTEM_PROMPT as UNNI_SYSTEM_PROMPT,
    DEFAULT_GREETINGS,
} from './defaults';

// 레거시 인사말 (친밀도 1단계 기본값)
import { DEFAULT_GREETINGS } from './defaults';
export const UNNI_GREETING = DEFAULT_GREETINGS[1];
