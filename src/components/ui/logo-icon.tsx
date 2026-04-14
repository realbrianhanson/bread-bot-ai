import { Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
  size?: number;
}

export function LogoIcon({ className, size = 24 }: LogoIconProps) {
  return <Wheat className={cn('text-primary', className)} size={size} />;
}