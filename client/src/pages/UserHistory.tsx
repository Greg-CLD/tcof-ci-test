import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Loader2, MapPin, Calendar, Clock, ArrowLeft, User, FileDown, Edit, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/pdf-utils";
import { 
  GoalMap, 
  CynefinSelection as CynefinSelectionType, 
  TcofJourney 
} from "@shared/schema";

export default function UserHistory() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("goal-maps");

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
            <p className="text-gray-600 mb-6">You need to sign in to view your history.</p>
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
            <h1 className="text-3xl font-bold text-tcof-dark">Your Saved Work</h1>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="goal-maps"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="goal-maps">Goal Maps</TabsTrigger>
                  <TabsTrigger value="cynefin-selections">Cynefin Selections</TabsTrigger>
                  <TabsTrigger value="tcof-journeys">TCOF Journeys</TabsTrigger>
                </TabsList>

                <TabsContent value="goal-maps">
                  <div className="space-y-4">
                    {goalMapsLoading ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-tcof-teal" />
                        <p className="text-gray-500">Loading your goal maps...</p>
                      </div>
                    ) : goalMapsError ? (
                      <div className="p-8 rounded-md bg-red-50 text-center">
                        <p className="text-red-500">Error loading your goal maps.</p>
                      </div>
                    ) : !goalMaps || goalMaps.length === 0 ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <p className="text-gray-500 mb-4">You don't have any saved goal maps yet.</p>
                        <Button 
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          onClick={() => setLocation("/tools/goal-mapping")}
                        >
                          Create Goal Map
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {goalMaps.map((map) => (
                          <Card key={map.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                              <div className="flex flex-col md:flex-row items-stretch">
                                <div className="bg-blue-50 p-6 flex items-center justify-center md:w-1/4">
                                  <div className="text-center">
                                    <MapPin className="h-8 w-8 text-tcof-teal mx-auto mb-2" />
                                    <div className="text-sm font-medium text-tcof-dark">Goal Map</div>
                                  </div>
                                </div>
                                <div className="p-6 flex-grow">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                      <h3 className="text-lg font-medium text-tcof-dark mb-1">
                                        {map.name}
                                      </h3>
                                      <div className="flex items-center text-sm text-gray-500 mb-2">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>Created: {formatDate(new Date(map.createdAt))}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-500">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        <span>Last updated: {formatDate(new Date(map.lastUpdated))}</span>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => loadEntry("goal-map", map.id)}
                                        className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> View & Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => exportEntry("goal-map", map.id)}
                                        className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                      >
                                        <FileDown className="h-4 w-4 mr-2" /> Export
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
                </TabsContent>

                <TabsContent value="cynefin-selections">
                  <div className="space-y-4">
                    {cynefinSelectionsLoading ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-tcof-teal" />
                        <p className="text-gray-500">Loading your Cynefin selections...</p>
                      </div>
                    ) : cynefinSelectionsError ? (
                      <div className="p-8 rounded-md bg-red-50 text-center">
                        <p className="text-red-500">Error loading your Cynefin selections.</p>
                      </div>
                    ) : !cynefinSelections || cynefinSelections.length === 0 ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <p className="text-gray-500 mb-4">You don't have any saved Cynefin selections yet.</p>
                        <Button 
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          onClick={() => setLocation("/tools/cynefin-orientation")}
                        >
                          Create Cynefin Selection
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cynefinSelections.map((selection) => (
                          <Card key={selection.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                              <div className="flex flex-col md:flex-row items-stretch">
                                <div className="bg-green-50 p-6 flex items-center justify-center md:w-1/4">
                                  <div className="text-center">
                                    <MapPin className="h-8 w-8 text-tcof-teal mx-auto mb-2" />
                                    <div className="text-sm font-medium text-tcof-dark">Cynefin Selection</div>
                                  </div>
                                </div>
                                <div className="p-6 flex-grow">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                      <h3 className="text-lg font-medium text-tcof-dark mb-1">
                                        {selection.name}
                                      </h3>
                                      <div className="flex items-center text-sm text-gray-500 mb-2">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>Created: {formatDate(new Date(selection.createdAt))}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-500">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        <span>Last updated: {formatDate(new Date(selection.lastUpdated))}</span>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => loadEntry("cynefin-selection", selection.id)}
                                        className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> View & Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => exportEntry("cynefin-selection", selection.id)}
                                        className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                      >
                                        <FileDown className="h-4 w-4 mr-2" /> Export
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
                </TabsContent>

                <TabsContent value="tcof-journeys">
                  <div className="space-y-4">
                    {tcofJourneysLoading ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-tcof-teal" />
                        <p className="text-gray-500">Loading your TCOF journeys...</p>
                      </div>
                    ) : tcofJourneysError ? (
                      <div className="p-8 rounded-md bg-red-50 text-center">
                        <p className="text-red-500">Error loading your TCOF journeys.</p>
                      </div>
                    ) : !tcofJourneys || tcofJourneys.length === 0 ? (
                      <div className="p-12 rounded-md bg-gray-50 text-center">
                        <p className="text-gray-500 mb-4">You don't have any saved TCOF journeys yet.</p>
                        <Button 
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          onClick={() => setLocation("/tools/tcof-journey")}
                        >
                          Create TCOF Journey
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tcofJourneys.map((journey) => (
                          <Card key={journey.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                              <div className="flex flex-col md:flex-row items-stretch">
                                <div className="bg-purple-50 p-6 flex items-center justify-center md:w-1/4">
                                  <div className="text-center">
                                    <MapPin className="h-8 w-8 text-tcof-teal mx-auto mb-2" />
                                    <div className="text-sm font-medium text-tcof-dark">TCOF Journey</div>
                                  </div>
                                </div>
                                <div className="p-6 flex-grow">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                      <h3 className="text-lg font-medium text-tcof-dark mb-1">
                                        {journey.name}
                                      </h3>
                                      <div className="flex items-center text-sm text-gray-500 mb-2">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>Created: {formatDate(new Date(journey.createdAt))}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-500">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        <span>Last updated: {formatDate(new Date(journey.lastUpdated))}</span>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => loadEntry("tcof-journey", journey.id)}
                                        className="text-tcof-dark border-tcof-dark hover:bg-tcof-light"
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> View & Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => exportEntry("tcof-journey", journey.id)}
                                        className="text-tcof-teal border-tcof-teal hover:bg-tcof-light"
                                      >
                                        <FileDown className="h-4 w-4 mr-2" /> Export
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