import { getPosts } from "@/actions/post.action";
import { getDbUserId, syncUser } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import WhoToFollow from "@/components/WhoToFollow";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    await syncUser().catch(() => null);

    const user = await currentUser().catch(() => null);
    const dbUserId = user ? await getDbUserId().catch(() => null) : null;
    const posts = await getPosts().catch(() => []);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6">
          {user && dbUserId ? <CreatePost /> : null}
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} dbUserId={dbUserId} />
            ))}
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