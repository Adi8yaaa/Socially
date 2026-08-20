"use server";

import prisma from "@/lib/prisma";
import { collectionInputSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";

export async function toggleBookmark(postId: string, collectionId?: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const existing = await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } });
    if (existing) {
      await prisma.bookmark.delete({ where: { userId_postId: { userId, postId } } });
    } else {
      await prisma.bookmark.create({ data: { userId, postId, collectionId } });
    }

    revalidatePath("/");
    revalidatePath("/bookmarks");
    return { success: true, bookmarked: !existing };
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Failed to update bookmark" };
  }
}

export async function createCollection(input: { name: string; description?: string; isPrivate?: boolean }) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const parsed = collectionInputSchema.parse(input);
    const collection = await prisma.collection.create({ data: { ...parsed, ownerId: userId } });
    revalidatePath("/bookmarks");
    return { success: true, collection };
  } catch (error) {
    console.error("Error creating collection:", error);
    return { success: false, error: "Failed to create collection" };
  }
}

export async function getBookmarkDashboard() {
  const userId = await getDbUserId();
  if (!userId) return { bookmarks: [], collections: [] };

  const [bookmarks, collections] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId },
      include: {
        collection: true,
        post: {
          include: {
            author: { select: { id: true, name: true, username: true, image: true, isVerified: true } },
            media: { orderBy: { order: "asc" } },
            _count: { select: { likes: true, comments: true, bookmarks: true, reposts: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collection.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { bookmarks: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { bookmarks, collections };
}
