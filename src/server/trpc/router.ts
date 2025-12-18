import { z } from "zod";
import { router, publicProcedure } from "./init";
import { chat } from "@/lib/ai/provider";

export const appRouter = router({
    // 대화 목록 조회
    getConversations: publicProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.conversation.findMany({
                where: { userId: input.userId },
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

    // 새 대화 시작
    createConversation: publicProcedure
        .input(z.object({ userId: z.string(), title: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.conversation.create({
                data: {
                    userId: input.userId,
                    title: input.title || "새 대화",
                },
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

            // AI 응답 생성
            const aiResult = await chat({
                messages: previousMessages.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                })),
            });

            // AI 응답 저장 (모델 및 토큰 정보 포함)
            const assistantMessage = await ctx.prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    role: "assistant",
                    content: aiResult.content,
                    model: aiResult.model,
                    inputTokens: aiResult.inputTokens,
                    outputTokens: aiResult.outputTokens,
                },
            });

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

    // 대화 전체 메시지 삭제
    deleteAllMessages: publicProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.message.updateMany({
                where: { conversationId: input.conversationId },
                data: { isDeleted: true },
            });
        }),

    // 선택한 메시지 제외하고 삭제
    deleteMessagesExcept: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            keepMessageIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.message.updateMany({
                where: {
                    conversationId: input.conversationId,
                    id: { notIn: input.keepMessageIds },
                },
                data: { isDeleted: true },
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
});

export type AppRouter = typeof appRouter;

