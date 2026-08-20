"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function getNotifications(take = 20) {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            image: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
          },
        },
        story: {
          select: {
            id: true,
            mediaUrl: true,
            caption: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
}

export async function getUnreadNotificationCount() {
  try {
    const userId = await getDbUserId();
    if (!userId) return 0;
    return prisma.notification.count({ where: { userId, read: false } });
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return 0;
  }
}

export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false };

    await prisma.notification.updateMany({
      where: {
        userId,
        id: {
          in: notificationIds,
        },
      },
      data: {
        read: true,
      },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return { success: false };
  }
}

export async function markNotificationUnread(notificationId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false };

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: false },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification unread:", error);
    return { success: false };
  }
}
