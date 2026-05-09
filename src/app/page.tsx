import { getPosts } from "@/actions/post.action";
import { getDbUserId, syncUser } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import WhoToFollow from "@/components/WhoToFollow";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  try {
    // Synchronizes the user before loading the page
    await syncUser();

    const userPromise = currentUser();
    const dbUserIdPromise = getDbUserId();
    const postsPromise = getPosts();

    const [user, dbUserId, posts] = await Promise.all([
      userPromise,
      dbUserIdPromise,
      postsPromise,
    ]);

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
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">
          Error loading page. Please try again later.
        </p>
      </div>
    );
  }
}