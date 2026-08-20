"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";

export async function trackPostImpression(postId: string) {
  const userId = await getDbUserId().catch(() => null);
  await prisma.$transaction([
    prisma.post.update({ where: { id: postId }, data: { impressionCount: { increment: 1 } } }),
    prisma.analyticsEvent.create({ data: { userId, postId, type: "POST_IMPRESSION" } }),
  ]).catch(() => null);
}

export async function trackProfileView(profileUserId: string) {
  const viewerId = await getDbUserId().catch(() => null);
  if (viewerId === profileUserId) return;
  await prisma.$transaction([
    prisma.profileView.create({ data: { userId: profileUserId, viewerId } }),
    prisma.analyticsEvent.create({ data: { userId: profileUserId, type: "PROFILE_VIEW", metadata: { viewerId } } }),
  ]).catch(() => null);
}

export async function getUserAnalytics() {
  const userId = await getDbUserId();
  if (!userId) return null;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [profileViews, posts, followerGrowth, impressions, engagements] = await Promise.all([
    prisma.profileView.count({ where: { userId, viewedAt: { gte: since } } }),
    prisma.post.findMany({
      where: { authorId: userId },
      include: { _count: { select: { likes: true, comments: true, reactions: true, bookmarks: true, reposts: true } } },
      orderBy: [{ likes: { _count: "desc" } }, { comments: { _count: "desc" } }],
      take: 5,
    }),
    prisma.follows.count({ where: { followingId: userId, createdAt: { gte: since } } }),
    prisma.post.aggregate({ where: { authorId: userId }, _sum: { impressionCount: true } }),
    prisma.analyticsEvent.count({ where: { userId, type: "POST_ENGAGEMENT", createdAt: { gte: since } } }),
  ]);

  const totalImpressions = impressions._sum.impressionCount ?? 0;
  return {
    profileViews,
    followerGrowth,
    totalImpressions,
    engagementRate: totalImpressions > 0 ? Number(((engagements / totalImpressions) * 100).toFixed(2)) : 0,
    topPosts: posts,
  };
}
