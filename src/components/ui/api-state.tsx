import * as React from 'react';
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// API State Types
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiState<T = unknown> {
  status: ApiStatus;
  data: T | null;
  error: string | null;
}

// Create initial state helper
export function createApiState<T>(): ApiState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

// Loading State Component
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inline?: boolean;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md',
  className,
  inline = false 
}: LoadingStateProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textSizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Loader2 className={cn(sizeMap[size], "animate-spin text-muted-foreground")} />
        <span className={cn(textSizeMap[size], "text-muted-foreground")}>{message}</span>
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-8 gap-3", className)}>
      <Loader2 className={cn(sizeMap[size], "animate-spin text-primary")} />
      <p className={cn(textSizeMap[size], "text-muted-foreground")}>{message}</p>
    </div>
  );
}

// Error State Component
interface ErrorStateProps {
  message?: string;
  error?: string | Error | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ 
  message = 'Something went wrong', 
  error,
  onRetry,
  className,
  compact = false 
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20",
        className
      )}>
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive flex-1">{message}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-destructive/20 bg-destructive/5", className)}>
      <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="p-3 rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium text-destructive">{message}</p>
          {errorMessage && (
            <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Success State Component
interface SuccessStateProps {
  message?: string;
  description?: string;
  className?: string;
  autoHide?: boolean;
  onHide?: () => void;
}

export function SuccessState({ 
  message = 'Success!', 
  description,
  className,
  autoHide = false,
  onHide
}: SuccessStateProps) {
  React.useEffect(() => {
    if (autoHide && onHide) {
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onHide]);

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20",
      className
    )}>
      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      <div>
        <p className="font-medium text-green-700 dark:text-green-400">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon,
  title, 
  description,
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      {icon && (
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Offline State Component
interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className }: OfflineStateProps) {
  return (
    <Card className={cn("border-yellow-500/20 bg-yellow-500/5", className)}>
      <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="p-3 rounded-full bg-yellow-500/10">
          <WifiOff className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium text-yellow-700 dark:text-yellow-400">You're offline</p>
          <p className="text-sm text-muted-foreground">
            Check your connection and try again
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// API State Wrapper Component
interface ApiStateWrapperProps<T> {
  state: ApiState<T>;
  loadingMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
}

export function ApiStateWrapper<T>({
  state,
  loadingMessage,
  errorMessage,
  onRetry,
  children,
  loadingComponent,
  errorComponent,
  emptyState,
  isEmpty,
}: ApiStateWrapperProps<T>) {
  if (state.status === 'loading') {
    return loadingComponent ? <>{loadingComponent}</> : <LoadingState message={loadingMessage} />;
  }

  if (state.status === 'error') {
    return errorComponent ? (
      <>{errorComponent}</>
    ) : (
      <ErrorState message={errorMessage} error={state.error} onRetry={onRetry} />
    );
  }

  if (state.data === null) {
    return emptyState ? <>{emptyState}</> : null;
  }

  if (isEmpty && isEmpty(state.data)) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return <>{children(state.data)}</>;
}
