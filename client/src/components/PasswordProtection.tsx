import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordProtectionProps {
  pageName: string;
  pageTitle: string;
  pageDescription: string;
}

export default function PasswordProtection({ pageName, pageTitle, pageDescription }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { authenticate } = useAuthProtection();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // Simulating a network delay for UX
    setTimeout(() => {
      const success = authenticate(pageName, password);
      
      if (!success) {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      
      setIsSubmitting(false);
    }, 800);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-tcof-dark">
            {pageTitle}
          </CardTitle>
          <p className="text-center text-gray-500 text-sm">{pageDescription}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Verifying...
                  </span>
                ) : (
                  'Access Content'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-gray-500">
            This content is password protected. If you've purchased access but don't have the password, please check your confirmation email or contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}