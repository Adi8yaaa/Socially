"use server";

import prisma from "@/lib/prisma";
import { storyInputSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";

export async function createStory(input: { mediaUrl: string; mediaType: "IMAGE" | "VIDEO" | "GIF"; caption?: string; highlightId?: string }) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const parsed = storyInputSchema.parse(input);

    const story = await prisma.story.create({
      data: {
        ...parsed,
        authorId: userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    revalidatePath("/stories");
    return { success: true, story };
  } catch (error) {
    console.error("Error creating story:", error);
    return { success: false, error: "Failed to create story" };
  }
}

export async function getActiveStories() {
  const now = new Date();
  return prisma.user.findMany({
    where: { stories: { some: { expiresAt: { gt: now } } } },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      stories: {
        where: { expiresAt: { gt: now } },
        include: { views: { select: { viewerId: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    take: 20,
  });
}

export async function viewStory(storyId: string) {
  const viewerId = await getDbUserId();
  if (!viewerId) return { success: false };

  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
  if (!story) return { success: false };

  await prisma.$transaction([
    prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      update: { viewedAt: new Date() },
      create: { storyId, viewerId },
    }),
    ...(story.authorId !== viewerId
      ? [prisma.notification.create({ data: { type: "STORY_VIEW", userId: story.authorId, creatorId: viewerId, storyId } })]
      : []),
  ]);

  return { success: true };
}

export async function getStoryHighlights(username: string) {
  return prisma.storyHighlight.findMany({
    where: { author: { username } },
    include: { stories: { orderBy: { createdAt: "desc" }, take: 8 } },
    orderBy: { updatedAt: "desc" },
  });
}
