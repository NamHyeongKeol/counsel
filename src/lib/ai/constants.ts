export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "deepseek";

// 1,000,000 토큰당 비용 (USD)
export const AI_MODELS = {
    "gemini-3-flash-preview": { name: "Gemini 3 Flash", shortName: "3 Flash", provider: "google" as AIProvider, pricePerMToken: { input: 0.5, output: 3 } },
    "gemini-3-pro-preview": { name: "Gemini 3 Pro", shortName: "3 Pro", provider: "google" as AIProvider, pricePerMToken: { input: 2, output: 12 } },
    "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", shortName: "Opus 4.5", provider: "anthropic" as AIProvider, pricePerMToken: { input: 5, output: 25 } },
    "gpt-5.2": { name: "GPT 5.2", shortName: "GPT 5.2", provider: "openai" as AIProvider, pricePerMToken: { input: 1.75, output: 14 } },
} as const;

// 현재 원달러 환율 (KRW/USD) - 표시용
export const CURRENT_EXCHANGE_RATE = 1480;

// 토큰 수와 모델을 기반으로 비용 계산 (USD)
export function calculateCost(modelId: AIModelId, inputTokens: number | null, outputTokens: number | null): number | null {
    if (inputTokens == null || outputTokens == null) return null;
    const model = AI_MODELS[modelId];
    if (!model) return null;
    const inputCost = (inputTokens / 1_000_000) * model.pricePerMToken.input;
    const outputCost = (outputTokens / 1_000_000) * model.pricePerMToken.output;
    return inputCost + outputCost;
}

export type AIModelId = keyof typeof AI_MODELS;

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface ChatOptions {
    messages: Message[];
    modelId?: AIModelId;
    provider?: AIProvider;
    systemPrompt?: string;
}

export interface ChatResult {
    content: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
}

export interface StreamCallbacks {
    onChunk: (text: string) => void;
    onDone: (fullText: string, metadata: { inputTokens: number | null, outputTokens: number | null }) => void;
    onError: (error: any) => void;
}
