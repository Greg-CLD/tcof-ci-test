import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download,
  Filter,
  Mail,
  Printer,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadPlan, savePlan, Stage, PlanRecord, TaskItem } from '@/lib/plan-db';

interface FinalChecklistProps {
  projectId?: string;
}

interface UnifiedTask {
  id: string;
  text: string;
  completed: boolean;
  stage: Stage;
  source: 'heuristic' | 'factor' | 'custom' | 'framework' | 'policy';
  sourceName?: string;
  frameworkCode?: string;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  owner?: string;
  order?: number;
  status?: 'To Do' | 'Working On It' | 'Done';
}

type TaskPriority = 'low' | 'medium' | 'high';
type StageFilter = 'all' | Stage;
type StatusFilter = 'all' | 'open' | 'completed' | 'assigned' | 'unassigned';
type SourceFilter = 'all' | 'heuristic' | 'factor' | 'custom' | 'framework' | 'policy';
type SortOption = 'none' | 'dueDate' | 'priority' | 'status' | 'owner';
type SortDirection = 'asc' | 'desc';

interface TaskUpdates {
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
}

export default function FinalChecklist({ projectId: propProjectId }: FinalChecklistProps) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || paramProjectId || localStorage.getItem('currentProjectId');
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [activeTab, setActiveTab] = useState<Stage | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Load the project data
  const { data: project } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId
  });

  // Effect to load plan data when project ID is available
  useEffect(() => {
    async function ensurePlan() {
      if (projectId) {
        try {
          const loadedPlan = await loadPlan(projectId);
          setPlan(loadedPlan);
        } catch (error) {
          console.error('Failed to load plan:', error);
          toast({
            title: 'Error',
            description: 'Failed to load plan data',
            variant: 'destructive'
          });
        }
      }
    }
    
    ensurePlan();
  }, [projectId, toast]);

  // Handler for plan updates
  const handlePlanUpdate = (updatedPlan: PlanRecord) => {
    setPlan(updatedPlan);
    savePlan(updatedPlan.id, updatedPlan)
      .then(() => {
        toast({
          title: 'Success',
          description: 'Task list updated successfully'
        });
      })
      .catch((error) => {
        console.error('Failed to save plan:', error);
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive'
        });
      });
  };

  // Handler for task updates
  const handleTaskUpdate = (taskId: string, updates: TaskUpdates, stage: Stage, source: string) => {
    if (!plan) return;
    
    const updatedPlan = { ...plan };
    
    // Update task based on its source
    if (source === 'heuristic' || source === 'factor' || source === 'custom') {
      // These tasks are stored in stageData.tasks
      const stageTasks = updatedPlan.stages[stage].tasks || [];
      const taskIndex = stageTasks.findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        stageTasks[taskIndex] = { 
          ...stageTasks[taskIndex], 
          ...updates 
        };
        updatedPlan.stages[stage].tasks = stageTasks;
      }
    } else if (source === 'policy') {
      // Policy tasks are stored in stageData.policyTasks
      const policyTasks = updatedPlan.stages[stage].policyTasks || [];
      const taskIndex = policyTasks.findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        policyTasks[taskIndex] = { 
          ...policyTasks[taskIndex], 
          ...updates 
        };
        updatedPlan.stages[stage].policyTasks = policyTasks;
      }
    } else if (source === 'framework') {
      // Framework tasks are stored in stageData.goodPractice.tasks
      const goodPractice = updatedPlan.stages[stage].goodPractice;
      if (goodPractice) {
        const tasks = goodPractice.tasks || [];
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          tasks[taskIndex] = { 
            ...tasks[taskIndex], 
            ...updates 
          };
          goodPractice.tasks = tasks;
          updatedPlan.stages[stage].goodPractice = goodPractice;
        }
      }
    }
    
    handlePlanUpdate(updatedPlan);
  };

  // Function to collect all tasks from different sources
  const getAllTasks = (): UnifiedTask[] => {
    if (!plan) return [];
    
    const allTasks: UnifiedTask[] = [];
    const stages = Object.keys(plan.stages) as Stage[];
    
    // Process each stage
    stages.forEach(stage => {
      const stageData = plan.stages[stage];
      
      // Collect tasks (these include both heuristic and factor tasks)
      if (stageData.tasks) {
        stageData.tasks.forEach(task => {
          allTasks.push({
            id: task.id,
            text: task.text,
            completed: task.completed || false,
            stage,
            source: task.origin as 'heuristic' | 'factor' | 'custom' | 'framework' | 'policy',
            sourceName: task.origin === 'heuristic' 
              ? 'Personal Heuristic' 
              : (task.origin === 'factor' ? 'Success Factor' : undefined),
            notes: task.notes,
            priority: task.priority,
            dueDate: task.dueDate,
            owner: task.owner,
            order: task.order
          });
        });
      }
      
      // Collect policy tasks
      if (stageData.policyTasks) {
        stageData.policyTasks.forEach(task => {
          allTasks.push({
            id: task.id,
            text: task.text,
            completed: false,
            stage,
            source: 'policy',
            sourceName: 'Organizational Policy'
          });
        });
      }
      
      // Collect framework tasks (from goodPractice)
      if (stageData.goodPractice?.tasks) {
        stageData.goodPractice.tasks.forEach(task => {
          allTasks.push({
            id: task.id,
            text: task.text,
            completed: task.completed || false,
            stage,
            source: 'framework',
            sourceName: 'Framework',
            frameworkCode: task.frameworkCode,
            notes: task.notes,
            priority: task.priority,
            dueDate: task.dueDate,
            owner: task.owner,
            order: task.order
          });
        });
      }
    });
    
    return allTasks;
  };

  // Apply filters to tasks
  const getFilteredTasks = () => {
    const allTasks = getAllTasks();
    
    return allTasks.filter(task => {
      // Filter by stage
      if (stageFilter !== 'all' && task.stage !== stageFilter) {
        return false;
      }
      
      // Filter by status
      if (statusFilter === 'completed' && !task.completed) {
        return false;
      }
      if (statusFilter === 'open' && task.completed) {
        return false;
      }
      if (statusFilter === 'assigned' && !task.owner) {
        return false;
      }
      if (statusFilter === 'unassigned' && task.owner) {
        return false;
      }
      
      // Filter by source
      if (sourceFilter !== 'all' && task.source !== sourceFilter) {
        return false;
      }
      
      // If we reach here, the task passed all filters
      return true;
    });
  };

  // Apply sorting to filtered tasks
  const getSortedTasks = () => {
    const filteredTasks = getFilteredTasks();
    
    if (sortBy === 'none') {
      return filteredTasks;
    }
    
    return filteredTasks.sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortBy === 'priority') {
        const priorityMap = { high: 3, medium: 2, low: 1, undefined: 0 };
        const priorityA = priorityMap[a.priority as keyof typeof priorityMap] || 0;
        const priorityB = priorityMap[b.priority as keyof typeof priorityMap] || 0;
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
      
      if (sortBy === 'status') {
        const statusA = a.completed ? 2 : a.status === 'Working On It' ? 1 : 0;
        const statusB = b.completed ? 2 : b.status === 'Working On It' ? 1 : 0;
        return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;
      }
      
      if (sortBy === 'owner') {
        const ownerA = a.owner || '';
        const ownerB = b.owner || '';
        return sortDirection === 'asc' 
          ? ownerA.localeCompare(ownerB) 
          : ownerB.localeCompare(ownerA);
      }
      
      return 0;
    });
  };

  // Group tasks by source and stage
  const groupTasksBySource = (tasks: UnifiedTask[]) => {
    const groupedTasks: Record<string, UnifiedTask[]> = {};
    
    tasks.forEach(task => {
      const sourceKey = `${task.source}:${task.sourceName || ''}:${task.frameworkCode || ''}`;
      if (!groupedTasks[sourceKey]) {
        groupedTasks[sourceKey] = [];
      }
      groupedTasks[sourceKey].push(task);
    });
    
    return groupedTasks;
  };

  const getSourceDisplayName = (sourceKey: string) => {
    const [source, sourceName, frameworkCode] = sourceKey.split(':');
    
    if (source === 'heuristic') {
      return 'Personal Heuristics';
    }
    if (source === 'factor') {
      return 'TCOF Success Factors';
    }
    if (source === 'framework' && frameworkCode) {
      return sourceName || `Framework: ${frameworkCode}`;
    }
    if (source === 'policy') {
      return sourceName || 'Policy';
    }
    
    return sourceName || 'Custom Tasks';
  };

  // Toggle expanding/collapsing a source group
  const toggleSourceExpanded = (sourceKey: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [sourceKey]: !prev[sourceKey]
    }));
  };

  // Function to handle exporting tasks as CSV
  const handleExportCSV = () => {
    const tasks = getSortedTasks();
    if (tasks.length === 0) {
      toast({
        title: 'No Tasks',
        description: 'There are no tasks to export',
        variant: 'default'
      });
      return;
    }
    
    // Create CSV content
    const headers = ['Task', 'Stage', 'Source', 'Status', 'Priority', 'Due Date', 'Owner', 'Notes'];
    const rows = tasks.map(task => [
      task.text,
      task.stage,
      `${task.source}${task.sourceName ? ': ' + task.sourceName : ''}`,
      task.completed ? 'Completed' : (task.status || 'To Do'),
      task.priority || 'None',
      task.dueDate || 'None',
      task.owner || 'Unassigned',
      task.notes || ''
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project?.name || 'tasks'}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Complete',
      description: 'Tasks exported successfully'
    });
  };

  // Function to handle sending tasks via email
  const handleEmailTasks = () => {
    const tasks = getSortedTasks();
    if (tasks.length === 0) {
      toast({
        title: 'No Tasks',
        description: 'There are no tasks to email',
        variant: 'default'
      });
      return;
    }
    
    // Prepare email body
    const projectName = project?.name || 'Project Tasks';
    let emailBody = `# ${projectName} - Task List\n\n`;
    
    // Group by stage for better organization
    const tasksByStage: Record<Stage, UnifiedTask[]> = {
      Identification: [],
      Definition: [],
      Delivery: [],
      Closure: []
    };
    
    tasks.forEach(task => {
      tasksByStage[task.stage].push(task);
    });
    
    // Build email content
    Object.entries(tasksByStage).forEach(([stage, stageTasks]) => {
      if (stageTasks.length > 0) {
        emailBody += `## ${stage} Stage\n\n`;
        stageTasks.forEach(task => {
          const status = task.completed ? '✓' : task.status || 'To Do';
          const priority = task.priority ? `Priority: ${task.priority}` : '';
          const dueDate = task.dueDate ? `Due: ${task.dueDate}` : '';
          const owner = task.owner ? `Owner: ${task.owner}` : 'Unassigned';
          const source = `Source: ${task.source}${task.sourceName ? ` (${task.sourceName})` : ''}`;
          
          emailBody += `- ${task.text} [${status}]\n`;
          emailBody += `  ${priority} ${dueDate} ${owner} | ${source}\n`;
          if (task.notes) {
            emailBody += `  Notes: ${task.notes}\n`;
          }
          emailBody += '\n';
        });
      }
    });
    
    // Open mailto link with task data
    const subject = encodeURIComponent(`${projectName} - Task List`);
    const body = encodeURIComponent(emailBody);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    
    toast({
      title: 'Email Prepared',
      description: 'Email client opened with task list'
    });
  };

  // Function to handle printing task list
  const handlePrintTasks = () => {
    window.print();
  };

  // Render list of tasks grouped by source
  const renderTaskGroups = () => {
    const tasks = getSortedTasks();
    const groupedTasks = groupTasksBySource(tasks);
    
    if (Object.keys(groupedTasks).length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No tasks found matching the selected filters
        </div>
      );
    }
    
    return Object.entries(groupedTasks).map(([sourceKey, tasks]) => {
      const isExpanded = expandedSources[sourceKey] !== false; // Default to expanded
      const displayName = getSourceDisplayName(sourceKey);
      
      return (
        <Card key={sourceKey} className="mb-4">
          <CardHeader 
            className="py-3 px-4 cursor-pointer flex flex-row justify-between items-center"
            onClick={() => toggleSourceExpanded(sourceKey)}
          >
            <CardTitle className="text-lg flex items-center">
              <span>{displayName}</span>
              <Badge className="ml-2" variant="outline">
                {tasks.length}
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm">
              {isExpanded ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="pt-0">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`p-3 mb-2 border rounded-md ${
                    task.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => handleTaskUpdate(
                          task.id, 
                          { completed: e.target.checked }, 
                          task.stage, 
                          task.source
                        )}
                        className="mt-1"
                      />
                      <div>
                        <p className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.text}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                          <Badge variant="secondary">{task.stage}</Badge>
                          {task.priority && (
                            <Badge 
                              variant={
                                task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'default' : 'outline'
                              }
                            >
                              {task.priority}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                          {task.owner && (
                            <span>Owner: {task.owner}</span>
                          )}
                          {task.status && task.status !== 'To Do' && (
                            <Badge variant={task.status === 'Done' ? 'default' : 'secondary'}>
                              {task.status}
                            </Badge>
                          )}
                        </div>
                        {task.notes && (
                          <p className="mt-1 text-sm text-gray-600 italic">
                            Notes: {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      );
    });
  };

  // Group tasks by stage
  const groupTasksByStage = () => {
    const tasks = getSortedTasks();
    return {
      Identification: tasks.filter(task => task.stage === 'Identification'),
      Definition: tasks.filter(task => task.stage === 'Definition'),
      Delivery: tasks.filter(task => task.stage === 'Delivery'),
      Closure: tasks.filter(task => task.stage === 'Closure'),
    };
  };

  const groupedByStage = groupTasksByStage();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Final Task Checklist</h1>
          {project && (
            <p className="text-gray-600">
              Project: {project.name}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmailTasks}
            className="flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            Email Tasks
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintTasks}
            className="flex items-center gap-1 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium">Stage</label>
          <Select
            value={stageFilter}
            onValueChange={value => setStageFilter(value as StageFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="Identification">Identification</SelectItem>
              <SelectItem value="Definition">Definition</SelectItem>
              <SelectItem value="Delivery">Delivery</SelectItem>
              <SelectItem value="Closure">Closure</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select
            value={statusFilter}
            onValueChange={value => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Source</label>
          <Select
            value={sourceFilter}
            onValueChange={value => setSourceFilter(value as SourceFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="heuristic">Personal Heuristics</SelectItem>
              <SelectItem value="factor">Success Factors</SelectItem>
              <SelectItem value="custom">Custom Tasks</SelectItem>
              <SelectItem value="policy">Policy Tasks</SelectItem>
              <SelectItem value="framework">Framework Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Sort By</label>
          <Select
            value={sortBy}
            onValueChange={value => {
              setSortBy(value as SortOption);
              // Toggle direction if same sort option is selected again
              if (sortBy === value) {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortDirection('asc');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="No Sorting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Sorting</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full" onValueChange={value => setActiveTab(value as Stage | 'all')}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">
            All Stages
            <Badge variant="secondary" className="ml-2">
              {getSortedTasks().length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Identification">
            Identification
            <Badge variant="secondary" className="ml-2">
              {groupedByStage.Identification.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Definition">
            Definition
            <Badge variant="secondary" className="ml-2">
              {groupedByStage.Definition.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Delivery">
            Delivery
            <Badge variant="secondary" className="ml-2">
              {groupedByStage.Delivery.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Closure">
            Closure
            <Badge variant="secondary" className="ml-2">
              {groupedByStage.Closure.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="border-none p-0">
          {renderTaskGroups()}
        </TabsContent>
        
        <TabsContent value="Identification" className="border-none p-0">
          {activeTab === 'Identification' && (
            <div className="mt-4">
              {stageFilter !== 'all' && stageFilter !== 'Identification' ? (
                <div className="text-center py-8 text-gray-500">
                  Filter is set to {stageFilter} stage. Switch to 'All Stages' to see Identification tasks.
                </div>
              ) : renderTaskGroups()}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Definition" className="border-none p-0">
          {activeTab === 'Definition' && (
            <div className="mt-4">
              {stageFilter !== 'all' && stageFilter !== 'Definition' ? (
                <div className="text-center py-8 text-gray-500">
                  Filter is set to {stageFilter} stage. Switch to 'All Stages' to see Definition tasks.
                </div>
              ) : renderTaskGroups()}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Delivery" className="border-none p-0">
          {activeTab === 'Delivery' && (
            <div className="mt-4">
              {stageFilter !== 'all' && stageFilter !== 'Delivery' ? (
                <div className="text-center py-8 text-gray-500">
                  Filter is set to {stageFilter} stage. Switch to 'All Stages' to see Delivery tasks.
                </div>
              ) : renderTaskGroups()}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Closure" className="border-none p-0">
          {activeTab === 'Closure' && (
            <div className="mt-4">
              {stageFilter !== 'all' && stageFilter !== 'Closure' ? (
                <div className="text-center py-8 text-gray-500">
                  Filter is set to {stageFilter} stage. Switch to 'All Stages' to see Closure tasks.
                </div>
              ) : renderTaskGroups()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}