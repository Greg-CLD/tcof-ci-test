import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as UserType } from "@shared/schema";

/**
 * Login button component
 */
export function LoginButton() {
  return (
    <Link href="/auth">
      <Button variant="outline" size="sm">
        Login
      </Button>
    </Link>
  );
}

/**
 * Renders login/logout buttons based on authentication status
 */
export function AuthButtons() {
  const { user, isAuthenticated, logoutMutation } = useAuth();

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="text-sm text-muted-foreground hidden md:block">
        <span className="font-medium text-foreground">{user?.username}</span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logoutMutation.mutate()}
        className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden md:inline">Logout</span>
      </Button>
    </div>
  );
}

/**
 * User menu dropdown component
 */
export function UserMenu() {
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <UserAvatar />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile">
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-500 focus:text-red-500" 
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Get a user's profile image from various possible sources
 */
function getUserProfileImage(user: UserType): string | null {
  // Check all the various possible profile image properties
  // @ts-ignore - handle old database format
  if (user.profileImageUrl) return user.profileImageUrl;
  if (user.avatarUrl) return user.avatarUrl;
  return null;
}

/**
 * Avatar component for the logged in user
 */
export function UserAvatar() {
  const { user } = useAuth();

  if (!user) return null;

  // Get profile image from any available source
  const profileImage = getUserProfileImage(user);
  
  // If user has a profile image, use it
  if (profileImage) {
    return (
      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary">
        <img
          src={profileImage}
          alt={`${user.username}'s avatar`}
          className="absolute w-full h-full object-cover"
        />
      </div>
    );
  }

  // Otherwise use initials or default icon
  const initials = user.username
    .split('@')[0] // Remove email domain if present
    .split(/[^a-zA-Z]/) // Split by non-alphabetic chars
    .filter(Boolean) // Remove empty parts
    .map(part => part[0]?.toUpperCase()) // Get first letter of each part
    .slice(0, 2) // Get up to 2 initials
    .join('');

  if (initials) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
        {initials}
      </div>
    );
  }

  // Fallback to user icon
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
      <User className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}