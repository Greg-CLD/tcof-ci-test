import React from 'react';
import { Filter, SortAsc, SortDesc } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Stage } from '@/lib/plan-db';

export type StageFilter = Stage | 'all';
export type StatusFilter = 'all' | 'open' | 'done';
export type SourceFilter = 'all' | 'heuristic' | 'factor' | 'framework';
export type SortOption = 'priority' | 'dueDate' | 'none';
export type SortDirection = 'asc' | 'desc';

export interface ChecklistFilterBarProps {
  stageFilter: StageFilter;
  statusFilter: StatusFilter;
  sourceFilter: SourceFilter;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onStageFilterChange: (value: StageFilter) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSourceFilterChange: (value: SourceFilter) => void;
  onSortChange: (sortBy: SortOption) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
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
  onSortDirectionChange,
}: ChecklistFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm border mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        {/* Stage filter */}
        <Select value={stageFilter} onValueChange={(v) => onStageFilterChange(v as StageFilter)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Identification">Identification</SelectItem>
            <SelectItem value="Definition">Definition</SelectItem>
            <SelectItem value="Delivery">Delivery</SelectItem>
            <SelectItem value="Closure">Closure</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="open">Open Tasks</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={(v) => onSourceFilterChange(v as SourceFilter)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="heuristic">🔸 Heuristics</SelectItem>
            <SelectItem value="factor">🧱 Success Factors</SelectItem>
            <SelectItem value="framework">📘 Good Practice</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="h-6 w-px bg-gray-200 mx-1" />
        
        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default Order</SelectItem>
              <SelectItem value="priority">Sort by Priority</SelectItem>
              <SelectItem value="dueDate">Sort by Due Date</SelectItem>
            </SelectContent>
          </Select>
          
          {sortBy !== 'none' && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}