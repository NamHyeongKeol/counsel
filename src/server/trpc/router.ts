import { z } from "zod";
import { router, publicProcedure } from "./init";
import { chat } from "@/lib/ai/provider";
import { calculateCost, AIModelId } from "@/lib/ai/constants";

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
                    character: {
                        select: {
                            id: true,
                            name: true,
                            images: {
                                take: 1,
                                orderBy: { order: "asc" },
                            },
                        },
                    },
                },
            });
        }),

    // 단일 대화방 상세 조회
    getConversation: publicProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.conversation.findUnique({
                where: { id: input.conversationId },
                include: {
                    character: {
                        include: {
                            images: {
                                orderBy: { order: "asc" },
                                take: 1,
                            },
                        },
                    },
                },
            });
        }),

    // 새 대화 시작 (인트로 메시지 자동 생성)
    createConversation: publicProcedure
        .input(z.object({
            userId: z.string(),
            characterId: z.string(), // 필수!
            title: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 캐릭터 조회
            const character = await ctx.prisma.character.findUnique({
                where: { id: input.characterId },
            });

            if (!character) {
                throw new Error("캐릭터를 찾을 수 없습니다.");
            }

            const conversation = await ctx.prisma.conversation.create({
                data: {
                    userId: input.userId,
                    characterId: input.characterId,
                    title: input.title || `${character.name}와의 대화`,
                    model: "gemini-3-flash-preview",
                },
            });

            // 인트로 메시지 자동 추가 (캐릭터의 greeting 사용)
            await ctx.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    role: "assistant",
                    content: character.greeting,
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

                // 비용 계산
                const cost = calculateCost(
                    aiResult.model as AIModelId,
                    aiResult.inputTokens,
                    aiResult.outputTokens
                );

                // AI 응답 저장 (모델 및 토큰 정보 포함)
                assistantMessage = await ctx.prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: "assistant",
                        content: aiResult.content,
                        model: aiResult.model,
                        inputTokens: aiResult.inputTokens,
                        outputTokens: aiResult.outputTokens,
                        cost: cost,
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

    // 메시지 reaction 토글 (좋아요/싫어요)
    toggleReaction: publicProcedure
        .input(z.object({
            messageId: z.string(),
            userId: z.string(),
            type: z.enum(["like", "dislike"]),
        }))
        .mutation(async ({ ctx, input }) => {
            // 기존 리액션 확인
            const existing = await ctx.prisma.messageReaction.findUnique({
                where: {
                    messageId_userId: {
                        messageId: input.messageId,
                        userId: input.userId,
                    },
                },
            });

            if (existing) {
                if (existing.type === input.type) {
                    // 같은 타입이면 삭제 (토글 해제)
                    await ctx.prisma.messageReaction.delete({
                        where: { id: existing.id },
                    });
                    return { action: "removed", type: null };
                } else {
                    // 다른 타입이면 업데이트
                    await ctx.prisma.messageReaction.update({
                        where: { id: existing.id },
                        data: { type: input.type },
                    });
                    return { action: "updated", type: input.type };
                }
            } else {
                // 새로 생성
                await ctx.prisma.messageReaction.create({
                    data: {
                        messageId: input.messageId,
                        userId: input.userId,
                        type: input.type,
                    },
                });
                return { action: "created", type: input.type };
            }
        }),

    // 메시지 피드백 추가
    addFeedback: publicProcedure
        .input(z.object({
            messageId: z.string(),
            userId: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.messageFeedback.create({
                data: {
                    messageId: input.messageId,
                    userId: input.userId,
                    content: input.content,
                },
            });
        }),

    // 메시지 내용 수정
    updateMessage: publicProcedure
        .input(z.object({
            messageId: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.message.update({
                where: { id: input.messageId },
                data: { content: input.content },
            });
        }),

    // 리롤 - 마지막 AI 응답 재생성
    rerollMessage: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            messageId: z.string(), // 삭제할 기존 assistant 메시지 ID
        }))
        .mutation(async ({ ctx, input }) => {
            // 기존 메시지 삭제 (소프트 삭제)
            await ctx.prisma.message.update({
                where: { id: input.messageId },
                data: { isDeleted: true },
            });

            // 대화방 정보 조회 (모델, 캐릭터 정보)
            const conversation = await ctx.prisma.conversation.findUnique({
                where: { id: input.conversationId },
                include: { character: true },
            });

            if (!conversation) throw new Error("대화방을 찾을 수 없습니다.");

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
                // AI 응답 재생성
                const aiResult = await chat({
                    messages: previousMessages.map((m) => ({
                        role: m.role as "user" | "assistant",
                        content: m.content,
                    })),
                    modelId: conversation.model as AIModelId | undefined,
                    systemPrompt: conversation.character?.systemPrompt,
                });

                // 비용 계산
                const cost = calculateCost(
                    aiResult.model as AIModelId,
                    aiResult.inputTokens,
                    aiResult.outputTokens
                );

                // 새 AI 응답 저장
                assistantMessage = await ctx.prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: "assistant",
                        content: aiResult.content,
                        model: aiResult.model,
                        inputTokens: aiResult.inputTokens,
                        outputTokens: aiResult.outputTokens,
                        cost: cost,
                    },
                });
            } catch (error) {
                console.error("리롤 AI 응답 생성 실패:", error);
                assistantMessage = await ctx.prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: "assistant",
                        content: "죄송해요, 다시 생성하는 중 문제가 생겼어요. 다시 시도해주세요! 😢",
                    },
                });
            }

            return assistantMessage;
        }),

    // 인트로(인사) 메시지 생성 (대화방에 연결된 캐릭터의 greeting 사용)
    createGreeting: publicProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 대화방에 연결된 캐릭터 조회
            const conversation = await ctx.prisma.conversation.findUnique({
                where: { id: input.conversationId },
                include: { character: true },
            });

            if (!conversation?.character) {
                throw new Error("대화방에 연결된 캐릭터가 없습니다.");
            }

            return ctx.prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    role: "assistant",
                    content: conversation.character.greeting,
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


    // 대화방 모델 설정 업데이트
    updateConversationModel: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            model: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.conversation.update({
                where: { id: input.conversationId },
                data: { model: input.model },
            });
        }),

    // 대화방 제목 업데이트
    updateConversationTitle: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            title: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.conversation.update({
                where: { id: input.conversationId },
                data: { title: input.title },
            });
        }),

    // 대화방 복제
    duplicateConversation: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            userId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 원본 대화방 조회
            const original = await ctx.prisma.conversation.findUnique({
                where: { id: input.conversationId },
                include: {
                    messages: {
                        where: { isDeleted: false },
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (!original) {
                throw new Error("대화방을 찾을 수 없습니다.");
            }

            // 새 대화방 생성
            const newConversation = await ctx.prisma.conversation.create({
                data: {
                    userId: input.userId,
                    characterId: original.characterId,
                    title: original.title ? `${original.title} (복제본)` : "복제된 대화방",
                    model: original.model,
                },
            });

            // 메시지 복제
            if (original.messages.length > 0) {
                await ctx.prisma.message.createMany({
                    data: original.messages.map((m) => ({
                        conversationId: newConversation.id,
                        role: m.role,
                        content: m.content,
                        model: m.model,
                        inputTokens: m.inputTokens,
                        outputTokens: m.outputTokens,
                        cost: m.cost,
                    })),
                });
            }

            return newConversation;
        }),

    // 삭제 잠금 토글
    toggleDeleteLock: publicProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const conversation = await ctx.prisma.conversation.findUnique({
                where: { id: input.conversationId },
            });

            if (!conversation) {
                throw new Error("대화방을 찾을 수 없습니다.");
            }

            return ctx.prisma.conversation.update({
                where: { id: input.conversationId },
                data: { deleteLocked: !conversation.deleteLocked },
            });
        }),

    // 메시지 검색
    searchMessages: publicProcedure
        .input(z.object({
            conversationId: z.string(),
            query: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.message.findMany({
                where: {
                    conversationId: input.conversationId,
                    isDeleted: false,
                    content: {
                        contains: input.query,
                        mode: "insensitive",
                    },
                },
                orderBy: { createdAt: "asc" },
            });
        }),

    // ============================================
    // 캐릭터 관리 API
    // ============================================

    // 모든 캐릭터 조회
    getCharacters: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.character.findMany({
                orderBy: { createdAt: "desc" },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                    _count: {
                        select: {
                            conversations: true,
                            comments: true,
                        },
                    },
                },
            });
        }),

    // 활성 캐릭터만 조회 (내부용 - 챗에서 사용)
    getActiveCharacters: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.character.findMany({
                where: { isActive: true },
                orderBy: { createdAt: "desc" },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                },
            });
        }),

    // 공개 캐릭터 목록 (유저 탐색용)
    getPublicCharacters: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.character.findMany({
                where: { isActive: true, isPublic: true },
                orderBy: { createdAt: "desc" },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                    _count: {
                        select: {
                            conversations: true,
                            comments: true,
                        },
                    },
                },
            });
        }),

    // 공개 캐릭터 상세 조회 (유저용 - isPublic 체크)
    getPublicCharacter: publicProcedure
        .input(z.object({
            id: z.string().optional(),
            slug: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            if (!input.id && !input.slug) {
                throw new Error("id 또는 slug가 필요합니다");
            }
            return ctx.prisma.character.findFirst({
                where: {
                    ...(input.id ? { id: input.id } : { slug: input.slug }),
                    isActive: true,
                    isPublic: true,
                },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                },
            });
        }),

    // 단일 캐릭터 조회
    getCharacter: publicProcedure
        .input(z.object({
            id: z.string().optional(),
            slug: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            if (!input.id && !input.slug) {
                throw new Error("id 또는 slug가 필요합니다");
            }
            return ctx.prisma.character.findFirst({
                where: input.id ? { id: input.id } : { slug: input.slug },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                },
            });
        }),

    // 캐릭터 생성
    createCharacter: publicProcedure
        .input(z.object({
            name: z.string(),
            slug: z.string(),
            tagline: z.string().optional(),
            introduction: z.string(),
            systemPrompt: z.string(),
            greeting: z.string(),
            age: z.number().int().positive().optional(),
            imageUrls: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const character = await ctx.prisma.character.create({
                data: {
                    name: input.name,
                    slug: input.slug,
                    tagline: input.tagline,
                    introduction: input.introduction,
                    systemPrompt: input.systemPrompt,
                    greeting: input.greeting,
                    age: input.age,
                    isPublic: true, // 새 캐릭터는 기본 공개
                },
            });

            // 이미지 추가
            if (input.imageUrls && input.imageUrls.length > 0) {
                await ctx.prisma.characterImage.createMany({
                    data: input.imageUrls.map((url, index) => ({
                        characterId: character.id,
                        imageUrl: url,
                        order: index,
                    })),
                });
            }

            return ctx.prisma.character.findUnique({
                where: { id: character.id },
                include: {
                    images: {
                        orderBy: { order: "asc" },
                    },
                },
            });
        }),

    // 캐릭터 수정
    updateCharacter: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            slug: z.string().optional(),
            tagline: z.string().nullable().optional(),
            introduction: z.string().optional(),
            systemPrompt: z.string().optional(),
            greeting: z.string().optional(),
            age: z.number().int().positive().nullable().optional(),
            isActive: z.boolean().optional(),
            isPublic: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.character.update({
                where: { id },
                data: Object.fromEntries(
                    Object.entries(data).filter(([, v]) => v !== undefined)
                ),
            });
        }),

    // 캐릭터 삭제
    deleteCharacter: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.character.delete({
                where: { id: input.id },
            });
        }),

    // ============================================
    // 캐릭터 이미지 관리 API
    // ============================================

    // 이미지 추가
    addCharacterImage: publicProcedure
        .input(z.object({
            characterId: z.string(),
            imageUrl: z.string(),
            order: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 순서가 지정되지 않으면 마지막에 추가
            let order = input.order;
            if (order === undefined) {
                const lastImage = await ctx.prisma.characterImage.findFirst({
                    where: { characterId: input.characterId },
                    orderBy: { order: "desc" },
                });
                order = (lastImage?.order ?? -1) + 1;
            }

            return ctx.prisma.characterImage.create({
                data: {
                    characterId: input.characterId,
                    imageUrl: input.imageUrl,
                    order,
                },
            });
        }),

    // 이미지 삭제
    removeCharacterImage: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.characterImage.delete({
                where: { id: input.id },
            });
        }),

    // 이미지 순서 변경
    reorderCharacterImages: publicProcedure
        .input(z.object({
            characterId: z.string(),
            imageIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            const updates = input.imageIds.map((id, index) =>
                ctx.prisma.characterImage.update({
                    where: { id },
                    data: { order: index },
                })
            );
            await ctx.prisma.$transaction(updates);
            return true;
        }),

    // ============================================
    // 캐릭터 댓글 API
    // ============================================

    // 댓글 목록 조회
    getCharacterComments: publicProcedure
        .input(z.object({
            characterId: z.string(),
            limit: z.number().default(20),
            cursor: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const comments = await ctx.prisma.characterComment.findMany({
                where: { characterId: input.characterId },
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                        },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (comments.length > input.limit) {
                const nextItem = comments.pop();
                nextCursor = nextItem!.id;
            }

            return {
                comments,
                nextCursor,
            };
        }),

    // 댓글 작성
    addCharacterComment: publicProcedure
        .input(z.object({
            characterId: z.string(),
            userId: z.string(),
            content: z.string(),
            isPrivate: z.boolean().default(false),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.characterComment.create({
                data: {
                    characterId: input.characterId,
                    userId: input.userId,
                    content: input.content,
                    isPrivate: input.isPrivate,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                        },
                    },
                },
            });
        }),

    // 댓글 삭제
    deleteCharacterComment: publicProcedure
        .input(z.object({
            id: z.string(),
            userId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 본인 댓글만 삭제 가능
            const comment = await ctx.prisma.characterComment.findUnique({
                where: { id: input.id },
            });
            if (!comment || comment.userId !== input.userId) {
                throw new Error("삭제 권한이 없습니다");
            }
            return ctx.prisma.characterComment.delete({
                where: { id: input.id },
            });
        }),

    // 유저 닉네임 업데이트
    updateUserNickname: publicProcedure
        .input(z.object({
            userId: z.string(),
            nickname: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { nickname: input.nickname },
            });
        }),

    // 유저 프로필 업데이트 (온보딩)
    updateUserProfile: publicProcedure
        .input(z.object({
            userId: z.string(),
            name: z.string().optional(),
            gender: z.enum(["male", "female"]).optional(),
            age: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { userId, ...data } = input;
            return ctx.prisma.user.update({
                where: { id: userId },
                data: Object.fromEntries(
                    Object.entries(data).filter(([, v]) => v !== undefined)
                ),
            });
        }),
});

export type AppRouter = typeof appRouter;
