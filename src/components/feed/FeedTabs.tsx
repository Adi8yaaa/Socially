"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlameIcon, ClockIcon, UsersIcon } from "lucide-react";

interface FeedTabsProps {
  currentTab: string;
  isLoggedIn?: boolean;
}

export default function FeedTabs({ currentTab, isLoggedIn }: FeedTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "recent") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  return (
    <div className="flex items-center gap-1 border-b pb-2 mb-4">
      <button
        onClick={() => handleTabChange("recent")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentTab === "recent"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <ClockIcon className="size-3.5" />
        <span>Recent</span>
      </button>

      <button
        onClick={() => handleTabChange("trending")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentTab === "trending"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <FlameIcon className="size-3.5 text-amber-500" />
        <span>Trending</span>
      </button>

      {isLoggedIn && (
        <button
          onClick={() => handleTabChange("following")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            currentTab === "following"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <UsersIcon className="size-3.5" />
          <span>Following</span>
        </button>
      )}
    </div>
  );
}
