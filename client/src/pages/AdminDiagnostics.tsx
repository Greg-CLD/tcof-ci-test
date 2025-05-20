import React, { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const UuidExtractionTest = React.lazy(() => import('@/components/debug/uuid-extraction-test'));
const DebugFlagTester = React.lazy(() => import('@/components/debug/DebugFlagTester'));

/**
 * Admin diagnostics panel for task persistence debugging
 * This page provides tools to:
 * 1. Test UUID extraction for compound task IDs
 * 2. Enable/disable debug flags for task debugging
 */
export default function AdminDiagnostics() {
  const { user } = useAuth();
  
  // Admin check
  const isAdminUser = user && user.username?.includes('admin');
  
  if (!isAdminUser) {
    return (
      <div className="container mx-auto py-8">
        <SiteHeader />
        <div className="max-w-lg mx-auto mt-12">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-center mb-6">Admin Access Required</h1>
            <p className="text-center mb-6">
              You need administrator privileges to access this page.
            </p>
            <div className="flex justify-center">
              <Link href="/all-projects">
                <Button>Return to Projects</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <SiteHeader />
      
      <div className="max-w-5xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Diagnostics Panel</h1>
          <div className="flex gap-2">
            <Link href="/make-a-plan/admin/factors">
              <Button variant="outline">Success Factor Editor</Button>
            </Link>
            <Link href="/all-projects">
              <Button variant="outline">Back to Projects</Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="uuid-extraction">
          <TabsList className="mb-4">
            <TabsTrigger value="uuid-extraction">UUID Extraction Test</TabsTrigger>
            <TabsTrigger value="debug-flags">Debug Flags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="uuid-extraction">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Task ID UUID Extraction</h2>
              <p className="text-gray-600 mb-6">
                This tool tests the UUID extraction logic used for task updates. 
                Enter a compound task ID to verify extraction works correctly.
              </p>
              
              <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto" />}>
                <UuidExtractionTest />
              </Suspense>
              
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="font-medium text-amber-800 mb-2">Use this in the browser console</h3>
                <p className="text-sm text-amber-700 mb-2">
                  You can also run this test directly in your browser console:
                </p>
                <pre className="bg-amber-100 p-2 rounded text-xs overflow-x-auto">
                  {`// Available after page load:
window.testUuidExtraction('2f565bf9-70c7-5c41-93e7-c6c4cde32312-e253fe5a');`}
                </pre>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="debug-flags">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Debug Flags</h2>
              <p className="text-gray-600 mb-6">
                Enable or disable debugging features. These flags control console logging for task operations.
              </p>
              
              <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto" />}>
                <DebugFlagTester />
              </Suspense>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}