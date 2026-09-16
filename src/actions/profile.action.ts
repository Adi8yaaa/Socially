"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";
import { profileInputSchema } from "@/lib/validators";

export async function getProfileByUsername(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        location: true,
        website: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export async function getUserPosts(userId: string) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        bookmarks: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts.map((post) => ({
      ...post,
      media: (post as any).media ?? [],
      likes: post.likes ?? [],
      comments: post.comments ?? [],
      bookmarks: post.bookmarks ?? [],
      reactions: (post as any).reactions ?? [],
      reactionCounts: (post as any).reactionCounts ?? [],
      shareCount: (post as any).shareCount ?? 0,
      _count: {
        likes: post._count?.likes ?? 0,
        comments: post._count?.comments ?? 0,
        bookmarks: (post._count as any)?.bookmarks ?? 0,
        reposts: (post._count as any)?.reposts ?? 0,
      },
    }));
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return [];
  }
}

export async function getUserLikedPosts(userId: string) {
  try {
    const likedPosts = await prisma.post.findMany({
      where: {
        likes: {
          some: {
            userId,
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        bookmarks: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return likedPosts.map((post) => ({
      ...post,
      media: (post as any).media ?? [],
      likes: post.likes ?? [],
      comments: post.comments ?? [],
      bookmarks: post.bookmarks ?? [],
      reactions: (post as any).reactions ?? [],
      reactionCounts: (post as any).reactionCounts ?? [],
      shareCount: (post as any).shareCount ?? 0,
      _count: {
        likes: post._count?.likes ?? 0,
        comments: post._count?.comments ?? 0,
        bookmarks: (post._count as any)?.bookmarks ?? 0,
        reposts: (post._count as any)?.reposts ?? 0,
      },
    }));
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    return [];
  }
}

export async function updateProfile(formData: FormData) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const location = formData.get("location") as string;
    const website = formData.get("website") as string;
    const coverImage = formData.get("coverImage") as string;
    const skills = ((formData.get("skills") as string) || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const interests = ((formData.get("interests") as string) || "")
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean);
    const isPrivate = formData.get("isPrivate") === "on";
    const allowMessages = formData.get("allowMessages") !== "off";
    const showActivity = formData.get("showActivity") !== "off";
    const parsed = profileInputSchema.parse({
      name,
      bio,
      location,
      website,
      coverImage,
      skills,
      interests,
      isPrivate,
      allowMessages,
      showActivity,
    });

    const user = await prisma.user.update({
      where: { clerkId },
      data: parsed,
    });

    revalidatePath("/profile");
    return { success: true, user };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function isFollowing(userId: string) {
  try {
    const currentUserId = await getDbUserId();
    if (!currentUserId) return false;

    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    return !!follow;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}
