import { z } from "zod";

export const optionalUrlSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || /^https?:\/\//i.test(value) || /^[\w.-]+\.[a-z]{2,}/i.test(value), {
    message: "Enter a valid URL",
  });

export const postInputSchema = z.object({
  content: z.string().trim().max(5000).optional(),
  image: z.string().trim().url().optional().or(z.literal("")),
  mediaUrls: z.array(z.string().trim().url()).max(10).default([]),
  scheduledFor: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).default("PUBLISHED"),
});

export const commentInputSchema = z.object({
  postId: z.string().cuid(),
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});

export const profileInputSchema = z.object({
  name: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  website: optionalUrlSchema,
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  skills: z.array(z.string().trim().max(40)).max(20).default([]),
  interests: z.array(z.string().trim().max(40)).max(20).default([]),
  isPrivate: z.boolean().default(false),
  allowMessages: z.boolean().default(true),
  showActivity: z.boolean().default(true),
});

export const messageInputSchema = z.object({
  conversationId: z.string().cuid().optional(),
  recipientId: z.string().cuid().optional(),
  content: z.string().trim().max(5000).optional(),
  mediaUrl: z.string().trim().url().optional().or(z.literal("")),
  mediaType: z.enum(["IMAGE", "VIDEO", "GIF"]).optional(),
});

export const searchInputSchema = z.object({
  query: z.string().trim().max(120),
  type: z.enum(["all", "users", "posts", "hashtags"]).default("all"),
});

export const collectionInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  isPrivate: z.boolean().default(true),
});

export const storyInputSchema = z.object({
  mediaUrl: z.string().trim().url(),
  mediaType: z.enum(["IMAGE", "VIDEO", "GIF"]),
  caption: z.string().trim().max(240).optional(),
  highlightId: z.string().cuid().optional(),
});
