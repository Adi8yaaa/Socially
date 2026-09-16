import { getExploreData } from "@/actions/feed.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

import { FlameIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const data = await getExploreData();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
      <div className="space-y-6 lg:col-span-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <FlameIcon className="size-5 text-amber-500" />
              <CardTitle>Trending posts</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Ranked by engagement & recency</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.trendingPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No trending posts yet.</p>
            ) : (
              data.trendingPosts.map((post, idx) => (
                <div key={post.id} className="rounded-md border p-3 hover:bg-muted/40 transition-colors relative">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/profile/${post.author.username}`} className="font-medium hover:underline text-sm">
                      {post.author.name ?? post.author.username}
                    </Link>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      #{idx + 1} Trending
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {post._count.likes} likes · {post._count.comments} comments · {post._count.reposts} reposts
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentPosts.map((post) => (
              <div key={post.id} className="rounded-md border p-3">
                <Link href={`/profile/${post.author.username}`} className="font-medium hover:underline">
                  {post.author.name ?? post.author.username}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {post._count.likes} likes · {post._count.comments} comments
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <aside className="space-y-6 lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Recommended users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recommendedUsers.map((user) => (
              <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.image ?? "/avatar.png"} />
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name ?? user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username} · {user._count.followers} followers</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trending hashtags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.trendingHashtags.map((hashtag) => (
              <Link key={hashtag.id} href={`/search?q=%23${hashtag.tag}`} className="rounded-md bg-muted px-3 py-1 text-sm hover:bg-muted/70">
                #{hashtag.tag}
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
