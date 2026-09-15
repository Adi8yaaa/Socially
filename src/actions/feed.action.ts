"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";

import { rankTrendingPosts } from "@/lib/ranking";

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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [candidatePosts, mostLikedPosts, recentPosts, recommendedUsers] = await Promise.all([
      prisma.post
        .findMany({
          where: {
            status: "PUBLISHED",
            createdAt: { gte: sevenDaysAgo },
          },
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
            reactionCounts: true,
          },
          take: 50,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
            reactionCounts: true,
          },
          orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
          take: 8,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
            reactionCounts: true,
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

    // If candidatePosts in the last 7 days is small, fallback to top 30 recent published posts
    let trendingCandidates = candidatePosts;
    if (trendingCandidates.length < 5) {
      trendingCandidates = await prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
            reactionCounts: true,
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
        .catch(() => []);
    }

    const trendingPosts = rankTrendingPosts(trendingCandidates).slice(0, 8);

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
