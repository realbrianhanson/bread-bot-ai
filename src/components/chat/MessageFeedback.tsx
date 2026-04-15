import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { hasCodeBlocks, extractCodeFromResponse } from '@/lib/validateWebsite';

interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  isAssistant: boolean;
  hasCode: boolean;
  /** Files extracted from the code preview for template saving */
  codeFiles: Record<string, string>;
  /** Whether a positive-sentiment follow-up was detected */
  sentimentTriggered?: boolean;
  /** Already offered IDs to prevent re-showing */
  offeredIds: Set<string>;
  onOffered: (id: string) => void;
}

const POSITIVE_PATTERN = /\b(love|perfect|great|awesome|amazing|exactly|beautiful|stunning|nice|looks good|save this|keep this|well done|incredible|fantastic|excellent|this is it|nailed it)\b/i;

export function detectPositiveSentiment(text: string): boolean {
  return POSITIVE_PATTERN.test(text);
}

export function MessageFeedback({
  messageId,
  messageContent,
  isAssistant,
  hasCode,
  codeFiles,
  sentimentTriggered,
  offeredIds,
  onOffered,
}: MessageFeedbackProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Show suggestion on positive sentiment
  useEffect(() => {
    if (!hasCode || !isAssistant || offeredIds.has(messageId) || dismissed) return;

    if (sentimentTriggered) {
      setShowSuggestion(true);
      onOffered(messageId);
    }
  }, [sentimentTriggered, hasCode, isAssistant, messageId, offeredIds, dismissed, onOffered]);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!showSuggestion) return;
    const timer = setTimeout(() => {
      setShowSuggestion(false);
      setDismissed(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [showSuggestion]);

  if (!isAssistant || !hasCode) return null;

  return (
    <>
      {/* Thumbs up/down buttons */}
      <div className="flex items-center gap-1 mt-1">
        <button
          onClick={() => setThumbs(thumbs === 'up' ? null : 'up')}
          className={cn(
            'p-1 rounded-md transition-colors',
            thumbs === 'up'
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
          )}
        >
          <ThumbsUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => setThumbs(thumbs === 'down' ? null : 'down')}
          className={cn(
            'p-1 rounded-md transition-colors',
            thumbs === 'down'
              ? 'text-destructive bg-destructive/10'
              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
          )}
        >
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>

      {/* Template save suggestion */}
      <AnimatePresence>
        {showSuggestion && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-2 p-3 rounded-xl border border-primary/20 bg-primary/5 shadow-soft max-w-sm"
          >
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground mb-0.5">
                  This page turned out great!
                </p>
                <p className="text-[11px] text-muted-foreground mb-2.5">
                  Want to save it as a reusable template?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => {
                      setShowSaveDialog(true);
                      setShowSuggestion(false);
                    }}
                  >
                    Save as Template
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-muted-foreground"
                    onClick={() => { setShowSuggestion(false); setDismissed(true); }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={() => { setShowSuggestion(false); setDismissed(true); }}
                className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        files={codeFiles}
      />
    </>
  );
}
