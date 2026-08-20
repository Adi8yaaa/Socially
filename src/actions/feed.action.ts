"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";

export async function getExploreData() {
  try {
    const userId = await getDbUserId().catch(() => null);
    const followingIds = userId
      ? (
          await prisma.follows
            .findMany({ where: { followerId: userId }, select: { followingId: true } })
            .catch(() => [])
        ).map((follow) => follow.followingId)
      : [];

    const trendingHashtags = await prisma.hashtag
      .findMany({ orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }], take: 12 })
      .catch(() => []);

    const [trendingPosts, mostLikedPosts, recentPosts, recommendedUsers] = await Promise.all([
      prisma.post
        .findMany({
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: [{ comments: { _count: "desc" } }, { likes: { _count: "desc" } }, { createdAt: "desc" }],
          take: 8,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
          take: 8,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
        .catch(() => []),
      prisma.user
        .findMany({
          where: {
            ...(userId
              ? {
                  NOT: { id: userId },
                  followers: { none: { followerId: userId } },
                }
              : {}),
          },
          select: { id: true, name: true, username: true, image: true, bio: true, _count: { select: { followers: true } } },
          orderBy: { followers: { _count: "desc" } },
          take: 6,
        })
        .catch(() => []),
    ]);

    return {
      trendingPosts,
      mostLikedPosts,
      recentPosts,
      followingOnlyAvailable: followingIds.length > 0,
      recommendedUsers,
      trendingHashtags,
    };
  } catch (error) {
    console.error("Error in getExploreData:", error);
    return {
      trendingPosts: [],
      mostLikedPosts: [],
      recentPosts: [],
      followingOnlyAvailable: false,
      recommendedUsers: [],
      trendingHashtags: [],
    };
  }
}
