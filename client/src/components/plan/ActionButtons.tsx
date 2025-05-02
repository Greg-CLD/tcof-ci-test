import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import styles from '@/lib/styles.module.css';
import { ArrowLeft, ArrowRight, Save, SkipForward, ClipboardList } from 'lucide-react';

interface ActionButtonsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onSkip?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  showSave?: boolean;
  showSkip?: boolean;
  showSkipToSummary?: boolean;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  isSaveDisabled?: boolean;
}

export default function ActionButtons({
  onPrevious,
  onNext,
  onSave,
  onSkip,
  showPrevious = true,
  showNext = true,
  showSave = true,
  showSkip = false,
  showSkipToSummary = true,
  isNextDisabled = false,
  isPreviousDisabled = false,
  isSaveDisabled = false
}: ActionButtonsProps) {
  return (
    <div className={styles.actionButtons}>
      <div className={styles.leftGroup}>
        {showPrevious && (
          <Button 
            onClick={onPrevious}
            variant="outline"
            disabled={isPreviousDisabled}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        )}
        
        {showSkip && (
          <Button 
            onClick={onSkip}
            variant="ghost"
            className={styles.skipForNow}
          >
            <SkipForward className="h-4 w-4 mr-2" /> Skip for now
          </Button>
        )}
      </div>
      
      <div className={styles.rightGroup}>
        {showSkipToSummary && (
          <Link href="/checklist" className={styles.skipToSummary}>
            <ClipboardList className="h-4 w-4" /> Skip to Summary
          </Link>
        )}
        
        {showSave && (
          <Button 
            onClick={onSave}
            variant="outline"
            disabled={isSaveDisabled}
            className="flex items-center"
          >
            <Save className="h-4 w-4 mr-2" /> Save progress
          </Button>
        )}
        
        {showNext && (
          <Button 
            onClick={onNext}
            variant="default"
            disabled={isNextDisabled}
            className="bg-tcof-teal hover:bg-tcof-teal/90 text-white flex items-center"
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}