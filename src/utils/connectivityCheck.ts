import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function checkConnectivity() {
  try {
    await auth();
    await prisma.$connect();
  } catch (error) {
    console.error("Connectivity error:", error);
    throw new Error("Connectivity error with Clerk or NeonDB");
  }
}
