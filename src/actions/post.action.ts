"use server";

import prisma from "@/lib/prisma";
import { commentInputSchema, postInputSchema } from "@/lib/validators";
import { Prisma, ReactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";
import { rankTrendingPosts } from "@/lib/ranking";

const mentionRegex = /(^|\s)@([a-zA-Z0-9_]{2,30})/g;
const hashtagRegex = /(^|\s)#([a-zA-Z0-9_]{2,50})/g;

function extractUniqueMatches(content = "", regex: RegExp) {
  return Array.from(new Set(Array.from(content.matchAll(regex)).map((match) => match[2].toLowerCase())));
}

async function createMentionNotifications(tx: Prisma.TransactionClient, content: string | undefined, creatorId: string, postId: string, commentId?: string) {
  const usernames = extractUniqueMatches(content, mentionRegex);
  if (usernames.length === 0) return;

  const users = await tx.user.findMany({
    where: { username: { in: usernames }, NOT: { id: creatorId } },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) =>
      tx.notification.create({
        data: {
          type: "MENTION",
          userId: user.id,
          creatorId,
          postId,
          commentId,
        },
      }),
    ),
  );
}

async function syncHashtags(tx: Prisma.TransactionClient, postId: string, content?: string) {
  const tags = extractUniqueMatches(content, hashtagRegex);
  if (tags.length === 0) return;

  for (const tag of tags) {
    const hashtag = await tx.hashtag.upsert({
      where: { tag },
      update: { usageCount: { increment: 1 } },
      create: { tag, usageCount: 1 },
    });

    await tx.postHashtag.upsert({
      where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      update: {},
      create: { postId, hashtagId: hashtag.id },
    });
  }
}

export async function createPost(content: string, image = "") {
  return createPostAdvanced({ content, image, status: "PUBLISHED" });
}

export async function createPostAdvanced(input: {
  content?: string;
  image?: string;
  mediaUrls?: string[];
  scheduledFor?: Date | string;
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
}) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const parsed = postInputSchema.parse(input);
    if (!parsed.content && !parsed.image && (!parsed.mediaUrls || parsed.mediaUrls.length === 0)) {
      return { success: false, error: "Add text or media before posting" };
    }

    const post = await prisma.post.create({
      data: {
        content: parsed.content,
        image: parsed.image || parsed.mediaUrls?.[0] || "",
        authorId: userId,
      },
    });

    // Optionally handle mentions if tables exist, but ignore failures for unmigrated schema
    try {
      await prisma.$transaction(async (tx) => {
        await createMentionNotifications(tx, parsed.content, userId, post.id);
      });
    } catch {
      // Ignore optional mention errors
    }

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/profile");
    return { success: true, post };
  } catch (error) {
    console.error("Failed to create post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

const postInclude = {
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      username: true,
      isVerified: true,
    },
  },
  media: { orderBy: { order: "asc" as const } },
  comments: {
    where: { parentId: null },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          image: true,
          name: true,
          isVerified: true,
        },
      },
      replies: {
        include: {
          author: { select: { id: true, username: true, image: true, name: true } },
          likes: { select: { userId: true } },
        },
        orderBy: { createdAt: "asc" as const },
        take: 3,
      },
      likes: { select: { userId: true } },
    },
    orderBy: { createdAt: "asc" as const },
    take: 20,
  },
  likes: { select: { userId: true } },
  reactions: { select: { userId: true, type: true } },
  reactionCounts: true,
  bookmarks: { select: { userId: true } },
  _count: {
    select: {
      likes: true,
      comments: true,
      bookmarks: true,
      reposts: true,
    },
  },
};

