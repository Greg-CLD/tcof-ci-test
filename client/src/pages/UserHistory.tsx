import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { FileDown, Clock, Edit, Trash2, MapPin, ArrowLeft } from "lucide-react";
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
        <SiteHeader />
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
      <SiteHeader />

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
            <h1 className="text-3xl font-bold text-tcof-dark">Your History</h1>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Saved Projects</CardTitle>
              <CardDescription>
                View and manage your saved work across all TCOF tools
              </CardDescription>
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
                  <TabsTrigger value="cynefin-selections">
                    Cynefin Selections
                  </TabsTrigger>
                  <TabsTrigger value="tcof-journeys">TCOF Journeys</TabsTrigger>
                </TabsList>

                <TabsContent value="goal-maps">
                  {goalMapsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : goalMapsError ? (
                    <div className="p-6 text-center text-red-500">
                      Error loading your goal maps. Please try again.
                    </div>
                  ) : goalMaps?.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      You don't have any saved goal maps yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {goalMaps?.map((map) => (
                        <Card key={map.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-stretch">
                              <div className="bg-tcof-light/50 p-6 flex items-center justify-center md:w-1/5">
                                <MapPin className="h-10 w-10 text-tcof-teal" />
                              </div>
                              <div className="p-6 flex-grow">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h3 className="font-bold text-lg text-tcof-dark">
                                      {map.name}
                                    </h3>
                                    <p className="text-gray-500 flex items-center text-sm">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Last updated: {formatDate(new Date(map.lastUpdated))}
                                    </p>
                                  </div>
                                  <div className="flex mt-4 md:mt-0 space-x-2">
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
                </TabsContent>

                <TabsContent value="cynefin-selections">
                  {cynefinSelectionsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : cynefinSelectionsError ? (
                    <div className="p-6 text-center text-red-500">
                      Error loading your Cynefin selections. Please try again.
                    </div>
                  ) : cynefinSelections?.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      You don't have any saved Cynefin selections yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cynefinSelections?.map((selection) => (
                        <Card key={selection.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-stretch">
                              <div className="bg-tcof-light/50 p-6 flex items-center justify-center md:w-1/5">
                                <MapPin className="h-10 w-10 text-tcof-teal" />
                              </div>
                              <div className="p-6 flex-grow">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h3 className="font-bold text-lg text-tcof-dark">
                                      {selection.name}
                                    </h3>
                                    <p className="text-gray-500 flex items-center text-sm">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Last updated: {formatDate(new Date(selection.lastUpdated))}
                                    </p>
                                  </div>
                                  <div className="flex mt-4 md:mt-0 space-x-2">
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
                </TabsContent>

                <TabsContent value="tcof-journeys">
                  {tcofJourneysLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : tcofJourneysError ? (
                    <div className="p-6 text-center text-red-500">
                      Error loading your TCOF journeys. Please try again.
                    </div>
                  ) : tcofJourneys?.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      You don't have any saved TCOF journeys yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tcofJourneys?.map((journey) => (
                        <Card key={journey.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-stretch">
                              <div className="bg-tcof-light/50 p-6 flex items-center justify-center md:w-1/5">
                                <MapPin className="h-10 w-10 text-tcof-teal" />
                              </div>
                              <div className="p-6 flex-grow">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h3 className="font-bold text-lg text-tcof-dark">
                                      {journey.name}
                                    </h3>
                                    <p className="text-gray-500 flex items-center text-sm">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Last updated: {formatDate(new Date(journey.lastUpdated))}
                                    </p>
                                  </div>
                                  <div className="flex mt-4 md:mt-0 space-x-2">
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Synchronization</CardTitle>
              <CardDescription>
                Your data is now saved securely in our cloud and synchronized across all your devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-tcof-light/50 p-4 rounded-lg">
                  <h3 className="font-medium text-tcof-dark mb-2">Automatic Syncing</h3>
                  <p className="text-gray-600">
                    When you're signed in, your work is automatically saved to the cloud. You can
                    access it from any device by signing in with the same account.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="bg-tcof-light/50 p-4 rounded-lg flex-1">
                    <h3 className="font-medium text-tcof-dark mb-2">Version History</h3>
                    <p className="text-gray-600">
                      We keep multiple versions of your work so you can always revert to a previous
                      state if needed.
                    </p>
                  </div>
                  <div className="bg-tcof-light/50 p-4 rounded-lg flex-1">
                    <h3 className="font-medium text-tcof-dark mb-2">Export Options</h3>
                    <p className="text-gray-600">
                      You can export any of your saved work as a PDF for sharing or printing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}