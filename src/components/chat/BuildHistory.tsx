import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Loader2, ExternalLink } from "lucide-react";
import { useBuildHistory } from "@/hooks/useBuildHistory";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface BuildHistoryProps {
  onOpenBuild?: (conversationId: string) => void;
}

const BuildHistory = ({ onOpenBuild }: BuildHistoryProps) => {
  const { builds, loading } = useBuildHistory();
  const [open, setOpen] = useState(false);

  const handleOpen = (conversationId: string) => {
    onOpenBuild?.(conversationId);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
          <Globe className="h-4 w-4" />
          {builds.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {builds.length > 9 ? "9+" : builds.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Builds
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : builds.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No websites built yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask the AI to build a landing page to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-160px)]">
              <div className="space-y-2 pr-4">
                {builds.map((build) => (
                  <button
                    key={build.id}
                    onClick={() => handleOpen(build.conversationId)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {build.conversationName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {build.snippet}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(build.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BuildHistory;
