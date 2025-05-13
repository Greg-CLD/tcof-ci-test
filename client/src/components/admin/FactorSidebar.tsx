import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FactorSidebarProps {
  factors: {
    id: string;
    title: string;
    description: string;
  }[];
  selectedFactorId: string | null;
  onSelectFactor: (id: string) => void;
  onCreateFactor: () => void;
}

export default function FactorSidebar({ 
  factors, 
  selectedFactorId, 
  onSelectFactor,
  onCreateFactor
}: FactorSidebarProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Success Factors</CardTitle>
          <Button 
            onClick={onCreateFactor} 
            size="sm"
            className="flex items-center gap-1 bg-tcof-teal hover:bg-tcof-teal/90"
          >
            <Plus className="h-3 w-3" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
          {factors.map((factor) => (
            <div
              key={factor.id}
              className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                selectedFactorId === factor.id
                  ? 'bg-tcof-teal/10 border-l-4 border-tcof-teal'
                  : 'hover:bg-gray-100 border-l-4 border-transparent'
              }`}
              onClick={() => onSelectFactor(factor.id)}
            >
              <div className="font-bold text-gray-700">{factor.id}</div>
              <div className="font-medium">{factor.title}</div>
              <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                {factor.description}
              </div>
            </div>
          ))}
          
          {factors.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No success factors found.</p>
              <p className="text-sm mt-2">Click the New button to create one.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}