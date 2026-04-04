import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface InspirationPopoverProps {
  disabled?: boolean;
  onSubmit: (url: string, content: string, ghlMode: boolean) => void;
  isLoading?: boolean;
}

const InspirationPopover = ({ disabled, onSubmit, isLoading }: InspirationPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [ghlMode, setGhlMode] = useState(false);

  const handleSubmit = () => {
    if (!url.trim() || !content.trim()) return;
    onSubmit(url.trim(), content.trim(), ghlMode);
    setOpen(false);
    setUrl('');
    setContent('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                disabled={disabled || isLoading}
                className={cn(
                  'shrink-0 mb-0.5 p-1.5 rounded-lg transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  (disabled || isLoading) && 'opacity-30 pointer-events-none'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Build from inspiration</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-4" side="top" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Inspiration Mode
            </h4>
            <p className="text-xs text-muted-foreground">
              Paste a URL and we'll build a similar page with your content.
            </p>
          </div>

          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a website URL for design inspiration..."
            className="text-xs h-8"
          />

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should YOUR page be about? (your business, your offer, your content)"
            className="text-xs min-h-[60px] resize-none"
            rows={3}
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setGhlMode((p) => !p)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border',
                ghlMode
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-border/60'
              )}
            >
              {ghlMode ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
              {ghlMode ? 'GHL Mode' : 'Standard'}
            </button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!url.trim() || !content.trim() || isLoading}
              className="h-7 text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Generate Inspired Page
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InspirationPopover;
