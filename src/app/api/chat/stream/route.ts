import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { AIModelId, calculateCost } from "@/lib/ai/constants";
import { streamChat } from "@/lib/ai/provider";

interface Message {
    role: "user" | "assistant";
    content: string;
}

// 대화 제목 생성 (AI에게 요약 요청)
async function generateConversationTitle(
    conversationId: string,
    userMessage: string,
    modelId: AIModelId
): Promise<void> {
    try {
        // Gemini에게 요약 요청
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `다음 상담 요청을 한글 10자 이내로 요약해줘. 핵심 키워드만 추출해서 짧게. 예시: "카톡 답장 고민", "고백 타이밍", "썸남 관심 분석"

유저 메시지: "${userMessage}"

요약:`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text().trim().slice(0, 20); // 최대 20자

        if (summary) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { title: summary },
            });
        }
    } catch (error) {
        console.error("대화 제목 생성 실패:", error);
        // 실패 시 원본 메시지 앞부분 사용
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: userMessage.slice(0, 15) },
        });
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

        // 대화방 정보 조회 (모델 설정 + 캐릭터 systemPrompt)
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { character: true }
        });

        const systemPrompt = conversation?.character?.systemPrompt || "당신은 친절한 상담사입니다.";
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

                                // 대화 제목 업데이트 (첫 유저 메시지인 경우 AI에게 요약 요청)
                                const userMessagesCount = previousMessages.filter(m => m.role === "user").length;
                                if (userMessagesCount <= 1) {
                                    // 비동기로 요약 요청 (응답을 기다리지 않음)
                                    generateConversationTitle(conversationId, content, modelId).catch(console.error);
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
