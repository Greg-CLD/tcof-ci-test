import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FeedbackCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  clickable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  feedbackDuration?: number;
  children?: React.ReactNode;
}

export function FeedbackCard({
  title,
  description,
  footer,
  clickable = false,
  selectable = false,
  selected = false,
  onSelect,
  feedbackDuration = 150,
  className,
  children,
  onClick,
  ...props
}: FeedbackCardProps) {
  const [isActive, setIsActive] = useState(false);
  const [isSelected, setIsSelected] = useState(selected);
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // Show click feedback
    if (clickable) {
      setIsActive(true);
      setTimeout(() => {
        setIsActive(false);
      }, feedbackDuration);
    }
    
    // Toggle selected state if selectable
    if (selectable) {
      const newSelectedState = !isSelected;
      setIsSelected(newSelectedState);
      
      // Call onSelect if provided
      if (onSelect) {
        onSelect(newSelectedState);
      }
    }
  };
  
  return (
    <Card
      className={cn(
        className,
        clickable ? 'cursor-pointer hover:shadow-md transition-all duration-300' : '',
        isActive ? 'ring-2 ring-primary/50 scale-[0.98]' : '',
        selectable && isSelected ? 'ring-2 ring-primary border-primary/50' : ''
      )}
      onClick={handleClick}
      {...props}
    >
      {title || description ? (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      ) : null}
      
      {children && <CardContent>{children}</CardContent>}
      
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}