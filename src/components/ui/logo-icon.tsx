import { cn } from '@/lib/utils';
import garlicSrc from '@/assets/garlic-logo.png';

interface LogoIconProps {
  className?: string;
  size?: number;
}

export function GarlicLogo({ className, size = 24 }: LogoIconProps) {
  return (
    <img
      src={garlicSrc}
      alt="GarlicBread.ai"
      width={size}
      height={size}
      className={cn('inline-block', className)}
      style={{ width: size, height: size }}
    />
  );
}