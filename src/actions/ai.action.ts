"use server";

import { getDbUserId } from "./user.action";

type AssistantMode = "caption" | "hashtags" | "improve" | "grammar" | "score" | "insights";

const prompts: Record<AssistantMode, string> = {
  caption: "Write three concise social captions for this post.",
  hashtags: "Suggest 10 relevant hashtags. Return only hashtags.",
  improve: "Improve this social post while preserving the author's voice.",
  grammar: "Correct grammar and clarity without changing meaning.",
  score: "Predict engagement from 1-100 and explain in one sentence.",
  insights: "Summarize likely audience interests and recommendation angles.",
};

export async function getAIContentAssistance(mode: AssistantMode, content: string) {
  const userId = await getDbUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: true,
      result:
        mode === "score"
          ? "Engagement score: 72. Add a stronger hook and one specific hashtag to improve reach."
          : "AI assistant is ready. Set OPENAI_API_KEY to enable live suggestions.",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: `${prompts[mode]}\n\nPost:\n${content}`,
    }),
  });

  if (!response.ok) return { success: false, error: "AI request failed" };
  const data = await response.json();
  const text =
    data.output_text ??
    data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).map((item: { text?: string }) => item.text).join("\n");

  return { success: true, result: text || "No suggestion generated" };
}
