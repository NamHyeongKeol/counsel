import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { UNNI_SYSTEM_PROMPT } from "@/lib/prompts/unni";

export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "deepseek";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatOptions {
    messages: Message[];
    provider?: AIProvider;
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
    provider: AIProvider
): Promise<string> {
    const client = getOpenAIClient(provider);
    const model = getModelName(provider);

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: "system", content: UNNI_SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 1024,
        temperature: 0.8,
    });

    return response.choices[0]?.message?.content || "죄송해요, 답변을 생성하는데 문제가 있었어요.";
}

async function chatWithAnthropic(messages: Message[]): Promise<string> {
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: UNNI_SYSTEM_PROMPT,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text"
        ? textBlock.text
        : "죄송해요, 답변을 생성하는데 문제가 있었어요.";
}

async function chatWithGoogle(messages: Message[]): Promise<string> {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: UNNI_SYSTEM_PROMPT,
    });

    const chat = model.startChat({
        history: messages.slice(0, -1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
}

export async function chat(options: ChatOptions): Promise<string> {
    const provider = options.provider ||
        (process.env.AI_PROVIDER as AIProvider) ||
        "openai";

    const model = provider === "anthropic"
        ? "claude-sonnet-4-20250514"
        : provider === "google"
            ? "gemini-2.0-flash"
            : getModelName(provider);

    // 🔍 서버 로그: AI 요청 정보
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [AI Request]");
    console.log("=".repeat(60));
    console.log(`📌 Provider: ${provider}`);
    console.log(`📌 Model: ${model}`);
    console.log(`📌 Messages count: ${options.messages.length}`);
    console.log("\n📝 System Prompt (첫 200자):");
    console.log(UNNI_SYSTEM_PROMPT.slice(0, 200) + "...\n");
    console.log("💬 Conversation History:");
    options.messages.forEach((m, i) => {
        const preview = m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content;
        console.log(`  [${i + 1}] ${m.role}: ${preview}`);
    });
    console.log("=".repeat(60) + "\n");

    const startTime = Date.now();

    try {
        let response: string;
        switch (provider) {
            case "anthropic":
                response = await chatWithAnthropic(options.messages);
                break;
            case "google":
                response = await chatWithGoogle(options.messages);
                break;
            case "openai":
            case "xai":
            case "deepseek":
                response = await chatWithOpenAI(options.messages, provider);
                break;
            default:
                response = await chatWithOpenAI(options.messages, "openai");
        }

        // 🔍 서버 로그: AI 응답 정보
        const duration = Date.now() - startTime;
        console.log("\n" + "-".repeat(60));
        console.log("✅ [AI Response]");
        console.log("-".repeat(60));
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response (첫 200자):`);
        console.log(response.slice(0, 200) + (response.length > 200 ? "..." : ""));
        console.log("-".repeat(60) + "\n");

        return response;
    } catch (error) {
        console.error("\n❌ [AI Error]", error);
        throw new Error("AI 응답 생성 중 오류가 발생했습니다.");
    }
}
