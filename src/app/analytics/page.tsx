import { getUserAnalytics } from "@/actions/analytics.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getUserAnalytics();

  if (!analytics) return <p className="text-sm text-muted-foreground">Sign in to view analytics.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile views</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.profileViews}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Post impressions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.totalImpressions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Engagement rate</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.engagementRate}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Follower growth</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">+{analytics.followerGrowth}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top performing posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analytics.topPosts.map((post) => (
            <div key={post.id} className="rounded-md border p-4">
              <p className="text-sm">{post.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {post._count.likes} likes · {post._count.comments} comments · {post._count.bookmarks} saves
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
