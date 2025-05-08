import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Settings } from "lucide-react";
import { Link } from "wouter";

export function LoginButton() {
  return (
    <Button asChild variant="outline">
      <a href="/api/login" className="flex items-center gap-2">
        <LogIn className="w-4 h-4" />
        <span>Log In</span>
      </a>
    </Button>
  );
}

export function LogoutButton() {
  return (
    <Button asChild variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200">
      <a href="/api/logout" className="flex items-center gap-2">
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </a>
    </Button>
  );
}

export function UserMenu() {
  const { user } = useAuth();

  if (!user) {
    return <LoginButton />;
  }

  const initials = user.username ? 
    user.username.substring(0, 2).toUpperCase() : 
    "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarImage src={user.profileImageUrl || ""} alt={user.username || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start p-2 mb-2 space-x-2">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{user.username}</p>
            {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
          </div>
        </div>
        <DropdownMenuItem asChild>
          <Link to="/settings/profile" className="cursor-pointer flex w-full items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/api/logout" className="cursor-pointer flex w-full items-center text-red-500 hover:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}