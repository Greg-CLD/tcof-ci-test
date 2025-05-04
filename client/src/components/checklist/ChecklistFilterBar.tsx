import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, FilterX, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Export types for filters
export type StageFilter = 'all' | 'Identification' | 'Definition' | 'Delivery' | 'Closure';
export type StatusFilter = 'all' | 'open' | 'completed';
export type SourceFilter = 'all' | 'heuristic' | 'factor' | 'framework';
export type SortOption = 'none' | 'priority' | 'dueDate' | 'source';
export type SortDirection = 'asc' | 'desc';

interface ChecklistFilterBarProps {
  stageFilter: StageFilter;
  statusFilter: StatusFilter;
  sourceFilter: SourceFilter;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onStageFilterChange: (value: StageFilter) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSourceFilterChange: (value: SourceFilter) => void;
  onSortChange: (value: SortOption) => void;
  onSortDirectionChange: (value: SortDirection) => void;
}

export default function ChecklistFilterBar({
  stageFilter,
  statusFilter,
  sourceFilter,
  sortBy,
  sortDirection,
  onStageFilterChange,
  onStatusFilterChange,
  onSourceFilterChange,
  onSortChange,
  onSortDirectionChange
}: ChecklistFilterBarProps) {
  
  // Check if any filters are active
  const hasActiveFilters = 
    stageFilter !== 'all' || 
    statusFilter !== 'all' || 
    sourceFilter !== 'all' || 
    sortBy !== 'none';
  
  // Reset all filters to default values
  const handleResetFilters = () => {
    onStageFilterChange('all');
    onStatusFilterChange('all');
    onSourceFilterChange('all');
    onSortChange('none');
    onSortDirectionChange('asc');
  };
  
  // Toggle sort direction
  const handleToggleSortDirection = () => {
    onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className="bg-white rounded-lg mb-6 p-4 border shadow-sm">
      <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter by Stage */}
          <div>
            <div className="flex items-center mb-1">
              <label htmlFor="stage-filter" className="text-sm font-medium mr-1">Stage</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="p-0 h-5 w-5">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Filter tasks by their project stage (Identification, Definition, etc.)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={stageFilter} 
              onValueChange={(value) => onStageFilterChange(value as StageFilter)}
            >
              <SelectTrigger id="stage-filter" className="w-[160px] h-9">
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
          
          {/* Filter by Status */}
          <div>
            <div className="flex items-center mb-1">
              <label htmlFor="status-filter" className="text-sm font-medium mr-1">Status</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="p-0 h-5 w-5">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Filter tasks by completion status (Open or Completed)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={statusFilter} 
              onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
            >
              <SelectTrigger id="status-filter" className="w-[160px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open Tasks</SelectItem>
                <SelectItem value="completed">Completed Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filter by Source */}
          <div>
            <div className="flex items-center mb-1">
              <label htmlFor="source-filter" className="text-sm font-medium mr-1">Source</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="p-0 h-5 w-5">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Filter tasks by source (Heuristic, Success Factor, or Framework)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={sourceFilter} 
              onValueChange={(value) => onSourceFilterChange(value as SourceFilter)}
            >
              <SelectTrigger id="source-filter" className="w-[160px] h-9">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="heuristic">Heuristics</SelectItem>
                <SelectItem value="factor">Success Factors</SelectItem>
                <SelectItem value="framework">Frameworks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          {/* Sort By */}
          <div>
            <div className="flex items-center mb-1">
              <label htmlFor="sort-by" className="text-sm font-medium mr-1">Sort By</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="p-0 h-5 w-5">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Sort tasks by priority, due date, or source
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy} 
                onValueChange={(value) => onSortChange(value as SortOption)}
              >
                <SelectTrigger id="sort-by" className="w-[160px] h-9">
                  <SelectValue placeholder="No Sorting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sorting</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort Direction Toggle */}
              {sortBy !== 'none' && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleToggleSortDirection}
                >
                  {sortDirection === 'asc' ? (
                    <ArrowUpNarrowWide className="h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Reset Filters Button */}
          <div className="mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center gap-1 mt-1 text-gray-500",
                !hasActiveFilters && "opacity-50 cursor-not-allowed"
              )}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="text-xs">Reset</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}