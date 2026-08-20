"use server";

import prisma from "@/lib/prisma";
import { messageInputSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";

export async function getConversations() {
  try {
    const userId = await getDbUserId().catch(() => null);
    if (!userId) return [];

    return await prisma.conversation
      .findMany({
        where: { participants: { some: { userId } } },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, username: true, image: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => []);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

export async function getConversation(conversationId: string) {
  try {
    const userId = await getDbUserId().catch(() => null);
    if (!userId) return null;

    const conversation = await prisma.conversation
      .findFirst({
        where: { id: conversationId, participants: { some: { userId } } },
        include: {
          participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { id: true, name: true, username: true, image: true } } },
            take: 100,
          },
        },
      })
      .catch(() => null);

    if (conversation) await markConversationRead(conversation.id).catch(() => null);
    return conversation;
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return null;
  }
}

export async function sendMessage(input: {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "GIF";
}) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const parsed = messageInputSchema.parse(input);
    if (!parsed.content && !parsed.mediaUrl) return { success: false, error: "Message cannot be empty" };

    const conversation = await prisma.$transaction(async (tx) => {
      if (parsed.conversationId) {
        const existing = await tx.conversation.findFirst({
          where: { id: parsed.conversationId, participants: { some: { userId } } },
        });
        if (!existing) throw new Error("Conversation not found");
        return existing;
      }

      if (!parsed.recipientId) throw new Error("Recipient required");
      const recipient = await tx.user.findUnique({ where: { id: parsed.recipientId }, select: { allowMessages: true } });
      if (!recipient?.allowMessages) throw new Error("Recipient is not accepting messages");

      return tx.conversation.create({
        data: {
          ownerId: userId,
          participants: { create: [{ userId }, { userId: parsed.recipientId }] },
        },
      });
    });

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: parsed.content,
          mediaUrl: parsed.mediaUrl || undefined,
          mediaType: parsed.mediaType,
          reads: { create: { userId } },
        },
      });

      await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      const recipients = await tx.conversationParticipant.findMany({
        where: { conversationId: conversation.id, NOT: { userId } },
        select: { userId: true },
      });
      await Promise.all(
        recipients.map((recipient) =>
          tx.notification.create({
            data: { type: "MESSAGE", userId: recipient.userId, creatorId: userId, messageId: created.id },
          }),
        ),
      );
      return created;
    });

    revalidatePath("/messages");
    return { success: true, conversationId: conversation.id, message };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

export async function markConversationRead(conversationId: string) {
  const userId = await getDbUserId();
  if (!userId) return { success: false };

  const now = new Date();
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: now, isTyping: false },
  });

  const unread = await prisma.message.findMany({
    where: { conversationId, senderId: { not: userId }, reads: { none: { userId } } },
    select: { id: true },
    take: 100,
  });
  await prisma.messageRead.createMany({
    data: unread.map((message) => ({ messageId: message.id, userId, readAt: now })),
    skipDuplicates: true,
  });

  return { success: true };
}

export async function setTyping(conversationId: string, isTyping: boolean) {
  const userId = await getDbUserId();
  if (!userId) return { success: false };
  await prisma.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { isTyping } });
  return { success: true };
}
