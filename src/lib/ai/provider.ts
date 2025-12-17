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

    try {
        switch (provider) {
            case "anthropic":
                return await chatWithAnthropic(options.messages);
            case "google":
                return await chatWithGoogle(options.messages);
            case "openai":
            case "xai":
            case "deepseek":
                return await chatWithOpenAI(options.messages, provider);
            default:
                return await chatWithOpenAI(options.messages, "openai");
        }
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw new Error("AI 응답 생성 중 오류가 발생했습니다.");
    }
}
