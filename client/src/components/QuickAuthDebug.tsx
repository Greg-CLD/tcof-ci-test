import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter, 
  CardHeader,
  CardTitle 
} from '@/components/ui/card';

export function QuickAuthDebug() {
  const { user, isAuthenticated, loginMutation, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('greg@confluity.co.uk');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!username || !password) {
      setErrorMessage('Username and password are required');
      return;
    }
    
    loginMutation.mutate(
      { username, password },
      {
        onError: (error) => {
          setErrorMessage(error.message);
        }
      }
    );
  };

  // Function to handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="fixed bottom-4 right-4 z-50 bg-white shadow-md" 
        onClick={() => setIsOpen(true)}
      >
        Auth Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Authentication Debug</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {isAuthenticated ? `Logged in as ${user?.username}` : 'Not authenticated'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isAuthenticated ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">User details:</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-24">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <Input 
                type="text" 
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {errorMessage && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}
          </form>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        {isAuthenticated ? (
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full" 
            onClick={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}