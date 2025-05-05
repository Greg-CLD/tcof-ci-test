import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';

export default function TestAuth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user', { withCredentials: true });
      setCurrentUser(response.data);
      setAuthStatus('Logged in successfully');
    } catch (error) {
      console.log('Not logged in', error);
      setCurrentUser(null);
      setAuthStatus('Not logged in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/register', {
        username,
        password,
        email: email || undefined 
      }, { withCredentials: true });
      
      setCurrentUser(response.data);
      setAuthStatus('Registered and logged in successfully');
      
      toast({
        title: "Success",
        description: "Registered successfully",
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "Unknown error",
        variant: "destructive",
      });
      setAuthStatus('Registration failed: ' + (error.response?.data?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/login', {
        username,
        password
      }, { withCredentials: true });
      
      setCurrentUser(response.data);
      setAuthStatus('Logged in successfully');
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Unknown error",
        variant: "destructive",
      });
      setAuthStatus('Login failed: ' + (error.response?.data?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await axios.post('/api/logout', {}, { withCredentials: true });
      setCurrentUser(null);
      setAuthStatus('Logged out successfully');
      
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.response?.data?.message || "Unknown error",
        variant: "destructive",
      });
      setAuthStatus('Logout failed: ' + (error.response?.data?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Authentication Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
              <CardDescription>Current authentication status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><strong>Status:</strong> {loading ? 'Loading...' : authStatus}</div>
                {currentUser && (
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-1">User Details</h3>
                    <div><strong>ID:</strong> {currentUser.id}</div>
                    <div><strong>Username:</strong> {currentUser.username}</div>
                    <div><strong>Email:</strong> {currentUser.email || 'None'}</div>
                    <div><strong>Created:</strong> {currentUser.createdAt}</div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {currentUser ? (
                <Button onClick={handleLogout} disabled={loading}>Logout</Button>
              ) : (
                <Button onClick={checkAuthStatus} disabled={loading}>Refresh Status</Button>
              )}
            </CardFooter>
          </Card>

          {/* Auth Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Register or login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username" 
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password" 
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email (optional)" 
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleLogin} disabled={loading}>Login</Button>
              <Button onClick={handleRegister} variant="outline" disabled={loading}>Register</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}