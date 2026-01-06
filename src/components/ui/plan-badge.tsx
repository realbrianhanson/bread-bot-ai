import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PlanBadgeProps {
  className?: string;
  showIcon?: boolean;
  linkToPricing?: boolean;
  size?: "sm" | "md" | "lg";
}

const tierConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  variant: "default" | "secondary" | "outline" | "destructive";
  className: string;
}> = {
  free: { 
    label: "Free", 
    icon: Star, 
    variant: "secondary",
    className: "bg-muted text-muted-foreground"
  },
  starter: { 
    label: "Starter", 
    icon: Zap, 
    variant: "default",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  pro: { 
    label: "Pro", 
    icon: Sparkles, 
    variant: "default",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  },
  lifetime: { 
    label: "Lifetime", 
    icon: Crown, 
    variant: "default",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  },
  enterprise: { 
    label: "Enterprise", 
    icon: Crown, 
    variant: "default",
    className: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30"
  }
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1"
};

export const PlanBadge = ({ 
  className, 
  showIcon = true, 
  linkToPricing = true,
  size = "sm"
}: PlanBadgeProps) => {
  const { tier, loading } = useAuth();
  
  if (loading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", sizeClasses[size], className)}>
        Loading...
      </Badge>
    );
  }

  const config = tierConfig[tier || 'free'] || tierConfig.free;
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border transition-colors",
        config.className,
        sizeClasses[size],
        linkToPricing && "cursor-pointer hover:opacity-80",
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );

  if (linkToPricing) {
    return <Link to="/pricing">{badge}</Link>;
  }

  return badge;
};
