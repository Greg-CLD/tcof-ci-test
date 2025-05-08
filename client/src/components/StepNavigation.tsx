import React from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface StepNavigationProps {
  prevLink?: string;
  nextLink?: string;
  onComplete?: () => void;
  completeButtonText?: string;
  disableComplete?: boolean;
  showComplete?: boolean;
  nextDisabled?: boolean;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  prevLink,
  nextLink,
  onComplete,
  completeButtonText = "Complete",
  disableComplete = false,
  showComplete = true,
  nextDisabled = false,
}) => {
  return (
    <div className="flex justify-between mt-8">
      <div>
        {prevLink && (
          <Button variant="outline" asChild>
            <Link href={prevLink}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Link>
          </Button>
        )}
      </div>
      
      <div className="flex space-x-4">
        {showComplete && onComplete && (
          <Button 
            onClick={onComplete}
            disabled={disableComplete}
            variant="default"
          >
            <Check className="h-4 w-4 mr-2" />
            {completeButtonText}
          </Button>
        )}
        
        {nextLink && (
          <Button asChild disabled={nextDisabled}>
            <Link href={nextLink}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepNavigation;