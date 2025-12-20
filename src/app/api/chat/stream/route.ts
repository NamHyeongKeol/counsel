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
        const { conversationId, content, isContinue } = body;

        if (!conversationId) {
            return new Response(JSON.stringify({ error: "Missing conversationId" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // isContinue가 아닌 경우에만 content 필수
        if (!isContinue && !content) {
            return new Response(JSON.stringify({ error: "Missing content" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // isContinue가 아닌 경우에만 사용자 메시지 저장
        let userMessage = null;
        if (!isContinue && content) {
            userMessage = await prisma.message.create({
                data: {
                    conversationId,
                    role: "user",
                    content,
                },
            });
        }

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

        // 대화방 정보 조회 (모델 설정 + 캐릭터 systemPrompt + 유저 정보)
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                character: true,
                user: true, // 유저 정보도 조회
            }
        });

        // 캐릭터 기본 프롬프트
        const character = conversation?.character;
        const characterPrompt = character?.systemPrompt || "당신은 친절한 상담사입니다.";

        // 캐릭터 정보 빌드
        let characterInfo = "";
        if (character) {
            const charDetails: string[] = [];
            if (character.name) charDetails.push(`이름: ${character.name}`);
            if (character.age) charDetails.push(`나이: ${character.age}세`);
            if (character.gender) charDetails.push(`성별: ${character.gender === "male" ? "남성" : "여성"}`);
            if (character.tagline) charDetails.push(`한 줄 소개: ${character.tagline}`);
            if (character.introduction) charDetails.push(`소개:\n${character.introduction}`);

            if (charDetails.length > 0) {
                characterInfo = `## 당신의 정보 (캐릭터)\n${charDetails.join("\n")}\n\n`;
            }
        }

        // 마크다운 포맷팅 가이드 (모든 AI 모델에 적용)
        const formattingGuide = `## 응답 포맷 가이드
- **볼드 처리**: 중요한 내용은 **별표 두 개로 감싸기**
- *이탤릭/행동 묘사*: 행동이나 상황 묘사는 *별표 한 개로 감싸기* (회색 이탤릭체로 표시됨)
- 문단 구분: 엔터 두 번으로 문단 구분 (가독성 향상)

`;
        const basePrompt = characterInfo + formattingGuide + characterPrompt;

        // 유저 정보 빌드
        const user = conversation?.user;
        let userContext = "";
        if (user) {
            const userInfo: string[] = [];
            if (user.name) userInfo.push(`이름: ${user.name}`);
            if (user.gender) userInfo.push(`성별: ${user.gender === "male" ? "남성" : "여성"}`);
            if (user.age) userInfo.push(`나이: 만 ${user.age}세`);

            if (userInfo.length > 0) {
                userContext = `\n\n## 상담 대상자 정보\n${userInfo.join("\n")}`;
            }
        }

        // 최종 시스템 프롬프트 = 캐릭터 정보 + 포맷 가이드 + 캐릭터 프롬프트 + 유저 정보
        const systemPrompt = basePrompt + userContext;
        const modelId = (conversation?.model as AIModelId) || "gemini-3-flash-preview";

        // 전체 응답 수집 (DB 저장용)
        let fullResponse = "";
        let finalMetadata = { inputTokens: null as number | null, outputTokens: null as number | null };

        // ReadableStream 생성
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // isContinue가 아닌 경우에만 userMessage ID 전송
                    if (userMessage) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: "userMessage",
                            id: userMessage.id,
                            content: userMessage.content,
                            createdAt: userMessage.createdAt,
                        })}\n\n`));
                    }

                    // AI Provider 스트리밍 호출 (systemPrompt 전달!)
                    await streamChat(
                        {
                            messages: adjustedMessages,
                            modelId,
                            systemPrompt, // 🔥 여기서 전달!
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
