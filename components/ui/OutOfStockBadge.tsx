import React from 'react';
import { cn } from '@/lib/utils';

interface OutOfStockBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ribbon' | 'overlay';
}

export function OutOfStockBadge({
  className,
  size = 'md',
  variant = 'default'
}: OutOfStockBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3'
  };

  if (variant === 'ribbon') {
    return (
      <div className={cn(
        'absolute -right-2 top-4 z-10 rotate-45 transform',
        'bg-red-600 text-white font-semibold shadow-md',
        sizeClasses[size],
        className
      )}>
        OUT OF STOCK
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn(
        'absolute inset-0 flex items-center justify-center',
        'bg-black/60 text-white font-bold tracking-wider',
        'transform rotate-[-20deg] text-2xl',
        className
      )}>
        OUT OF STOCK
      </div>
    );
  }

  // Default variant
  return (
    <span className={cn(
      'inline-flex items-center rounded-md bg-red-50 px-2 py-1',
      'text-red-700 ring-1 ring-inset ring-red-600/20 font-medium',
      sizeClasses[size],
      className
    )}>
      Out of Stock
    </span>
  );
} 