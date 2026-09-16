import { BookmarkIcon, CompassIcon, HomeIcon, MessageCircleIcon, SearchIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import ModeToggle from "./ModeToggle";
import { currentUser } from "@clerk/nextjs/server";
import NotificationDropdown from "./notifications/NotificationDropdown";

async function DesktopNavbar({ username }: { username?: string }) {
  const user = await currentUser();

  return (
    <div className="hidden md:flex items-center space-x-4">
      <ModeToggle />

      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {user ? (
        <SignedIn>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/explore">
              <CompassIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Explore</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/search">
              <SearchIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Search</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/messages">
              <MessageCircleIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Messages</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/bookmarks">
              <BookmarkIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Saved</span>
            </Link>
          </Button>
          <NotificationDropdown />
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link
              href={`/profile/${
                username ?? user.username ?? user.emailAddresses[0].emailAddress.split("@")[0]
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </Button>
          <UserButton />
        </SignedIn>
      ) : (
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="default">Sign In</Button>
          </SignInButton>
        </SignedOut>
      )}
    </div>
  );
}
export default DesktopNavbar;
