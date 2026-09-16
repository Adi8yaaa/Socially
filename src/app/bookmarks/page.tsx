import { getBookmarkDashboard } from "@/actions/bookmark.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const { bookmarks, collections } = await getBookmarkDashboard();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {collections.length === 0 && <p className="text-sm text-muted-foreground">Create collections from saved posts.</p>}
          {collections.map((collection) => (
            <div key={collection.id} className="rounded-md border p-4">
              <p className="font-medium">{collection.name}</p>
              <p className="text-sm text-muted-foreground">{collection._count.bookmarks} saved posts</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">No saved posts yet.</p>}
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="rounded-md border p-4">
              <Link href={`/profile/${bookmark.post.author.username}`} className="font-medium hover:underline">
                {bookmark.post.author.name ?? bookmark.post.author.username}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{bookmark.post.content}</p>
              {bookmark.collection && <p className="mt-2 text-xs text-muted-foreground">In {bookmark.collection.name}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
