import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Loader2, Save, Clock, ArrowLeft, User, FileDown, Edit, Trash2, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/pdf-utils";
import { 
  GoalMap, 
  CynefinSelection as CynefinSelectionType, 
  TcofJourney 
} from "@shared/schema";

export default function ProfilePage() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("history");

  // Load the user's data history
  const {
    data: goalMaps,
    isLoading: goalMapsLoading,
    error: goalMapsError,
  } = useQuery<GoalMap[]>({
    queryKey: ["/api/goal-maps"],
    enabled: !!user,
  });

  const {
    data: cynefinSelections,
    isLoading: cynefinSelectionsLoading,
    error: cynefinSelectionsError,
  } = useQuery<CynefinSelectionType[]>({
    queryKey: ["/api/cynefin-selections"],
    enabled: !!user,
  });

  const {
    data: tcofJourneys,
    isLoading: tcofJourneysLoading,
    error: tcofJourneysError,
  } = useQuery<TcofJourney[]>({
    queryKey: ["/api/tcof-journeys"],
    enabled: !!user,
  });

  // Function to load a particular entry
  const loadEntry = (type: string, id: number) => {
    // This would be implemented to load the entry into the corresponding tool
    console.log(`Loading ${type} with ID ${id}`);
    if (type === 'goal-map') {
      setLocation("/tools/goal-mapping");
    } else if (type === 'cynefin-selection') {
      setLocation("/tools/cynefin-orientation");
    } else if (type === 'tcof-journey') {
      setLocation("/tools/tcof-journey");
    }
  };

  // Function to delete an entry
  const deleteEntry = (type: string, id: number) => {
    // This would be implemented to delete the entry
    console.log(`Deleting ${type} with ID ${id}`);
  };

  // Function to export an entry as PDF
  const exportEntry = (type: string, id: number) => {
    // This would be implemented to generate a PDF of the entry
    console.log(`Exporting ${type} with ID ${id} as PDF`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">You need to sign in to view your profile.</p>
            <Link href="/auth">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button
              variant="outline"
              className="mr-4"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-tcof-dark">My Profile</h1>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center">
                <User className="h-8 w-8 text-tcof-teal mr-4" />
                <div>
                  <CardTitle>{user.username}</CardTitle>
                  <CardDescription>
                    Account created on {user.createdAt && formatDate(new Date(user.createdAt))}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="history"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-tcof-dark mb-3">Goal Maps</h3>
                      {goalMapsLoading ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-tcof-teal" />
                          <p className="text-gray-500">Loading your goal maps...</p>
                        </div>
                      ) : goalMapsError ? (
                        <div className="p-4 rounded-md bg-red-50 text-center">
                          <p className="text-red-500">Error loading your goal maps.</p>
                        </div>
                      ) : !goalMaps || goalMaps.length === 0 ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <p className="text-gray-500">You don't have any saved goal maps yet.</p>
                          <Button 
                            className="mt-2 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                            onClick={() => setLocation("/tools/goal-mapping")}
                            size="sm"
                          >
                            Create Goal Map
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {goalMaps.map((map) => (
                            <Card key={map.id} className="overflow-hidden">
                              <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-stretch">
                                  <div className="bg-tcof-light/50 p-4 flex items-center justify-center md:w-1/5">
                                    <MapPin className="h-8 w-8 text-tcof-teal" />
                                  </div>
                                  <div className="p-4 flex-grow">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <h3 className="font-medium text-tcof-dark">
                                          {map.name}
                                        </h3>
                                        <p className="text-gray-500 flex items-center text-sm">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Last updated: {formatDate(new Date(map.lastUpdated))}
                                        </p>
                                      </div>
                                      <div className="flex mt-2 md:mt-0 space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => loadEntry("goal-map", map.id)}
                                          className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                        >
                                          <Edit className="h-3 w-3 mr-1" /> Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => exportEntry("goal-map", map.id)}
                                          className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                        >
                                          <FileDown className="h-3 w-3 mr-1" /> Export
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => deleteEntry("goal-map", map.id)}
                                          className="text-red-500 border-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium text-tcof-dark mb-3">Cynefin Selections</h3>
                      {cynefinSelectionsLoading ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-tcof-teal" />
                          <p className="text-gray-500">Loading your Cynefin selections...</p>
                        </div>
                      ) : cynefinSelectionsError ? (
                        <div className="p-4 rounded-md bg-red-50 text-center">
                          <p className="text-red-500">Error loading your Cynefin selections.</p>
                        </div>
                      ) : !cynefinSelections || cynefinSelections.length === 0 ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <p className="text-gray-500">You don't have any saved Cynefin selections yet.</p>
                          <Button 
                            className="mt-2 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                            onClick={() => setLocation("/tools/cynefin-orientation")}
                            size="sm"
                          >
                            Create Cynefin Selection
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cynefinSelections.map((selection) => (
                            <Card key={selection.id} className="overflow-hidden">
                              <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-stretch">
                                  <div className="bg-tcof-light/50 p-4 flex items-center justify-center md:w-1/5">
                                    <MapPin className="h-8 w-8 text-tcof-teal" />
                                  </div>
                                  <div className="p-4 flex-grow">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <h3 className="font-medium text-tcof-dark">
                                          {selection.name}
                                        </h3>
                                        <p className="text-gray-500 flex items-center text-sm">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Last updated: {formatDate(new Date(selection.lastUpdated))}
                                        </p>
                                      </div>
                                      <div className="flex mt-2 md:mt-0 space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => loadEntry("cynefin-selection", selection.id)}
                                          className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                        >
                                          <Edit className="h-3 w-3 mr-1" /> Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => exportEntry("cynefin-selection", selection.id)}
                                          className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                        >
                                          <FileDown className="h-3 w-3 mr-1" /> Export
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => deleteEntry("cynefin-selection", selection.id)}
                                          className="text-red-500 border-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium text-tcof-dark mb-3">TCOF Journeys</h3>
                      {tcofJourneysLoading ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-tcof-teal" />
                          <p className="text-gray-500">Loading your TCOF journeys...</p>
                        </div>
                      ) : tcofJourneysError ? (
                        <div className="p-4 rounded-md bg-red-50 text-center">
                          <p className="text-red-500">Error loading your TCOF journeys.</p>
                        </div>
                      ) : !tcofJourneys || tcofJourneys.length === 0 ? (
                        <div className="p-4 rounded-md bg-gray-50 text-center">
                          <p className="text-gray-500">You don't have any saved TCOF journeys yet.</p>
                          <Button 
                            className="mt-2 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                            onClick={() => setLocation("/tools/tcof-journey")}
                            size="sm"
                          >
                            Create TCOF Journey
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tcofJourneys.map((journey) => (
                            <Card key={journey.id} className="overflow-hidden">
                              <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-stretch">
                                  <div className="bg-tcof-light/50 p-4 flex items-center justify-center md:w-1/5">
                                    <MapPin className="h-8 w-8 text-tcof-teal" />
                                  </div>
                                  <div className="p-4 flex-grow">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <h3 className="font-medium text-tcof-dark">
                                          {journey.name}
                                        </h3>
                                        <p className="text-gray-500 flex items-center text-sm">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Last updated: {formatDate(new Date(journey.lastUpdated))}
                                        </p>
                                      </div>
                                      <div className="flex mt-2 md:mt-0 space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => loadEntry("tcof-journey", journey.id)}
                                          className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                        >
                                          <Edit className="h-3 w-3 mr-1" /> Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => exportEntry("tcof-journey", journey.id)}
                                          className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                        >
                                          <FileDown className="h-3 w-3 mr-1" /> Export
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => deleteEntry("tcof-journey", journey.id)}
                                          className="text-red-500 border-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-tcof-dark mb-3">Account Information</h3>
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="username">Username</Label>
                              <Input id="username" value={user.username} readOnly className="mt-1" />
                            </div>
                            
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input id="email" value={user.email || ""} readOnly className="mt-1" />
                            </div>
                            
                            <div>
                              <Label htmlFor="created">Account Created</Label>
                              <Input 
                                id="created" 
                                value={user.createdAt ? formatDate(new Date(user.createdAt)) : "Unknown"} 
                                readOnly 
                                className="mt-1" 
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-tcof-dark mb-3">Account Actions</h3>
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <Button
                                onClick={() => logoutMutation.mutate()}
                                variant="outline"
                                className="w-full border-red-500 text-red-500 hover:bg-red-50"
                              >
                                Sign Out
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}