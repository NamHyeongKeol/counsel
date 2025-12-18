export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "deepseek";

export const AI_MODELS = {
    "gemini-3-flash-preview": { name: "Gemini 3 Flash", provider: "google" as AIProvider },
    "gemini-3-pro-preview": { name: "Gemini 3 Pro", provider: "google" as AIProvider },
    "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", provider: "anthropic" as AIProvider },
    "gpt-5.2": { name: "GPT 5.2", provider: "openai" as AIProvider },
} as const;

export type AIModelId = keyof typeof AI_MODELS;

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface ChatOptions {
    messages: Message[];
    modelId?: AIModelId;
    provider?: AIProvider;
    intimacyLevel?: number;
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
