# Micro-Interaction Feedback System

A comprehensive feedback system for providing visual feedback to users during interactions.

## Components

### Core Components

- **FeedbackProvider**: Context provider that manages feedback state
- **FeedbackContainer**: Renders all current feedback notifications
- **FeedbackItem**: Individual notification component

### Enhanced UI Components

- **FeedbackButton**: Button with loading, success, and error states for async operations
- **FeedbackInput**: Input field with validation and visual feedback
- **FeedbackCard**: Card with click and selection feedback

## Basic Usage

1. Wrap your application with the `FeedbackProvider`:

```tsx
function App() {
  return (
    <FeedbackProvider>
      <YourApp />
      <FeedbackContainer /> {/* Add this at the app root level */}
    </FeedbackProvider>
  );
}
```

2. Use the feedback hook in your components:

```tsx
import { useFeedback } from '@/hooks/use-feedback';

function YourComponent() {
  const { showSuccess, showError } = useFeedback();
  
  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('Data saved successfully!');
    } catch (error) {
      showError('Failed to save data');
    }
  };
  
  return (
    <button onClick={handleSave}>Save</button>
  );
}
```

## Available Hooks

### Basic Hook

```tsx
import { useFeedback } from '@/components/ui/feedback';
```

Provides direct access to the core feedback methods:

- `showSuccess(message, options)`
- `showError(message, options)`
- `showInfo(message, options)`
- `showWarning(message, options)`
- `showLoading(message, options)`
- `removeFeedback(id)`

### Enhanced Hook

```tsx
import { useFeedback } from '@/hooks/use-feedback';
```

Includes all basic methods plus convenience methods:

- `notifyFormSuccess(message?)`
- `notifyFormError(message?)`
- `notifySaveSuccess(message?)`
- `notifySaveError(message?)`
- `notifyCreateSuccess(message?)`
- `notifyCreateError(message?)`
- `notifyUpdateSuccess(message?)`
- `notifyUpdateError(message?)`
- `notifyDeleteSuccess(message?)`
- `notifyDeleteError(message?)`
- `withLoadingFeedback(promise, options)`

## Enhanced Components Usage

### FeedbackButton

```tsx
<FeedbackButton
  onClickAsync={async () => await saveData()}
  successText="Saved successfully!"
  errorText="Failed to save"
  loadingText="Saving..."
>
  Save Data
</FeedbackButton>
```

### FeedbackInput

```tsx
<FeedbackInput
  label="Email"
  placeholder="Enter your email"
  helperText="We'll never share your email"
  successText="Valid email format"
  validator={(value) => {
    if (!value) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email format';
    return true;
  }}
/>
```

### FeedbackCard

```tsx
<FeedbackCard
  title="Clickable Card"
  description="Click me for feedback"
  clickable
  selectable
  onSelect={(selected) => console.log('Selected:', selected)}
>
  Card content here
</FeedbackCard>
```

## Advanced Features

### Feedback Positioning

Control where notifications appear:

```tsx
showSuccess('Operation successful', { position: 'top' }); // default
showError('Operation failed', { position: 'bottom' });
showInfo('Did you know?', { position: 'right' });
showWarning('Be careful', { position: 'left' });
showLoading('Processing...', { position: 'center' });
```

### Automatic Promise Handling

Show loading, success, and error states automatically:

```tsx
const { withLoadingFeedback } = useFeedback();

const handleClick = () => {
  withLoadingFeedback(
    fetchData(), // Your promise
    {
      loadingMessage: 'Fetching data...',
      successMessage: 'Data loaded successfully!',
      errorMessage: 'Failed to load data'
    }
  );
};
```

## Demo Page

Visit `/feedback-demo` to see a demonstration of all feedback components and features.