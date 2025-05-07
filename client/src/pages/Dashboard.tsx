import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie
} from "recharts";
import { 
  GoalMap, 
  CynefinSelection as CynefinSelectionType, 
  TcofJourney 
} from "@shared/schema";
import { formatDate } from "@/lib/pdf-utils";
import {
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  User,
  FileDown,
  Edit,
  ChevronRight,
  BarChartIcon,
  PieChart as PieChartIcon,
  GitBranch,
  Target,
  Compass,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("summary");

  // Load user's data from all three tools
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

  // Loading state for all data
  const isLoading = goalMapsLoading || cynefinSelectionsLoading || tcofJourneysLoading;
  const hasErrors = goalMapsError || cynefinSelectionsError || tcofJourneysError;

  // Process Cynefin data for visualization
  const cynefinDistribution = [
    { name: 'Clear', value: 0, color: '#8dd1e1' },
    { name: 'Complicated', value: 0, color: '#82ca9d' },
    { name: 'Complex', value: 0, color: '#a4de6c' },
    { name: 'Chaotic', value: 0, color: '#d0021b' },
  ];

  // Process TCOF Journey data for visualization
  const tcofStageDistribution = [
    { name: 'Identification', value: 0, color: '#8884d8' },
    { name: 'Definition', value: 0, color: '#83a6ed' },
    { name: 'Delivery', value: 0, color: '#8dd1e1' },
    { name: 'Closure', value: 0, color: '#82ca9d' },
  ];

  // Populate distribution data
  if (cynefinSelections && cynefinSelections.length > 0) {
    cynefinSelections.forEach(selection => {
      if (selection.data && typeof selection.data === 'object') {
        const data = selection.data as any;
        if (data.quadrant) {
          const index = cynefinDistribution.findIndex(item => item.name.toLowerCase() === data.quadrant.toLowerCase());
          if (index !== -1) {
            cynefinDistribution[index].value += 1;
          }
        }
      }
    });
  }

  if (tcofJourneys && tcofJourneys.length > 0) {
    tcofJourneys.forEach(journey => {
      if (journey.data && typeof journey.data === 'object') {
        const data = journey.data as any;
        if (data.stage) {
          const index = tcofStageDistribution.findIndex(item => item.name.toLowerCase() === data.stage.toLowerCase());
          if (index !== -1) {
            tcofStageDistribution[index].value += 1;
          }
        }
      }
    });
  }

  // Get counts for each tool
  const goalMapCount = goalMaps?.length || 0;
  const cynefinCount = cynefinSelections?.length || 0;
  const tcofCount = tcofJourneys?.length || 0;

  // Get most recent items
  const latestGoalMap = goalMaps && goalMaps.length > 0 
    ? goalMaps.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0]
    : null;
    
  const latestCynefin = cynefinSelections && cynefinSelections.length > 0
    ? cynefinSelections.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0]
    : null;
    
  const latestTCOF = tcofJourneys && tcofJourneys.length > 0
    ? tcofJourneys.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0]
    : null;

  // Get goal map levels data for bar chart
  const goalLevelDistribution = [
    { name: 'Strategic', value: 0 },
    { name: 'Business', value: 0 },
    { name: 'Product', value: 0 },
    { name: 'Custom', value: 0 },
  ];

  // Simplified function to categorize goal levels
  const categorizeGoalLevel = (text: string) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('level 5') || lowerText.includes('strategic')) {
      return 'Strategic';
    } else if (lowerText.includes('level 4') || lowerText.includes('business')) {
      return 'Business';
    } else if (lowerText.includes('level 3') || lowerText.includes('product')) {
      return 'Product';
    }
    return 'Custom';
  };

  // Count nodes in goal maps by level
  if (goalMaps && goalMaps.length > 0) {
    goalMaps.forEach(map => {
      if (map.data && typeof map.data === 'object') {
        const data = map.data as any;
        if (data.nodes && Array.isArray(data.nodes)) {
          data.nodes.forEach((node: any) => {
            if (node.timeframe) {
              const level = categorizeGoalLevel(node.timeframe);
              if (level) {
                const index = goalLevelDistribution.findIndex(item => item.name === level);
                if (index !== -1) {
                  goalLevelDistribution[index].value += 1;
                }
              }
            }
          });
        }
      }
    });
  }

  // If the user is not authenticated, redirect to auth page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">You need to sign in to access your dashboard.</p>
            <Link href="/auth">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-tcof-dark">Strategic Planning Dashboard</h1>
              <p className="text-gray-600">A comprehensive overview of your strategic planning tools</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/history")}
              className="text-tcof-teal border-tcof-teal"
            >
              View Full History <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Tabs
            defaultValue="summary"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-8">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="goals">Goal Mapping</TabsTrigger>
              <TabsTrigger value="cynefin">Cynefin Framework</TabsTrigger>
              <TabsTrigger value="tcof">TCOF Journey</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-6 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-24 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : hasErrors ? (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Dashboard Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-600">There was a problem loading your dashboard data. Please try again later.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Quick stats cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-2 bg-blue-50">
                        <CardTitle className="text-blue-700 flex items-center">
                          <Target className="mr-2 h-5 w-5" /> Goal Mapping
                        </CardTitle>
                        <CardDescription className="text-blue-600">
                          Strategic goal visualization
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-2xl font-bold text-tcof-dark">{goalMapCount}</div>
                            <div className="text-sm text-gray-500">Total Maps Created</div>
                          </div>
                          <Link href="/tools/goal-mapping">
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              Open Tool
                            </Button>
                          </Link>
                        </div>
                        
                        {latestGoalMap && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="text-sm font-medium text-gray-500">Latest Activity:</div>
                            <div className="text-sm font-medium text-tcof-dark mt-1">{latestGoalMap.name}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" /> 
                              Updated {formatDate(new Date(latestGoalMap.lastUpdated))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                      <CardHeader className="pb-2 bg-green-50">
                        <CardTitle className="text-green-700 flex items-center">
                          <Compass className="mr-2 h-5 w-5" /> Cynefin Framework
                        </CardTitle>
                        <CardDescription className="text-green-600">
                          Domain identification
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-2xl font-bold text-tcof-dark">{cynefinCount}</div>
                            <div className="text-sm text-gray-500">Selections Made</div>
                          </div>
                          <Link href="/tools/cynefin-orientation">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                              Open Tool
                            </Button>
                          </Link>
                        </div>
                        
                        {latestCynefin && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="text-sm font-medium text-gray-500">Latest Activity:</div>
                            <div className="text-sm font-medium text-tcof-dark mt-1">{latestCynefin.name}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" /> 
                              Updated {formatDate(new Date(latestCynefin.lastUpdated))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                      <CardHeader className="pb-2 bg-purple-50">
                        <CardTitle className="text-purple-700 flex items-center">
                          <GitBranch className="mr-2 h-5 w-5" /> TCOF Journey
                        </CardTitle>
                        <CardDescription className="text-purple-600">
                          Implementation stage analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-2xl font-bold text-tcof-dark">{tcofCount}</div>
                            <div className="text-sm text-gray-500">Journeys Mapped</div>
                          </div>
                          <Link href="/tools/tcof-journey">
                            <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                              Open Tool
                            </Button>
                          </Link>
                        </div>
                        
                        {latestTCOF && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="text-sm font-medium text-gray-500">Latest Activity:</div>
                            <div className="text-sm font-medium text-tcof-dark mt-1">{latestTCOF.name}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" /> 
                              Updated {formatDate(new Date(latestTCOF.lastUpdated))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overview charts */}
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle>Strategic Planning Overview</CardTitle>
                      <CardDescription>
                        Key statistics across all your planning tools
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Goal levels distribution */}
                        <div>
                          <h3 className="text-base font-medium mb-4 text-center">Goal Levels Distribution</h3>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={goalLevelDistribution}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Combined pie chart for Cynefin and TCOF distribution */}
                        <div>
                          <h3 className="text-base font-medium mb-4 text-center">Domain & Stage Distributions</h3>
                          <div className="h-[250px] flex">
                            <div className="flex-1">
                              <div className="text-xs text-center mb-2 text-gray-500">Cynefin Domains</div>
                              <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                  <Pie
                                    data={cynefinDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={30}
                                    outerRadius={60}
                                    fill="#8884d8"
                                    paddingAngle={2}
                                    dataKey="value"
                                    label
                                  >
                                    {cynefinDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            
                            <div className="flex-1">
                              <div className="text-xs text-center mb-2 text-gray-500">TCOF Stages</div>
                              <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                  <Pie
                                    data={tcofStageDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={30}
                                    outerRadius={60}
                                    fill="#8884d8"
                                    paddingAngle={2}
                                    dataKey="value"
                                    label
                                  >
                                    {tcofStageDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>
                        Your latest updates and changes across all tools
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Combine and sort all recent activities */}
                      {[
                        ...(goalMaps || []).map(item => ({ ...item, type: 'goal-map', icon: <Target className="h-4 w-4" /> })),
                        ...(cynefinSelections || []).map(item => ({ ...item, type: 'cynefin', icon: <Compass className="h-4 w-4" /> })),
                        ...(tcofJourneys || []).map(item => ({ ...item, type: 'tcof', icon: <GitBranch className="h-4 w-4" /> })),
                      ]
                      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                      .slice(0, 5)
                      .map((item, index) => (
                        <div key={`${item.type}-${item.id}`} className={`py-3 ${index !== 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="flex items-center">
                            <div className="mr-3">
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                <div className="font-medium text-tcof-dark">{item.name}</div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(new Date(item.lastUpdated))}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {item.type === 'goal-map' ? 'Goal Map' : 
                                 item.type === 'cynefin' ? 'Cynefin Selection' : 
                                 'TCOF Journey'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!goalMaps?.length && !cynefinSelections?.length && !tcofJourneys?.length) && (
                        <div className="text-center py-8 text-gray-500">
                          <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>You haven't created any entries yet.</p>
                          <p className="mt-2">Start using the strategic planning tools to see your progress here.</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t border-gray-100 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setLocation("/history")}
                        className="w-full text-tcof-teal"
                      >
                        View All Activity
                      </Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="goals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-5 w-5 text-blue-600" /> Goal Mapping Analysis
                  </CardTitle>
                  <CardDescription>
                    Strategic goal visualization and success mapping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {goalMapsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-[200px] w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : goalMapsError ? (
                    <div className="text-center py-8 text-red-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                      <p>There was an error loading your goal mapping data.</p>
                    </div>
                  ) : !goalMaps?.length ? (
                    <div className="text-center py-12">
                      <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-tcof-dark mb-2">No Goal Maps Created Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Use the Goal Mapping Tool to create visual maps of your strategic goals at different levels.
                      </p>
                      <Link href="/tools/goal-mapping">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Create Your First Goal Map
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Goal levels breakdown */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Goal Level Distribution</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={goalLevelDistribution}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="value" name="Number of Goals" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <Separator />

                      {/* Recent goal maps */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Recent Goal Maps</h3>
                        <div className="space-y-4">
                          {goalMaps
                            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                            .slice(0, 3)
                            .map((map) => (
                              <Card key={map.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                  <div className="flex flex-col md:flex-row items-stretch">
                                    <div className="bg-blue-50 p-4 flex items-center justify-center md:w-1/5">
                                      <div className="text-center">
                                        <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                        <div className="text-sm font-medium text-gray-700">Goal Map</div>
                                      </div>
                                    </div>
                                    <div className="p-4 flex-grow">
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <h4 className="font-medium text-tcof-dark">{map.name}</h4>
                                          <p className="text-gray-500 flex items-center text-sm">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Last updated: {formatDate(new Date(map.lastUpdated))}
                                          </p>
                                        </div>
                                        <div className="flex mt-2 md:mt-0 space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setLocation(`/tools/goal-mapping?id=${map.id}`)}
                                            className="text-blue-600 border-blue-600"
                                          >
                                            View & Edit
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Link href="/history?tab=goal-maps">
                    <Button variant="outline">View All Goal Maps</Button>
                  </Link>
                  <Link href="/tools/goal-mapping">
                    <Button className="bg-blue-600 hover:bg-blue-700">Open Goal Mapping Tool</Button>
                  </Link>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="cynefin">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Compass className="mr-2 h-5 w-5 text-green-600" /> Cynefin Framework Analysis
                  </CardTitle>
                  <CardDescription>
                    Domain identification and decision-making framework
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cynefinSelectionsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-[200px] w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : cynefinSelectionsError ? (
                    <div className="text-center py-8 text-red-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                      <p>There was an error loading your Cynefin framework data.</p>
                    </div>
                  ) : !cynefinSelections?.length ? (
                    <div className="text-center py-12">
                      <Compass className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-tcof-dark mb-2">No Cynefin Selections Made Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Use the Cynefin Orientation Tool to identify your domain and determine the best approach.
                      </p>
                      <Link href="/tools/cynefin-orientation">
                        <Button className="bg-green-600 hover:bg-green-700">
                          Create Your First Cynefin Selection
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Cynefin distribution */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Domain Distribution</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={cynefinDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {cynefinDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <Separator />

                      {/* Recent Cynefin selections */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Recent Cynefin Selections</h3>
                        <div className="space-y-4">
                          {cynefinSelections
                            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                            .slice(0, 3)
                            .map((selection) => (
                              <Card key={selection.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                  <div className="flex flex-col md:flex-row items-stretch">
                                    <div className="bg-green-50 p-4 flex items-center justify-center md:w-1/5">
                                      <div className="text-center">
                                        <Compass className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                        <div className="text-sm font-medium text-gray-700">Cynefin</div>
                                      </div>
                                    </div>
                                    <div className="p-4 flex-grow">
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <h4 className="font-medium text-tcof-dark">{selection.name}</h4>
                                          <p className="text-gray-500 flex items-center text-sm">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Last updated: {formatDate(new Date(selection.lastUpdated))}
                                          </p>
                                        </div>
                                        <div className="flex mt-2 md:mt-0 space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setLocation(`/tools/cynefin-orientation?id=${selection.id}`)}
                                            className="text-green-600 border-green-600"
                                          >
                                            View & Edit
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Link href="/history?tab=cynefin-selections">
                    <Button variant="outline">View All Cynefin Selections</Button>
                  </Link>
                  <Link href="/tools/cynefin-orientation">
                    <Button className="bg-green-600 hover:bg-green-700">Open Cynefin Orientation Tool</Button>
                  </Link>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="tcof">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GitBranch className="mr-2 h-5 w-5 text-purple-600" /> TCOF Journey Analysis
                  </CardTitle>
                  <CardDescription>
                    Implementation stage identification and planning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tcofJourneysLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-[200px] w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : tcofJourneysError ? (
                    <div className="text-center py-8 text-red-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                      <p>There was an error loading your TCOF journey data.</p>
                    </div>
                  ) : !tcofJourneys?.length ? (
                    <div className="text-center py-12">
                      <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-tcof-dark mb-2">No TCOF Journeys Created Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Use the TCOF Journey Tool to identify your implementation stage and develop appropriate strategies.
                      </p>
                      <Link href="/tools/tcof-journey">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          Create Your First TCOF Journey
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* TCOF stage distribution */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Implementation Stage Distribution</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={tcofStageDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {tcofStageDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <Separator />

                      {/* Recent TCOF journeys */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Recent TCOF Journeys</h3>
                        <div className="space-y-4">
                          {tcofJourneys
                            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                            .slice(0, 3)
                            .map((journey) => (
                              <Card key={journey.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                  <div className="flex flex-col md:flex-row items-stretch">
                                    <div className="bg-purple-50 p-4 flex items-center justify-center md:w-1/5">
                                      <div className="text-center">
                                        <GitBranch className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                                        <div className="text-sm font-medium text-gray-700">TCOF Journey</div>
                                      </div>
                                    </div>
                                    <div className="p-4 flex-grow">
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <h4 className="font-medium text-tcof-dark">{journey.name}</h4>
                                          <p className="text-gray-500 flex items-center text-sm">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Last updated: {formatDate(new Date(journey.lastUpdated))}
                                          </p>
                                        </div>
                                        <div className="flex mt-2 md:mt-0 space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setLocation(`/tools/tcof-journey?id=${journey.id}`)}
                                            className="text-purple-600 border-purple-600"
                                          >
                                            View & Edit
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Link href="/history?tab=tcof-journeys">
                    <Button variant="outline">View All TCOF Journeys</Button>
                  </Link>
                  <Link href="/tools/tcof-journey">
                    <Button className="bg-purple-600 hover:bg-purple-700">Open TCOF Journey Tool</Button>
                  </Link>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
    </div>
  );
}