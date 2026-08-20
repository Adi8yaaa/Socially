"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { BotIcon, ImageIcon, Loader2Icon, SaveIcon, SendIcon } from "lucide-react";
import { Button } from "./ui/button";
import { createPostAdvanced } from "@/actions/post.action";
import toast from "react-hot-toast";
import ImageUpload from "./ImageUpload";
import { Input } from "./ui/input";
import { getAIContentAssistance } from "@/actions/ai.action";

function CreatePost() {
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const resetForm = () => {
    setContent("");
    setImageUrl("");
    setMediaUrls([]);
    setScheduledFor("");
    setShowImageUpload(false);
  };

  const handleSubmit = async (status: "PUBLISHED" | "DRAFT" | "SCHEDULED" = "PUBLISHED") => {
    if (!content.trim() && !imageUrl && mediaUrls.length === 0) return;

    setIsPosting(true);
    try {
      const result = await createPostAdvanced({
        content,
        image: imageUrl,
        mediaUrls: [...(imageUrl ? [imageUrl] : []), ...mediaUrls],
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        status: scheduledFor ? "SCHEDULED" : status,
      });
      if (result?.success) {
        resetForm();

        toast.success(status === "DRAFT" ? "Draft saved" : scheduledFor ? "Post scheduled" : "Post created successfully");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAI = async () => {
    if (!content.trim()) return;
    setIsAssisting(true);
    const result = await getAIContentAssistance("improve", content);
    if (result.success && result.result) setContent(result.result);
    else toast.error(result.error ?? "AI assistant failed");
    setIsAssisting(false);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.imageUrl || "/avatar.png"} />
            </Avatar>
            <Textarea
              placeholder="What's on your mind?"
              className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPosting}
            />
          </div>

          {(showImageUpload || imageUrl) && (
            <div className="space-y-3 border rounded-lg p-4">
              <ImageUpload
                endpoint="postImage"
                value={imageUrl}
                onChange={(url) => {
                  setImageUrl(url);
                  if (!url) setShowImageUpload(false);
                }}
              />
              <Input
                placeholder="Add another media URL for carousel, video, or GIF"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const value = event.currentTarget.value.trim();
                    if (value) {
                      setMediaUrls((urls) => [...urls, value]);
                      event.currentTarget.value = "";
                    }
                  }
                }}
              />
              {mediaUrls.length > 0 && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {mediaUrls.map((url) => (
                    <p key={url} className="truncate">{url}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => setShowImageUpload(!showImageUpload)}
                disabled={isPosting}
              >
                <ImageIcon className="size-4 mr-2" />
                Photo
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleAI} disabled={isAssisting || !content.trim()}>
                <BotIcon className="size-4 mr-2" />
                {isAssisting ? "Improving..." : "AI"}
              </Button>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="h-9 w-full sm:w-56"
                disabled={isPosting}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={(!content.trim() && !imageUrl && mediaUrls.length === 0) || isPosting}>
                <SaveIcon className="size-4 mr-2" />
                Draft
              </Button>
              <Button
                className="flex items-center"
                onClick={() => handleSubmit(scheduledFor ? "SCHEDULED" : "PUBLISHED")}
                disabled={(!content.trim() && !imageUrl && mediaUrls.length === 0) || isPosting}
              >
                {isPosting ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <SendIcon className="size-4 mr-2" />
                    {scheduledFor ? "Schedule" : "Post"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export default CreatePost;
