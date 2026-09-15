import { getPosts } from "@/actions/post.action";
import { getDbUserId, syncUser } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import WhoToFollow from "@/components/WhoToFollow";
import FeedTabs from "@/components/feed/FeedTabs";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams?: {
    tab?: string;
  };
}

export default async function Home({ searchParams }: HomeProps) {
  try {
    await syncUser().catch(() => null);

    const user = await currentUser().catch(() => null);
    const dbUserId = user ? await getDbUserId().catch(() => null) : null;

    const rawTab = searchParams?.tab;
    const mode = rawTab === "trending" ? "trending" : rawTab === "following" ? "following" : "recent";

    const posts = await getPosts(mode).catch(() => []);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6">
          <FeedTabs currentTab={mode} isLoggedIn={!!user} />
          {user && dbUserId ? <CreatePost /> : null}
          <div className="space-y-6 mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
                <p className="font-medium text-sm">No posts found in this feed.</p>
                <p className="text-xs mt-1">Be the first to share an update!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post as any} dbUserId={dbUserId} />
              ))
            )}
          </div>
        </div>
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          {user && dbUserId ? <WhoToFollow /> : null}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in Home Page:", error);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6">
          <p className="text-muted-foreground text-center py-8">
            Unable to load feed right now. Please refresh in a moment.
          </p>
        </div>
      </div>
    );
  }
}