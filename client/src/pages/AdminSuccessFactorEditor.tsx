import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isAdmin, login, logout, ADMIN_EMAIL } from '@/lib/auth';
import SuccessFactorEditor from '@/components/admin/SuccessFactorEditor';

export default function AdminSuccessFactorEditor() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already logged in as admin
    const admin = isAdmin();
    setIsLoggedIn(admin);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email)) {
      setIsLoggedIn(true);
      setEmail('');
      toast({
        title: "Success",
        description: "Logged in successfully as admin.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    toast({
      title: "Logged Out",
      description: "Admin session ended.",
    });
  };

  // If not logged in, show the login form
  if (!isLoggedIn) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-tcof-teal hover:bg-tcof-teal/90">
                Log In
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Admin editor view
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Success Factor Editor</h1>
        <div className="flex gap-4">
          <Button onClick={() => setLocation('/make-a-plan/admin')} variant="outline">
            Preset Editor
          </Button>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      <SuccessFactorEditor />
    </div>
  );
}