"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";

async function requireAdmin() {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return userId;
}

export async function getAdminDashboard() {
  await requireAdmin();
  const [users, posts, reports, pendingReports, flaggedPosts] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.report.findMany({
      include: {
        reporter: { select: { id: true, username: true, image: true } },
        post: { select: { id: true, content: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.post.count({ where: { moderationStatus: { in: ["PENDING", "FLAGGED"] } } }),
  ]);

  return {
    overview: { users, posts, pendingReports, flaggedPosts, status: "healthy" },
    reports,
  };
}

export async function banUser(userId: string, reason: string, bannedUntil?: Date) {
  const reviewerId = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { status: "BANNED", banReason: reason, bannedUntil } });
  await prisma.analyticsEvent.create({ data: { userId: reviewerId, type: "POST_ENGAGEMENT", metadata: { action: "BAN_USER", targetUserId: userId } } });
  revalidatePath("/admin");
  return { success: true };
}

export async function updateReportStatus(reportId: string, status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED", notes?: string) {
  const reviewerId = await requireAdmin();
  await prisma.report.update({ where: { id: reportId }, data: { status, notes, reviewerId } });
  revalidatePath("/admin");
  return { success: true };
}
