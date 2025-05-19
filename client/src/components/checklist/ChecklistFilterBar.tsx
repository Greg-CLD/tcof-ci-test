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
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, FilterX, HelpCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Export types for filters
export type StageFilter = 'all' | 'Identification' | 'Definition' | 'Delivery' | 'Closure';
export type StatusFilter = 'all' | 'completed' | 'incomplete';
export type SourceFilter = 'all' | 'heuristic' | 'factor' | 'policy' | 'framework' | 'custom';
export type SortOption = 'stage' | 'status' | 'source' | 'date';
export type SortDirection = 'asc' | 'desc';

// Props interface for the component
interface ChecklistFilterBarProps {
  statusFilter: StatusFilter;
  setStatusFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
  sourceFilter: SourceFilter;
  setSourceFilter: React.Dispatch<React.SetStateAction<SourceFilter>>;
  sortOption: SortOption;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  sortDirection: SortDirection;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export default function ChecklistFilterBar({
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection,
  searchQuery,
  setSearchQuery
}: ChecklistFilterBarProps) {
  
  // Check if any filters are active
  const hasActiveFilters = 
    statusFilter !== 'all' || 
    sourceFilter !== 'all' || 
    searchQuery !== '';
  
  // Reset all filters to default values
  const handleResetFilters = () => {
    setStatusFilter('all');
    setSourceFilter('all');
    setSortOption('stage');
    setSortDirection('asc');
    setSearchQuery('');
  };
  
  // Toggle sort direction
  const handleToggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className="bg-white rounded-lg mb-6 p-4 border shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search Field */}
          <div className="w-full sm:w-auto">
            <div className="flex items-center mb-1">
              <label htmlFor="search" className="text-sm font-medium mr-1">Search</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="p-0 h-5 w-5">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Search tasks by name or description
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                id="search"
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-[240px]"
              />
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {/* Stage filter removed as it's redundant with the tabs */}
          
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
                      Filter tasks by completion status
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger id="status-filter" className="w-[160px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                      Filter tasks by source
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={sourceFilter} 
              onValueChange={(value) => setSourceFilter(value as SourceFilter)}
            >
              <SelectTrigger id="source-filter" className="w-[160px] h-9">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="heuristic">Personal Heuristics</SelectItem>
                <SelectItem value="factor">Success Factors</SelectItem>
                <SelectItem value="policy">Company Policy</SelectItem>
                <SelectItem value="framework">Good Practice</SelectItem>
                <SelectItem value="custom">Custom Tasks</SelectItem>
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
                      Choose how to sort tasks
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortOption} 
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger id="sort-by" className="w-[160px] h-9">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Created Date</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort Direction Toggle */}
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