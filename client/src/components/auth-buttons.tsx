import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

export function LoginButton() {
  const [location, setLocation] = useLocation();
  const { loginMutation } = useAuth();
  
  const navigateToAuth = () => {
    setLocation("/auth");
  };
  
  return (
    <Button 
      variant="outline"
      onClick={navigateToAuth}
      className="flex items-center gap-2"
    >
      <LogIn className="w-4 h-4" />
      <span>Log In</span>
    </Button>
  );
}

export function LogoutButton() {
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    if (logoutMutation) {
      logoutMutation.mutate();
    }
  };
  
  return (
    <Button 
      variant="outline" 
      className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 flex items-center gap-2"
      onClick={handleLogout}
    >
      <LogOut className="w-4 h-4" />
      <span>Log Out</span>
    </Button>
  );
}

export function UserMenu() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) {
    return <LoginButton />;
  }

  const initials = user.username ? 
    user.username.substring(0, 2).toUpperCase() : 
    "U";
    
  const handleLogout = () => {
    if (logoutMutation) {
      logoutMutation.mutate();
    }
  };

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
          <Link to="/profile" className="cursor-pointer flex w-full items-center">
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
        <DropdownMenuItem>
          <button 
            onClick={handleLogout}
            className="cursor-pointer flex w-full items-center text-red-500 hover:text-red-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}