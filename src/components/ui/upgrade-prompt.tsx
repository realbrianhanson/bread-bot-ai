import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  featureId?: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: "inline" | "card" | "banner";
}

export const UpgradePrompt = ({
  featureId,
  title = "Upgrade to unlock",
  description = "Get access to more features with a premium plan",
  className,
  variant = "inline"
}: UpgradePromptProps) => {
  const featureMessages: Record<string, string> = {
    chat_messages: "You've reached your chat message limit for this month.",
    browser_tasks: "You've reached your browser task limit for this month."
  };

  const message = featureId ? featureMessages[featureId] : description;

  if (variant === "banner") {
    return (
      <div className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg",
        "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/pricing">
            Upgrade <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("border-purple-500/20", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/pricing">
              View Plans <Zap className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground",
      className
    )}>
      <Sparkles className="w-4 h-4 text-purple-400" />
      <span>{message}</span>
      <Button asChild variant="link" size="sm" className="h-auto p-0">
        <Link to="/pricing">Upgrade</Link>
      </Button>
    </div>
  );
};

interface FeatureGateProps {
  featureId: string;
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate = ({
  featureId,
  allowed,
  children,
  fallback,
  showUpgradePrompt = true
}: FeatureGateProps) => {
  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt featureId={featureId} variant="card" />;
  }

  return null;
};
