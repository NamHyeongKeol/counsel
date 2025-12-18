import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import {
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_INTIMACY_MODIFIERS,
    PROMPT_KEYS
} from "@/lib/prompts/defaults";

import {
    AIProvider,
    AI_MODELS,
    AIModelId,
    Message,
    ChatOptions,
    ChatResult,
    StreamCallbacks
} from "./constants";

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

function getTechnicalModelName(modelId: AIModelId): string {
    switch (modelId) {
        case "gemini-3-flash-preview": return "gemini-3-flash-preview";
        case "gemini-3-pro-preview": return "gemini-3-pro-preview";
        case "claude-opus-4-5-20251101": return "claude-opus-4-5-20251101";
        default: return "gemini-3-flash-preview";
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

async function chatWithAnthropic(messages: Message[], systemPrompt: string, modelId: AIModelId = "claude-opus-4-5-20251101"): Promise<ChatResult> {
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const technicalModel = getTechnicalModelName(modelId);

    const response = await client.messages.create({
        model: technicalModel,
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
        model: technicalModel,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
    };
}

async function chatWithGoogle(messages: Message[], systemPrompt: string, modelId: AIModelId = "gemini-3-flash-preview"): Promise<ChatResult> {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
    const technicalModel = getTechnicalModelName(modelId);
    const model = genAI.getGenerativeModel({
        model: technicalModel,
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
        model: technicalModel,
        inputTokens: usageMetadata?.promptTokenCount ?? null,
        outputTokens: usageMetadata?.candidatesTokenCount ?? null,
    };
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
    const modelId = options.modelId || "gemini-3-flash-preview";
    const provider = AI_MODELS[modelId]?.provider || options.provider || "google";
    const intimacyLevel = options.intimacyLevel || 1;

    // DB에서 시스템 프롬프트 조회
    const systemPrompt = await getSystemPromptFromDB(intimacyLevel);

    const technicalModel = getTechnicalModelName(modelId);

    // 🔍 서버 로그: AI 요청 정보
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [AI Request]");
    console.log("=".repeat(60));
    console.log(`📌 Provider: ${provider}`);
    console.log(`📌 Model: ${technicalModel} (ID: ${modelId})`);
    console.log(`📌 Intimacy Level: ${intimacyLevel}`);
    console.log(`📌 Messages count: ${options.messages.length}`);
    console.log("\n📝 System Prompt (첫 200자):");
    console.log(systemPrompt.slice(0, 200) + "...\n");
    console.log("=".repeat(60) + "\n");

    const startTime = Date.now();

    try {
        let result: ChatResult;
        switch (provider) {
            case "anthropic":
                result = await chatWithAnthropic(options.messages, systemPrompt, modelId);
                break;
            case "google":
                result = await chatWithGoogle(options.messages, systemPrompt, modelId);
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
        console.log("-".repeat(60) + "\n");

        return result;
    } catch (error) {
        console.error("\n❌ [AI Error]", error);
        throw new Error("AI 응답 생성 중 오류가 발생했습니다.");
    }
}

/**
 * 스트리밍 대화 통합 처리 함수
 */
export async function streamChat(options: ChatOptions, callbacks: StreamCallbacks) {
    const modelId = options.modelId || "gemini-3-flash-preview";
    const provider = AI_MODELS[modelId]?.provider || "google";
    const intimacyLevel = options.intimacyLevel || 1;

    const systemPrompt = await getSystemPromptFromDB(intimacyLevel);

    try {
        if (provider === "google") {
            await streamGoogle(options.messages, systemPrompt, modelId, callbacks);
        } else if (provider === "anthropic") {
            await streamAnthropic(options.messages, systemPrompt, modelId, callbacks);
        } else {
            // 다른 제공자는 현재 스트리밍 미구현 (필요시 추가)
            const result = await chat(options);
            callbacks.onChunk(result.content);
            callbacks.onDone(result.content, { inputTokens: result.inputTokens, outputTokens: result.outputTokens });
        }
    } catch (error) {
        callbacks.onError(error);
    }
}

async function streamGoogle(messages: Message[], systemPrompt: string, modelId: AIModelId, callbacks: StreamCallbacks) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
    const technicalModel = getTechnicalModelName(modelId);
    const model = genAI.getGenerativeModel({
        model: technicalModel,
        systemInstruction: systemPrompt,
    });

    let adjustedMessages = [...messages];
    if (adjustedMessages.length > 0 && adjustedMessages[0].role === "assistant") {
        adjustedMessages = [{ role: "user" as const, content: "안녕하세요" }, ...adjustedMessages];
    }

    const chat = model.startChat({
        history: adjustedMessages.slice(0, -1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        })),
    });

    const lastMessage = adjustedMessages[adjustedMessages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.content);

    let fullText = "";
    for await (const chunk of result.stream) {
        const text = chunk.text();
        fullText += text;
        callbacks.onChunk(text);
    }

    const response = await result.response;
    const usage = response.usageMetadata;

    callbacks.onDone(fullText, {
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
    });
}

async function streamAnthropic(messages: Message[], systemPrompt: string, modelId: AIModelId, callbacks: StreamCallbacks) {
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const technicalModel = getTechnicalModelName(modelId);

    const stream = await client.messages.create({
        model: technicalModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        stream: true,
    });

    let fullText = "";
    let inputTokens = null;
    let outputTokens = null;

    for await (const event of stream) {
        if (event.type === "message_start") {
            inputTokens = event.message.usage.input_tokens;
        } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullText += text;
                callbacks.onChunk(text);
            }
        } else if (event.type === "message_delta") {
            outputTokens = event.usage.output_tokens;
        }
    }

    callbacks.onDone(fullText, { inputTokens, outputTokens });
}
