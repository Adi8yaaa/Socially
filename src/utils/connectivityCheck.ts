import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function checkConnectivity() {
  try {
    await auth();
    await prisma.$connect();
  } catch (error) {
    console.error("Connectivity error:", error);
    throw new Error("Connectivity error with Clerk or NeonDB");
  }
}