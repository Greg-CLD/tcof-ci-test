// Re-export with specific naming to avoid conflicts
import { FeedbackProvider, useFeedback, FeedbackType, FeedbackContextType, FeedbackItem as FeedbackItemType } from './feedback-context';
import { FeedbackItem as FeedbackItemComponent } from './feedback-item';
import { FeedbackContainer } from './feedback-container';
import { FeedbackButton } from './feedback-button';
import { FeedbackInput } from './feedback-input';
import { FeedbackCard } from './feedback-card';

export {
  FeedbackProvider,
  useFeedback,
  FeedbackType,
  FeedbackContextType,
  FeedbackItemType,
  FeedbackItemComponent as FeedbackItem,
  FeedbackContainer,
  FeedbackButton,
  FeedbackInput,
  FeedbackCard
};