export async function getPosts(mode: "recent" | "trending" | "following" | "liked" = "recent") {
  try {
    const userId = await getDbUserId().catch(() => null);
    const followingIds =
      mode === "following" && userId
        ? (
            await prisma.follows
              .findMany({
                where: { followerId: userId },
                select: { followingId: true },
              })
              .catch(() => [])
          ).map((follow) => follow.followingId).concat(userId)
        : [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const whereClause: Prisma.PostWhereInput =
      mode === "following"
        ? { authorId: { in: followingIds } }
        : mode === "liked" && userId
        ? { likes: { some: { userId } } }
        : mode === "trending"
        ? { status: "PUBLISHED", createdAt: { gte: sevenDaysAgo } }
        : {};

    let rawPosts = await prisma.post
      .findMany({
        where: whereClause,
        include: postInclude,
        orderBy: { createdAt: "desc" },
        take: mode === "trending" ? 50 : 50,
      })
      .catch(() => []);

    // Fallback for trending if few posts in last 7 days
    if (mode === "trending" && rawPosts.length < 5) {
      rawPosts = await prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          include: postInclude,
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        .catch(() => []);
    }

    let posts = rawPosts.map((post) => ({
      ...post,
      likes: post.likes ?? [],
      comments: post.comments ?? [],
      bookmarks: post.bookmarks ?? [],
      reactions: post.reactions ?? [],
      reactionCounts: post.reactionCounts ?? [],
      shareCount: post.shareCount ?? 0,
      _count: {
        likes: post._count?.likes ?? 0,
        comments: post._count?.comments ?? 0,
        bookmarks: post._count?.bookmarks ?? 0,
        reposts: post._count?.reposts ?? 0,
      },
    }));

    if (mode === "trending") {
      posts = rankTrendingPosts(posts);
    }

    return posts;
  } catch (error) {
    console.error("Error in getPosts", error);
    return [];
  }
}

export async function getDraftsAndScheduledPosts() {
  const userId = await getDbUserId();
  if (!userId) return [];

  return prisma.post.findMany({
    where: { authorId: userId, status: { in: ["DRAFT", "SCHEDULED"] } },
    include: postInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function toggleLike(postId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const existingLike = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new Error("Post not found");

    if (existingLike) {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
    } else {
      await prisma.$transaction([
        prisma.like.create({ data: { userId, postId } }),
        ...(post.authorId !== userId
          ? [
              prisma.notification.create({
                data: { type: "LIKE", userId: post.authorId, creatorId: userId, postId },
              }),
            ]
          : []),
      ]);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return { success: false, error: "Failed to toggle like" };
  }
}

export async function setReaction(postId: string, type: ReactionType | null) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return { success: false, error: "Post not found" };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.postReaction.findUnique({ where: { userId_postId: { userId, postId } } });
      if (existing) {
        await tx.postReactionCount.updateMany({
          where: { postId, type: existing.type, count: { gt: 0 } },
          data: { count: { decrement: 1 } },
        });
      }

      if (!type) {
        if (existing) await tx.postReaction.delete({ where: { userId_postId: { userId, postId } } });
        return;
      }

      await tx.postReaction.upsert({
        where: { userId_postId: { userId, postId } },
        update: { type },
        create: { userId, postId, type },
      });
      await tx.postReactionCount.upsert({
        where: { postId_type: { postId, type } },
        update: { count: { increment: 1 } },
        create: { postId, type, count: 1 },
      });

      if (post.authorId !== userId) {
        await tx.notification.create({
          data: { type: "REACTION", userId: post.authorId, creatorId: userId, postId },
        });
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to set reaction:", error);
    return { success: false, error: "Failed to set reaction" };
  }
}

export async function createComment(postId: string, content: string, parentId?: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const parsed = commentInputSchema.parse({ postId, content, parentId });
    const post = await prisma.post.findUnique({ where: { id: parsed.postId }, select: { authorId: true } });
    if (!post) throw new Error("Post not found");

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          content: parsed.content,
          authorId: userId,
          postId: parsed.postId,
          parentId: parsed.parentId,
        },
      });

      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            type: "COMMENT",
            userId: post.authorId,
            creatorId: userId,
            postId: parsed.postId,
            commentId: newComment.id,
          },
        });
      }
      await createMentionNotifications(tx, parsed.content, userId, parsed.postId, newComment.id);
      return newComment;
    });

    revalidatePath("/");
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to create comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

export async function toggleCommentLike(commentId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const existing = await prisma.commentLike.findUnique({ where: { userId_commentId: { userId, commentId } } });
    if (existing) await prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } });
    else await prisma.commentLike.create({ data: { userId, commentId } });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle comment like:", error);
    return { success: false, error: "Failed to like comment" };
  }
}

export async function deletePost(postId: string) {
  try {
    const userId = await getDbUserId();
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new Error("Post not found");
    if (post.authorId !== userId) throw new Error("Unauthorized");

    await prisma.post.delete({ where: { id: postId } });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}

export async function repost(postId: string, content?: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const original = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!original) return { success: false, error: "Post not found" };

    await prisma.$transaction([
      prisma.post.create({ data: { authorId: userId, content, repostOfId: postId, status: "PUBLISHED", publishedAt: new Date() } }),
      prisma.post.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } }),
      ...(original.authorId !== userId
        ? [prisma.notification.create({ data: { type: "REPOST", userId: original.authorId, creatorId: userId, postId } })]
        : []),
    ]);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to repost:", error);
    return { success: false, error: "Failed to repost" };
  }
}
