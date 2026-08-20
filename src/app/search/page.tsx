import { getSearchHistory, getSearchSuggestions, searchSocially } from "@/actions/search.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: "all" | "users" | "posts" | "hashtags" };
}) {
  const query = searchParams.q ?? "";
  const type = searchParams.type ?? "all";
  const [results, suggestions, history] = await Promise.all([
    query ? searchSocially({ query, type }) : Promise.resolve({ users: [], posts: [], hashtags: [] }),
    getSearchSuggestions(query),
    getSearchHistory().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form className="flex gap-2">
        <Input name="q" defaultValue={query} placeholder="Search users, posts, and hashtags" />
        <input type="hidden" name="type" value={type} />
        <Button type="submit">Search</Button>
      </form>

      {!query && (
        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.length > 0 && <p className="text-sm text-muted-foreground">Recent: {history.map((item) => item.query).join(", ")}</p>}
            <div className="flex flex-wrap gap-2">
              {suggestions.hashtags.map((hashtag) => (
                <Link key={hashtag.id} href={`/search?q=%23${hashtag.tag}`} className="rounded-md bg-muted px-3 py-1 text-sm">
                  #{hashtag.tag}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {query && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.users.length === 0 && <p className="text-sm text-muted-foreground">No users found</p>}
              {results.users.map((user) => (
                <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image ?? "/avatar.png"} />
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name ?? user.username}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.posts.length === 0 && <p className="text-sm text-muted-foreground">No posts found</p>}
              {results.posts.map((post) => (
                <div key={post.id} className="rounded-md border p-3">
                  <Link href={`/profile/${post.author.username}`} className="font-medium hover:underline">
                    {post.author.name ?? post.author.username}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{post.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
