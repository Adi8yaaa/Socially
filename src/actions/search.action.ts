"use server";

import prisma from "@/lib/prisma";
import { searchInputSchema } from "@/lib/validators";
import { getDbUserId } from "./user.action";

export async function searchSocially(input: { query: string; type?: "all" | "users" | "posts" | "hashtags" }) {
  try {
    const parsed = searchInputSchema.parse({ type: "all", ...input });
    const q = parsed.query.replace(/^#|^@/, "");
    const userId = await getDbUserId().catch(() => null);

    if (userId && q.length > 1) {
      await prisma.searchHistory.create({ data: { userId, query: parsed.query } }).catch(() => null);
      await prisma.analyticsEvent.create({ data: { userId, type: "SEARCH", metadata: { query: parsed.query, type: parsed.type } } }).catch(() => null);
    }

    const [users, posts, hashtags] = await Promise.all([
      parsed.type === "all" || parsed.type === "users"
        ? prisma.user
            .findMany({
              where: {
                OR: [
                  { username: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                  { bio: { contains: q, mode: "insensitive" } },
                ],
              },
              select: { id: true, name: true, username: true, image: true, bio: true, _count: { select: { followers: true } } },
              take: 10,
            })
            .catch(() => [])
        : [],
      parsed.type === "all" || parsed.type === "posts"
        ? prisma.post
            .findMany({
              where: { content: { contains: parsed.query, mode: "insensitive" } },
              include: { author: { select: { id: true, username: true, name: true, image: true } }, _count: { select: { likes: true, comments: true } } },
              orderBy: { createdAt: "desc" },
              take: 10,
            })
            .catch(() => [])
        : [],
      parsed.type === "all" || parsed.type === "hashtags"
        ? prisma.hashtag
            .findMany({
              where: { tag: { contains: q.toLowerCase(), mode: "insensitive" } },
              orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
              take: 10,
            })
            .catch(() => [])
        : [],
    ]);

    return { users, posts, hashtags };
  } catch (error) {
    console.error("Error in searchSocially:", error);
    return { users: [], posts: [], hashtags: [] };
  }
}

export async function getSearchSuggestions(query = "") {
  try {
    const q = query.replace(/^#|^@/, "").trim();
    const [users, hashtags] = await Promise.all([
      q
        ? prisma.user
            .findMany({
              where: { username: { contains: q, mode: "insensitive" } },
              select: { username: true, image: true },
              take: 5,
            })
            .catch(() => [])
        : [],
      prisma.hashtag
        .findMany({
          where: q ? { tag: { contains: q.toLowerCase(), mode: "insensitive" } } : {},
          orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
          take: 8,
        })
        .catch(() => []),
    ]);

    return { users, hashtags };
  } catch (error) {
    console.error("Error in getSearchSuggestions:", error);
    return { users: [], hashtags: [] };
  }
}

export async function getSearchHistory() {
  try {
    const userId = await getDbUserId().catch(() => null);
    if (!userId) return [];
    return await prisma.searchHistory
      .findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 })
      .catch(() => []);
  } catch (error) {
    console.error("Error in getSearchHistory:", error);
    return [];
  }
}
