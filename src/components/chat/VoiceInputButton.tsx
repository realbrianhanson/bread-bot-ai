import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
}

export function VoiceInputButton({ isListening, isSupported, onToggle }: VoiceInputButtonProps) {
  if (!isSupported) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 shrink-0 rounded-xl transition-all duration-200",
            isListening && "bg-destructive/10 text-destructive animate-pulse"
          )}
        >
          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isListening ? "Stop listening" : "Voice input"}</TooltipContent>
    </Tooltip>
  );
}
