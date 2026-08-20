"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";

export async function getExploreData() {
  const userId = await getDbUserId().catch(() => null);
  const followingIds = userId
    ? (await prisma.follows.findMany({ where: { followerId: userId }, select: { followingId: true } })).map((follow) => follow.followingId)
    : [];

  const [trendingPosts, mostLikedPosts, recentPosts, recommendedUsers, trendingHashtags] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
      include: { author: { select: { id: true, name: true, username: true, image: true, isVerified: true } }, _count: { select: { likes: true, comments: true, reposts: true } } },
      orderBy: [{ comments: { _count: "desc" } }, { likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
      include: { author: { select: { id: true, name: true, username: true, image: true, isVerified: true } }, _count: { select: { likes: true, comments: true } } },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
      include: { author: { select: { id: true, name: true, username: true, image: true, isVerified: true } }, _count: { select: { likes: true, comments: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      where: {
        ...(userId
          ? {
              NOT: { id: userId },
              followers: { none: { followerId: userId } },
            }
          : {}),
      },
      select: { id: true, name: true, username: true, image: true, bio: true, isVerified: true, _count: { select: { followers: true } } },
      orderBy: { followers: { _count: "desc" } },
      take: 6,
    }),
    prisma.hashtag.findMany({ orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }], take: 12 }),
  ]);

  return {
    trendingPosts,
    mostLikedPosts,
    recentPosts,
    followingOnlyAvailable: followingIds.length > 0,
    recommendedUsers,
    trendingHashtags,
  };
}
