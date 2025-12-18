import { z } from "zod";
import { router, publicProcedure } from "./init";
import { chat } from "@/lib/ai/provider";
import { getGreeting } from "@/lib/prompts";

export const appRouter = router({
    // 대화 목록 조회 (삭제되지 않은 대화방만)
    getConversations: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.conversation.findMany({
                where: {
                    userId: input.userId,
                    isDeleted: false,
                },
                orderBy: { updatedAt: "desc" },
                include: {
                    messages: {
                        take: 1,
                        orderBy: { createdAt: "desc" },
                        where: { isDeleted: false },
                    },
                },
            });
        }),

    // 새 대화 시작 (인트로 메시지 자동 생성)
    createConversation: publicProcedure
        .input(z.object({
            userId: z.string(),
            title: z.string().optional(),
            // greeting prop은 이제 클라이언트에서 주지 않아도 서버에서 DB 값을 찾아 넣음
            greeting: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const conversation = await ctx.prisma.conversation.create({
                data: {
                    userId: input.userId,
                    title: input.title || "새 대화",
                },
            });

            // 인트로 메시지 자동 추가
            const greetingContent = input.greeting || await getGreeting(1);

            await ctx.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    role: "assistant",
                    content: greetingContent,
                },
            });

            return conversation;
        }),

    // 대화방 삭제 (소프트 삭제)
    deleteConversation: publicProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.conversation.update({
                where: { id: input.conversationId },
                data: { isDeleted: true },
            });
        }),

    // 대화 기록 조회 (삭제되지 않은 메시지만)
    getMessages: publicProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.message.findMany({
                where: {
                    conversationId: input.conversationId,
                    isDeleted: false,
                },
                orderBy: { createdAt: "asc" },
            });
        }),

    // 메시지 전송 및 AI 응답
    sendMessage: publicProcedure
        .input(
            z.object({
                conversationId: z.string(),
                content: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // 사용자 메시지 저장
            const userMessage = await ctx.prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    role: "user",
                    content: input.content,
                },
            });

            // 이전 대화 기록 조회 (삭제되지 않은 것만)
            const previousMessages = await ctx.prisma.message.findMany({
                where: {
                    conversationId: input.conversationId,
                    isDeleted: false,
                },
                orderBy: { createdAt: "asc" },
            });

            let assistantMessage;

            try {
                // AI 응답 생성
                const aiResult = await chat({
                    messages: previousMessages.map((m) => ({
                        role: m.role as "user" | "assistant",
                        content: m.content,
                    })),
                });

                // AI 응답 저장 (모델 및 토큰 정보 포함)
                assistantMessage = await ctx.prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: "assistant",
                        content: aiResult.content,
                        model: aiResult.model,
                        inputTokens: aiResult.inputTokens,
                        outputTokens: aiResult.outputTokens,
                    },
                });
            } catch (error) {
                console.error("AI 응답 생성 실패:", error);

                // 에러 메시지도 DB에 저장 (삭제 가능하도록)
                assistantMessage = await ctx.prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: "assistant",
                        content: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 😢",
                    },
                });
            }

            // 대화 제목 업데이트 (첫 메시지인 경우)
            if (previousMessages.length === 1) {
                await ctx.prisma.conversation.update({
                    where: { id: input.conversationId },
                    data: {
                        title: input.content.slice(0, 50) + (input.content.length > 50 ? "..." : ""),
                    },
                });
            }

            return {
                userMessage,
                assistantMessage,
            };
        }),

    // 단일 메시지 삭제 (소프트 삭제)
    deleteMessage: publicProcedure
        .input(z.object({ messageId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.message.update({
                where: { id: input.messageId },
                data: { isDeleted: true },
            });
        }),

    // 선택한 메시지들 삭제
    deleteSelectedMessages: publicProcedure
        .input(z.object({
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.message.updateMany({
                where: { id: { in: input.messageIds } },
                data: { isDeleted: true },
            });
        }),

    // 인트로(인사) 메시지 생성
    createGreeting: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            content: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const content = input.content || await getGreeting(1);
            return ctx.prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    role: "assistant",
                    content: content,
                },
            });
        }),


    // 임시 유저 생성 또는 조회
    getOrCreateUser: publicProcedure
        .input(z.object({ visitorId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            let user = await ctx.prisma.user.findUnique({
                where: { id: input.visitorId },
            });

            if (!user) {
                user = await ctx.prisma.user.create({
                    data: {
                        id: input.visitorId,
                    },
                });
            }

            return user;
        }),

    // ============================================
    // 프롬프트 관리 API (Admin)
    // ============================================

    // 모든 프롬프트 조회
    getPrompts: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.prompt.findMany({
                orderBy: [
                    { key: "asc" },
                    { intimacyLevel: "asc" },
                    { locale: "asc" },
                ],
            });
        }),

    // 프롬프트 생성
    createPrompt: publicProcedure
        .input(z.object({
            key: z.string(),
            content: z.string(),
            locale: z.string().default("ko"),
            intimacyLevel: z.number().nullable().optional(),
            description: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.prompt.create({
                data: {
                    key: input.key,
                    content: input.content,
                    locale: input.locale,
                    intimacyLevel: input.intimacyLevel,
                    description: input.description,
                },
            });
        }),

    // 프롬프트 수정
    updatePrompt: publicProcedure
        .input(z.object({
            id: z.string(),
            content: z.string().optional(),
            description: z.string().nullable().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.prompt.update({
                where: { id: input.id },
                data: {
                    ...(input.content !== undefined && { content: input.content }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.isActive !== undefined && { isActive: input.isActive }),
                    version: { increment: 1 },
                },
            });
        }),
});

export type AppRouter = typeof appRouter;
