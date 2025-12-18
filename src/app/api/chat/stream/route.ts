import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { AIModelId, calculateCost } from "@/lib/ai/constants";
import { streamChat } from "@/lib/ai/provider";
import {
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_INTIMACY_MODIFIERS,
    PROMPT_KEYS
} from "@/lib/prompts/defaults";

interface Message {
    role: "user" | "assistant";
    content: string;
}

// DB에서 시스템 프롬프트 조회
async function getSystemPromptFromDB(intimacyLevel: number = 1): Promise<string> {
    try {
        const systemPrompt = await prisma.prompt.findFirst({
            where: {
                key: PROMPT_KEYS.SYSTEM,
                isActive: true,
                intimacyLevel: null,
                locale: "ko",
            },
        });

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { conversationId, content } = body;

        if (!conversationId || !content) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 사용자 메시지 저장
        const userMessage = await prisma.message.create({
            data: {
                conversationId,
                role: "user",
                content,
            },
        });

        // 이전 대화 기록 조회
        const previousMessages = await prisma.message.findMany({
            where: {
                conversationId,
                isDeleted: false,
            },
            orderBy: { createdAt: "asc" },
        });

        // 첫 메시지가 model이면 더미 user 메시지 추가
        let adjustedMessages: Message[] = previousMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));

        if (adjustedMessages.length > 0 && adjustedMessages[0].role === "assistant") {
            adjustedMessages = [
                { role: "user" as const, content: "안녕하세요" },
                ...adjustedMessages
            ];
        }

        // 시스템 프롬프트 조회 (인트로 메시지 친밀도는 기본 1)
        const systemPrompt = await getSystemPromptFromDB(1);

        // 대화방 정보 조회 (모델 설정을 위해)
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { model: true }
        });

        const modelId = (conversation?.model as AIModelId) || "gemini-3-flash-preview";

        // 전체 응답 수집 (DB 저장용)
        let fullResponse = "";
        let finalMetadata = { inputTokens: null as number | null, outputTokens: null as number | null };

        // ReadableStream 생성
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // userMessage ID 먼저 전송
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "userMessage",
                        id: userMessage.id,
                        content: userMessage.content,
                        createdAt: userMessage.createdAt,
                    })}\n\n`));

                    // AI Provider 스트리밍 호출
                    await streamChat(
                        {
                            messages: adjustedMessages,
                            modelId,
                        },
                        {
                            onChunk: (text) => {
                                fullResponse += text;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: "chunk",
                                    content: text
                                })}\n\n`));
                            },
                            onDone: async (text, metadata) => {
                                finalMetadata = metadata;

                                // 비용 계산
                                const cost = calculateCost(modelId, metadata.inputTokens, metadata.outputTokens);

                                // 응답 완료 후 DB에 저장
                                const assistantMessage = await prisma.message.create({
                                    data: {
                                        conversationId,
                                        role: "assistant",
                                        content: text,
                                        model: modelId,
                                        inputTokens: metadata.inputTokens,
                                        outputTokens: metadata.outputTokens,
                                        cost: cost,
                                    },
                                });

                                // 대화 제목 업데이트 (첫 메시지인 경우)
                                if (previousMessages.length === 1) {
                                    await prisma.conversation.update({
                                        where: { id: conversationId },
                                        data: {
                                            title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
                                        },
                                    });
                                }

                                // 완료 메시지 전송
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: "done",
                                    assistantMessageId: assistantMessage.id,
                                    createdAt: assistantMessage.createdAt,
                                    model: modelId,
                                    inputTokens: metadata.inputTokens,
                                    outputTokens: metadata.outputTokens,
                                    cost,
                                })}\n\n`));

                                controller.close();
                            },
                            onError: (error) => {
                                throw error;
                            }
                        }
                    );
                } catch (error) {
                    console.error("스트리밍 에러:", error);

                    // 에러 시에도 DB에 저장
                    const errorMessage = "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 😢";
                    const assistantMessage = await prisma.message.create({
                        data: {
                            conversationId,
                            role: "assistant",
                            content: errorMessage,
                            model: modelId,
                        },
                    });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "error",
                        content: errorMessage,
                        assistantMessageId: assistantMessage.id,
                    })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("API 에러:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
