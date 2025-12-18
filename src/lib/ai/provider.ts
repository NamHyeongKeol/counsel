import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import {
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_INTIMACY_MODIFIERS,
    PROMPT_KEYS
} from "@/lib/prompts/defaults";

export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "deepseek";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatOptions {
    messages: Message[];
    provider?: AIProvider;
    intimacyLevel?: number;
}

export interface ChatResult {
    content: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
}

// DB에서 시스템 프롬프트 조회 (캐시 가능)
async function getSystemPromptFromDB(intimacyLevel: number = 1): Promise<string> {
    try {
        // 1. 시스템 프롬프트 (공통)
        const systemPrompt = await prisma.prompt.findFirst({
            where: {
                key: PROMPT_KEYS.SYSTEM,
                isActive: true,
                intimacyLevel: null,
                locale: "ko",
            },
        });

        // 2. 친밀도 modifier
        const intimacyModifier = await prisma.prompt.findFirst({
            where: {
                key: PROMPT_KEYS.INTIMACY_MODIFIER,
                isActive: true,
                intimacyLevel,
                locale: "ko",
            },
        });

        const basePrompt = systemPrompt?.content || DEFAULT_SYSTEM_PROMPT;
        const modifier = intimacyModifier?.content || DEFAULT_INTIMACY_MODIFIERS[intimacyLevel] || "";

        return `${basePrompt}\n\n${modifier}`;
    } catch (error) {
        console.error("DB 프롬프트 조회 실패, 기본값 사용:", error);
        return `${DEFAULT_SYSTEM_PROMPT}\n\n${DEFAULT_INTIMACY_MODIFIERS[intimacyLevel] || ""}`;
    }
}

// OpenAI Client (also used for Grok/xAI and Deepseek)
function getOpenAIClient(provider: AIProvider): OpenAI {
    switch (provider) {
        case "xai":
            return new OpenAI({
                apiKey: process.env.XAI_API_KEY,
                baseURL: "https://api.x.ai/v1",
            });
        case "deepseek":
            return new OpenAI({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: "https://api.deepseek.com",
            });
        default:
            return new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
    }
}

function getModelName(provider: AIProvider): string {
    switch (provider) {
        case "openai":
            return "gpt-4o";
        case "xai":
            return "grok-2-latest";
        case "deepseek":
            return "deepseek-chat";
        default:
            return "gpt-4o";
    }
}

async function chatWithOpenAI(
    messages: Message[],
    provider: AIProvider,
    systemPrompt: string
): Promise<ChatResult> {
    const client = getOpenAIClient(provider);
    const model = getModelName(provider);

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 1024,
        temperature: 0.8,
    });

    return {
        content: response.choices[0]?.message?.content || "죄송해요, 답변을 생성하는데 문제가 있었어요.",
        model,
        inputTokens: response.usage?.prompt_tokens ?? null,
        outputTokens: response.usage?.completion_tokens ?? null,
    };
}

async function chatWithAnthropic(messages: Message[], systemPrompt: string): Promise<ChatResult> {
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return {
        content: textBlock?.type === "text"
            ? textBlock.text
            : "죄송해요, 답변을 생성하는데 문제가 있었어요.",
        model: "claude-sonnet-4-20250514",
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
    };
}

async function chatWithGoogle(messages: Message[], systemPrompt: string): Promise<ChatResult> {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: systemPrompt,
    });

    // Google AI는 첫 메시지가 user여야 함 - model이면 더미 user 메시지 추가
    let adjustedMessages = [...messages];
    if (adjustedMessages.length > 0 && adjustedMessages[0].role === "assistant") {
        adjustedMessages = [
            { role: "user" as const, content: "안녕하세요" },
            ...adjustedMessages
        ];
    }

    const chat = model.startChat({
        history: adjustedMessages.slice(0, -1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        })),
    });

    const lastMessage = adjustedMessages[adjustedMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const usageMetadata = result.response.usageMetadata;

    return {
        content: result.response.text(),
        model: "gemini-3-flash-preview",
        inputTokens: usageMetadata?.promptTokenCount ?? null,
        outputTokens: usageMetadata?.candidatesTokenCount ?? null,
    };
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
    const provider = options.provider ||
        (process.env.AI_PROVIDER as AIProvider) ||
        "google";
    const intimacyLevel = options.intimacyLevel || 1;

    // DB에서 시스템 프롬프트 조회
    const systemPrompt = await getSystemPromptFromDB(intimacyLevel);

    const modelName = provider === "anthropic"
        ? "claude-sonnet-4-20250514"
        : provider === "google"
            ? "gemini-3-flash-preview"
            : getModelName(provider);

    // 🔍 서버 로그: AI 요청 정보
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [AI Request]");
    console.log("=".repeat(60));
    console.log(`📌 Provider: ${provider}`);
    console.log(`📌 Model: ${modelName}`);
    console.log(`📌 Intimacy Level: ${intimacyLevel}`);
    console.log(`📌 Messages count: ${options.messages.length}`);
    console.log("\n📝 System Prompt (첫 200자):");
    console.log(systemPrompt.slice(0, 200) + "...\n");
    console.log("💬 Conversation History:");
    options.messages.forEach((m, i) => {
        const preview = m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content;
        console.log(`  [${i + 1}] ${m.role}: ${preview}`);
    });
    console.log("=".repeat(60) + "\n");

    const startTime = Date.now();

    try {
        let result: ChatResult;
        switch (provider) {
            case "anthropic":
                result = await chatWithAnthropic(options.messages, systemPrompt);
                break;
            case "google":
                result = await chatWithGoogle(options.messages, systemPrompt);
                break;
            case "openai":
            case "xai":
            case "deepseek":
                result = await chatWithOpenAI(options.messages, provider, systemPrompt);
                break;
            default:
                result = await chatWithOpenAI(options.messages, "openai", systemPrompt);
        }

        // 🔍 서버 로그: AI 응답 정보
        const duration = Date.now() - startTime;
        console.log("\n" + "-".repeat(60));
        console.log("✅ [AI Response]");
        console.log("-".repeat(60));
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`🔢 Tokens: input=${result.inputTokens}, output=${result.outputTokens}`);
        console.log(`📝 Response (첫 200자):`);
        console.log(result.content.slice(0, 200) + (result.content.length > 200 ? "..." : ""));
        console.log("-".repeat(60) + "\n");

        return result;
    } catch (error) {
        console.error("\n❌ [AI Error]", error);
        throw new Error("AI 응답 생성 중 오류가 발생했습니다.");
    }
}
