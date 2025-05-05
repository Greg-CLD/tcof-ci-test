import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning';
  onRetry?: () => void;
}

export function ErrorMessage({
  title,
  message,
  variant = 'error',
  onRetry,
}: ErrorMessageProps) {
  const Icon = variant === 'error' ? AlertOctagon : AlertTriangle;
  const colorClass = variant === 'error' ? 'text-red-500' : 'text-amber-500';
  const bgClass = variant === 'error' ? 'bg-red-50' : 'bg-amber-50';
  const defaultTitle = variant === 'error' ? 'Error' : 'Warning';

  return (
    <Card className={`p-4 ${bgClass} border-0`}>
      <div className="flex items-start gap-3">
        <div className={`${colorClass} mt-1`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className={`text-base font-medium ${colorClass}`}>
            {title || defaultTitle}
          </h3>
          <div className="mt-1 text-sm text-gray-700">{message}</div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}