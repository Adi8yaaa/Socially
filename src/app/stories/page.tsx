import { getActiveStories } from "@/actions/story.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressStoryBar } from "@/components/feed/ProgressStoryBar";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const users = await getActiveStories();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stories</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.length === 0 && <p className="text-sm text-muted-foreground">No active stories right now.</p>}
          {users.map((user) => (
            <div key={user.id} className="overflow-hidden rounded-md border">
              <div className="flex items-center gap-3 border-b p-3">
                <Avatar>
                  <AvatarImage src={user.image ?? "/avatar.png"} />
                </Avatar>
                <div>
                  <p className="font-medium">{user.name ?? user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="space-y-3 p-3">
                <ProgressStoryBar total={user.stories.length} />
                {user.stories[0]?.mediaType === "VIDEO" ? (
                  <video controls className="aspect-[9/16] w-full rounded-md bg-muted object-cover">
                    <source src={user.stories[0].mediaUrl} />
                  </video>
                ) : (
                  <img src={user.stories[0]?.mediaUrl} alt="Story" className="aspect-[9/16] w-full rounded-md object-cover" />
                )}
                <p className="text-sm text-muted-foreground">{user.stories[0]?.caption}</p>
                <p className="text-xs text-muted-foreground">{user.stories[0]?.views.length ?? 0} views</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
