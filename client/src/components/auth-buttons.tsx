import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { LogOut, User } from "lucide-react";

/**
 * Renders login/logout buttons based on authentication status
 */
export function AuthButtons() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Link href="/auth">
        <Button variant="outline" size="sm">
          Login
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="text-sm text-muted-foreground hidden md:block">
        <span className="font-medium text-foreground">{user?.username}</span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout()}
        className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden md:inline">Logout</span>
      </Button>
    </div>
  );
}

/**
 * Avatar button for the logged in user
 */
export function UserAvatar() {
  const { user } = useAuth();

  if (!user) return null;

  // If user has a profile image, use it
  if (user.profileImageUrl) {
    return (
      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary">
        <img
          src={user.profileImageUrl}
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