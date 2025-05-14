import React from 'react';
import { useFeedback } from './feedback-context';
import { FeedbackItem } from './feedback-item';
import { createPortal } from 'react-dom';
import type { FeedbackItem as FeedbackItemType } from './feedback-context';

export function FeedbackContainer() {
  const { feedbackItems, removeFeedback } = useFeedback();
  
  // Don't render anything if there are no feedback items
  if (feedbackItems.length === 0) {
    return null;
  }
  
  // Group feedbacks by position
  const groupedByPosition: Record<string, FeedbackItemType[]> = {
    'top': [],
    'right': [],
    'bottom': [],
    'left': [],
    'center': [],
    'default': [] // For items without a specified position
  };
  
  // Group items
  feedbackItems.forEach(item => {
    const position = item.position || 'top';
    if (position in groupedByPosition) {
      groupedByPosition[position].push(item);
    } else {
      groupedByPosition.default.push(item);
    }
  });
  
  // Render feedback into the DOM via portal
  return createPortal(
    <>
      {/* Top position container */}
      {groupedByPosition.top.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm flex flex-col items-center">
          {groupedByPosition.top.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
      
      {/* Right position container */}
      {groupedByPosition.right.length > 0 && (
        <div className="fixed top-1/2 right-4 -translate-y-1/2 z-50 w-full max-w-sm flex flex-col items-end">
          {groupedByPosition.right.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
      
      {/* Bottom position container */}
      {groupedByPosition.bottom.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm flex flex-col items-center">
          {groupedByPosition.bottom.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
      
      {/* Left position container */}
      {groupedByPosition.left.length > 0 && (
        <div className="fixed top-1/2 left-4 -translate-y-1/2 z-50 w-full max-w-sm flex flex-col items-start">
          {groupedByPosition.left.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
      
      {/* Center position container */}
      {groupedByPosition.center.length > 0 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm flex flex-col items-center">
          {groupedByPosition.center.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
      
      {/* Default position (same as top) */}
      {groupedByPosition.default.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm flex flex-col items-center">
          {groupedByPosition.default.map(item => (
            <FeedbackItem key={item.id} item={item} onRemove={removeFeedback} />
          ))}
        </div>
      )}
    </>,
    document.body
  );
}