"use server";

import prisma from "@/lib/prisma";
import { searchInputSchema } from "@/lib/validators";
import { getDbUserId } from "./user.action";

export async function searchSocially(input: { query: string; type?: "all" | "users" | "posts" | "hashtags" }) {
  const parsed = searchInputSchema.parse({ type: "all", ...input });
  const q = parsed.query.replace(/^#|^@/, "");
  const userId = await getDbUserId().catch(() => null);

  if (userId && q.length > 1) {
    await prisma.searchHistory.create({ data: { userId, query: parsed.query } }).catch(() => null);
    await prisma.analyticsEvent.create({ data: { userId, type: "SEARCH", metadata: { query: parsed.query, type: parsed.type } } }).catch(() => null);
  }

  const [users, posts, hashtags] = await Promise.all([
    parsed.type === "all" || parsed.type === "users"
      ? prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, username: true, image: true, bio: true, isVerified: true, _count: { select: { followers: true } } },
          take: 10,
        })
      : [],
    parsed.type === "all" || parsed.type === "posts"
      ? prisma.post.findMany({
          where: { status: "PUBLISHED", moderationStatus: "APPROVED", content: { contains: parsed.query, mode: "insensitive" } },
          include: { author: { select: { id: true, username: true, name: true, image: true, isVerified: true } }, _count: { select: { likes: true, comments: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [],
    parsed.type === "all" || parsed.type === "hashtags"
      ? prisma.hashtag.findMany({
          where: { tag: { contains: q.toLowerCase(), mode: "insensitive" } },
          orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
          take: 10,
        })
      : [],
  ]);

  return { users, posts, hashtags };
}

export async function getSearchSuggestions(query = "") {
  const q = query.replace(/^#|^@/, "").trim();
  const [users, hashtags] = await Promise.all([
    q
      ? prisma.user.findMany({
          where: { username: { contains: q, mode: "insensitive" } },
          select: { username: true, image: true },
          take: 5,
        })
      : [],
    prisma.hashtag.findMany({
      where: q ? { tag: { contains: q.toLowerCase(), mode: "insensitive" } } : {},
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
  ]);

  return { users, hashtags };
}

export async function getSearchHistory() {
  const userId = await getDbUserId();
  if (!userId) return [];
  return prisma.searchHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 });
}
