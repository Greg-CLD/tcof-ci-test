import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Download, Upload, Trash2, Plus, Save, LogOut, RefreshCw, Eye, Share2, Network, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isAdmin, login, logout, ADMIN_EMAIL } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
// Import removed to fix task persistence issues

interface PresetHeuristic {
  id: string;
  text: string;
  notes: string;
}

interface CoreHeuristic {
  id: string;
  name: string;
}

export default function AdminPresetEditor() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [heuristics, setHeuristics] = useState<PresetHeuristic[]>([]);
  const [coreHeuristics, setCoreHeuristics] = useState<CoreHeuristic[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  useEffect(() => {
    // Check if user is already logged in as admin
    const admin = isAdmin();
    setIsLoggedIn(admin);
    
    // Load data if logged in as admin
    if (admin) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load core heuristics from tcofTasks.json
      const coreTasksResponse = await apiRequest('GET', '/api/admin/tcof-tasks');
      const coreTasks = await coreTasksResponse.json();
      
      // Format the core heuristics
      const formattedCoreTasks = coreTasks.map((task: any) => ({
        id: task.id,
        name: task.name
      }));
      setCoreHeuristics(formattedCoreTasks);
      
      // Load preset heuristics from presetHeuristics.json
      const presetsResponse = await apiRequest('GET', '/api/admin/preset-heuristics');
      const presets = await presetsResponse.json();
      setHeuristics(presets);
      
      toast({
        title: "Data Loaded",
        description: "Loaded core tasks and preset heuristics successfully."
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
      // Set defaults if loading fails
      setHeuristics([
        { id: "H1", text: "Start slow to go fast", notes: "" },
        { id: "H2", text: "Test it small before you scale it big", notes: "" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email)) {
      setIsLoggedIn(true);
      setEmail('');
      toast({
        title: "Success",
        description: "Logged in successfully as admin.",
      });
      await loadData();
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

  const handleAddRow = () => {
    // Generate a new ID based on the highest existing ID number
    const newId = heuristics.length > 0 
      ? `H${parseInt(heuristics[heuristics.length - 1].id.substring(1)) + 1}`
      : 'H1';
    
    setHeuristics([...heuristics, { id: newId, text: '', notes: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    setHeuristics(heuristics.filter(h => h.id !== id));
  };

  const handleTextChange = (id: string, value: string) => {
    setHeuristics(heuristics.map(h => 
      h.id === id ? { ...h, text: value } : h
    ));
  };

  const handleNotesChange = (id: string, value: string) => {
    setHeuristics(heuristics.map(h => 
      h.id === id ? { ...h, notes: value } : h
    ));
  };

  const saveHeuristics = async () => {
    // Validate all heuristics have text
    const invalidHeuristics = heuristics.filter(h => !h.text.trim());
    if (invalidHeuristics.length > 0) {
      toast({
        title: "Validation Error",
        description: "All heuristics must have text (max 80 characters).",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Make the API call to save presetHeuristics.json
      const response = await apiRequest('POST', '/api/admin/preset-heuristics', heuristics);
      const result = await response.json();
      
      if (result.success) {
        setSaveMessage('Changes saved successfully!');
        toast({
          title: "Success",
          description: "Preset heuristics saved successfully!",
        });
        
        // Clear the message after 3 seconds
        setTimeout(() => {
          setSaveMessage('');
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to save heuristics');
      }
    } catch (error) {
      console.error('Error saving heuristics:', error);
      toast({
        title: "Error",
        description: "Failed to save preset heuristics.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTcofJSON = () => {
    // Create a JSON string from the core heuristics
    const dataStr = JSON.stringify(coreHeuristics, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    // Create a download link and trigger it
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataUri);
    downloadLink.setAttribute('download', `tcof_core_heuristics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    toast({
      title: "Download Complete",
      description: "Core heuristics downloaded successfully.",
    });
  };

  const uploadTcofJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This would validate and upload a new tcofTasks.json file
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        // Validate JSON structure here
        console.log('Uploaded JSON:', jsonContent);
        toast({
          title: "Success",
          description: "File uploaded successfully.",
        });
      } catch (error) {
        console.error('Invalid JSON file:', error);
        toast({
          title: "Error",
          description: "Invalid JSON format. Please upload a valid JSON file.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const togglePreview = () => {
    setIsPreviewVisible(!isPreviewVisible);
  };
  
  const handleExportGraphJSON = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/relations-export');
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `graph-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Graph data has been exported as JSON.",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Could not export graph data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
        <h1 className="text-2xl font-bold">Preset Editor</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/make-a-plan/admin/graph-explorer')} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Network className="h-4 w-4" />
            Open Graph Viewer
          </Button>
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Core Heuristics (Read-only) */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Core Heuristics (Read-only)</h2>
        <Table>
          <TableCaption>
            Core heuristics from TCOF tasks - these are displayed for reference only
          </TableCaption>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="w-1/12">ID</TableHead>
              <TableHead className="w-11/12">Heuristic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coreHeuristics.map((heuristic) => (
              <TableRow key={heuristic.id} className="bg-gray-50">
                <TableCell className="font-medium">{heuristic.id}</TableCell>
                <TableCell>{heuristic.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Editable User-Defined Heuristics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Default Personal Heuristics (Quick-Start)</h2>
        <Table>
          <TableCaption>
            Personal heuristics for Quick-Start plans (max 80 characters)
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/12">ID</TableHead>
              <TableHead className="w-7/12">Heuristic</TableHead>
              <TableHead className="w-3/12">Notes</TableHead>
              <TableHead className="w-1/12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {heuristics.map((heuristic) => (
              <TableRow key={heuristic.id}>
                <TableCell className="font-medium">{heuristic.id}</TableCell>
                <TableCell>
                  <Input
                    value={heuristic.text}
                    onChange={(e) => handleTextChange(heuristic.id, e.target.value)}
                    maxLength={80}
                    required
                  />
                </TableCell>
                <TableCell>
                  <Textarea 
                    value={heuristic.notes}
                    onChange={(e) => handleNotesChange(heuristic.id, e.target.value)}
                    rows={2}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(heuristic.id)}
                    title="Delete heuristic"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex mt-4 gap-4 items-center flex-wrap">
          <Button onClick={handleAddRow} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Heuristic
          </Button>
          <Button 
            onClick={saveHeuristics} 
            className="flex items-center gap-2 bg-tcof-teal hover:bg-tcof-teal/90"
            disabled={isLoading}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
          <Button 
            onClick={togglePreview} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isPreviewVisible ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Reload Data
          </Button>
          {saveMessage && (
            <span className="text-green-600 text-sm">{saveMessage}</span>
          )}
        </div>
      </section>

      {/* Preview Section */}
      {isPreviewVisible && (
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick-Start Preview</CardTitle>
              <CardDescription>This is how your heuristics will appear in Quick-Start plans</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Personal Heuristics</h3>
              <ul className="space-y-2">
                {heuristics.map((heuristic) => (
                  <li key={heuristic.id} className="p-3 border rounded-md bg-gray-50">
                    <div className="font-medium">{heuristic.text}</div>
                    {heuristic.notes && (
                      <div className="text-sm text-gray-600 mt-1">{heuristic.notes}</div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Admin section navigation and links */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => navigate('/make-a-plan/admin/factors')}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Manage Success Factors
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleExportGraphJSON}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Share2 className="h-4 w-4" />
            Export Graph JSON
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              // Enable debug flags for SuccessFactor task diagnostics
              // This enables comprehensive diagnostic logging targeted at the SuccessFactor task completion bug
              localStorage.setItem('debug_tasks', 'true');
              localStorage.setItem('debug_task_completion', 'true');
              localStorage.setItem('debug_task_persistence', 'true');
              localStorage.setItem('debug_task_state', 'true'); // Enable state transition tracking
              toast({
                title: "Debug Mode Enabled",
                description: "SuccessFactor task diagnostic logging activated with state transition tracking",
              });
              // Force page reload to apply debug settings
              window.location.reload();
            }}
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Enable Task Diagnostics
          </Button>
        </div>
      </section>

      {/* Developer Debug Controls - Only for development & diagnostic use */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Developer Diagnostic Tools
            </CardTitle>
            <CardDescription>
              For troubleshooting issues with task persistence and data validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Developer-only: use to toggle/check granular debug flags at runtime for diagnostics */}
            {/* DebugFlagTester removed to fix task persistence issues */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}