"use client";

import { toggleBookmark } from "@/actions/bookmark.action";
import { createComment, deletePost, getPosts, repost, setReaction, toggleLike } from "@/actions/post.action";
import { SignInButton, useUser } from "@clerk/nextjs";
import type React from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { Avatar, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import { Button } from "./ui/button";
import {
  BadgeCheckIcon,
  BookmarkIcon,
  CopyIcon,
  HeartIcon,
  LaughIcon,
  LightbulbIcon,
  LogInIcon,
  MessageCircleIcon,
  Repeat2Icon,
  SendIcon,
  SmilePlusIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { Textarea } from "./ui/textarea";

type Posts = Awaited<ReturnType<typeof getPosts>>;
type Post = Posts[number];
type Reaction = "LIKE" | "LOVE" | "CELEBRATE" | "FUNNY" | "INSIGHTFUL" | "ANGRY";

const reactionOptions: { type: Reaction; label: string; icon: React.ReactNode }[] = [
  { type: "LIKE", label: "Like", icon: <ThumbsUpIcon className="size-4" /> },
  { type: "LOVE", label: "Love", icon: <HeartIcon className="size-4" /> },
  { type: "CELEBRATE", label: "Celebrate", icon: <SmilePlusIcon className="size-4" /> },
  { type: "FUNNY", label: "Funny", icon: <LaughIcon className="size-4" /> },
  { type: "INSIGHTFUL", label: "Insightful", icon: <LightbulbIcon className="size-4" /> },
  { type: "ANGRY", label: "Angry", icon: <span className="text-sm">!</span> },
];

function PostCard({ post, dbUserId }: { post: Post; dbUserId: string | null }) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState(post.likes.some((like) => like.userId === dbUserId));
  const [optimisticLikes, setOptmisticLikes] = useState(post._count.likes);
  const [hasBookmarked, setHasBookmarked] = useState(post.bookmarks.some((bookmark) => bookmark.userId === dbUserId));
  const [optimisticBookmarks, setOptimisticBookmarks] = useState(post._count.bookmarks);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(
    (post.reactions.find((reaction) => reaction.userId === dbUserId)?.type as Reaction | undefined) ?? null,
  );
  const [optimisticReposts, setOptimisticReposts] = useState(post._count.reposts + post.shareCount);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      setHasLiked((prev) => !prev);
      setOptmisticLikes((prev) => prev + (hasLiked ? -1 : 1));
      await toggleLike(post.id);
    } catch (error) {
      setOptmisticLikes(post._count.likes);
      setHasLiked(post.likes.some((like) => like.userId === dbUserId));
    } finally {
      setIsLiking(false);
    }
  };

  const handleReaction = async (reaction: Reaction) => {
    const nextReaction = selectedReaction === reaction ? null : reaction;
    setSelectedReaction(nextReaction);
    const result = await setReaction(post.id, nextReaction);
    if (!result?.success) {
      setSelectedReaction(selectedReaction);
      toast.error("Failed to update reaction");
    }
  };

  const handleBookmark = async () => {
    setHasBookmarked((previous) => !previous);
    setOptimisticBookmarks((previous) => previous + (hasBookmarked ? -1 : 1));
    const result = await toggleBookmark(post.id);
    if (!result?.success) {
      setHasBookmarked(hasBookmarked);
      setOptimisticBookmarks(post._count.bookmarks);
      toast.error("Failed to update bookmark");
    }
  };

  const handleRepost = async () => {
    const result = await repost(post.id);
    if (result?.success) {
      setOptimisticReposts((previous) => previous + 1);
      toast.success("Shared to your profile");
    } else {
      toast.error("Failed to repost");
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Post link copied");
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    try {
      setIsCommenting(true);
      const result = await createComment(post.id, newComment);
      if (result?.success) {
        toast.success("Comment posted successfully");
        setNewComment("");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const result = await deletePost(post.id);
      if (result.success) toast.success("Post deleted successfully");
      else throw new Error(result.error);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex space-x-3 sm:space-x-4">
            <Link href={`/profile/${post.author.username}`}>
              <Avatar className="size-8 sm:w-10 sm:h-10">
                <AvatarImage src={post.author.image ?? "/avatar.png"} />
              </Avatar>
            </Link>

            {/* POST HEADER & TEXT CONTENT */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate">
                  <Link
                    href={`/profile/${post.author.username}`}
                    className="inline-flex items-center gap-1 font-semibold truncate"
                  >
                    {post.author.name}
                    {post.author.isVerified && <BadgeCheckIcon className="size-4 text-blue-500" />}
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Link href={`/profile/${post.author.username}`}>@{post.author.username}</Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>
                {/* Check if current user is the post author */}
                {dbUserId === post.author.id && (
                  <DeleteAlertDialog isDeleting={isDeleting} onDelete={handleDeletePost} />
                )}
              </div>
              <p className="mt-2 text-sm text-foreground break-words">{post.content}</p>
            </div>
          </div>

          {/* POST IMAGE */}
          {(post.media.length > 0 || post.image) && (
            <div className="grid gap-2">
              {(post.media.length > 0 ? post.media : [{ id: post.id, url: post.image, type: "IMAGE" }]).map(
                (media) =>
                  media.url &&
                  (media.type === "VIDEO" ? (
                    <video key={media.id} controls className="w-full rounded-lg bg-muted">
                      <source src={media.url} />
                    </video>
                  ) : (
                    <img
                      key={media.id}
                      src={media.url}
                      alt="Post content"
                      className="w-full h-auto rounded-lg object-cover"
                    />
                  )),
              )}
            </div>
          )}

          {/* LIKE & COMMENT BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground gap-2 ${
                  hasLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
                }`}
                onClick={handleLike}
              >
                {hasLiked ? (
                  <HeartIcon className="size-5 fill-current" />
                ) : (
                  <HeartIcon className="size-5" />
                )}
                <span>{optimisticLikes}</span>
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <HeartIcon className="size-5" />
                  <span>{optimisticLikes}</span>
                </Button>
              </SignInButton>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2 hover:text-blue-500"
              onClick={() => setShowComments((prev) => !prev)}
            >
              <MessageCircleIcon
                className={`size-5 ${showComments ? "fill-blue-500 text-blue-500" : ""}`}
              />
              <span>{post.comments.length}</span>
            </Button>

            {user && (
              <div className="flex items-center gap-1 rounded-md border px-1 py-1">
                {reactionOptions.map((reaction) => (
                  <Button
                    key={reaction.type}
                    type="button"
                    variant={selectedReaction === reaction.type ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    title={reaction.label}
                    onClick={() => handleReaction(reaction.type)}
                  >
                    {reaction.icon}
                    <span className="hidden sm:inline">{reaction.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {user && (
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground gap-2 ${hasBookmarked ? "text-amber-500" : "hover:text-amber-500"}`}
                onClick={handleBookmark}
              >
                <BookmarkIcon className={`size-5 ${hasBookmarked ? "fill-current" : ""}`} />
                <span>{optimisticBookmarks}</span>
              </Button>
            )}

            {user && (
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 hover:text-emerald-500" onClick={handleRepost}>
                <Repeat2Icon className="size-5" />
                <span>{optimisticReposts}</span>
              </Button>
            )}

            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 hover:text-primary" onClick={handleCopyLink}>
              <CopyIcon className="size-5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>

          {/* COMMENTS SECTION */}
          {showComments && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                {/* DISPLAY COMMENTS */}
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="size-8 flex-shrink-0">
                      <AvatarImage src={comment.author.image ?? "/avatar.png"} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        <span className="text-sm text-muted-foreground">
                          @{comment.author.username}
                        </span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                      </div>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex space-x-3">
                  <Avatar className="size-8 flex-shrink-0">
                    <AvatarImage src={user?.imageUrl || "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        className="flex items-center gap-2"
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? (
                          "Posting..."
                        ) : (
                          <>
                            <SendIcon className="size-4" />
                            Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-4 border rounded-lg bg-muted/50">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" />
                      Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export default PostCard;
