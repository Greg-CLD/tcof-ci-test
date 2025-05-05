import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Compass, Clipboard, CheckSquare } from 'lucide-react';

interface QuickLinkButtonsProps {
  projectId?: string;
}

const QuickLinkButtons: React.FC<QuickLinkButtonsProps> = ({ projectId }) => {
  if (!projectId) return null;
  
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-tcof-dark">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/get-your-bearings">
          <Button 
            variant="outline" 
            className="w-full justify-start border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10"
          >
            <Compass className="mr-2 h-5 w-5 text-tcof-teal" />
            Get Your Bearings
          </Button>
        </Link>
        <Link href="/make-a-plan">
          <Button 
            variant="outline" 
            className="w-full justify-start border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10"
          >
            <Clipboard className="mr-2 h-5 w-5 text-tcof-teal" />
            Make a Plan
          </Button>
        </Link>
        <Link href="/checklist">
          <Button 
            variant="outline" 
            className="w-full justify-start border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10"
          >
            <CheckSquare className="mr-2 h-5 w-5 text-tcof-teal" />
            Your Checklist
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default QuickLinkButtons;