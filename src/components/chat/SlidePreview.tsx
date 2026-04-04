import { Presentation, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface SlidePreviewProps {
  title: string;
  numSlides?: number;
  gammaUrl?: string;
  status?: 'generating' | 'completed' | 'failed';
  error?: string;
}

const SlidePreview = ({ title, numSlides, gammaUrl, status = 'completed', error }: SlidePreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 rounded-2xl overflow-hidden border border-border/50 shadow-soft"
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-purple-600/90 to-indigo-600/90 px-5 py-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Presentation className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm truncate">{title}</h4>
          <p className="text-white/70 text-xs">
            {status === 'generating'
              ? 'Generating presentation...'
              : status === 'failed'
              ? 'Generation failed'
              : `${numSlides || '—'} slides • Powered by Gamma`}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="bg-card px-5 py-4">
        {status === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Creating your presentation...
          </div>
        )}

        {status === 'failed' && (
          <p className="text-sm text-destructive">{error || 'Something went wrong. Please try again.'}</p>
        )}

        {status === 'completed' && gammaUrl && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => window.open(gammaUrl, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Presentation
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`${gammaUrl}/export`, '_blank')}
            >
              <Download className="h-3.5 w-3.5" />
              Download PPTX
            </Button>
          </div>
        )}

        {status === 'completed' && !gammaUrl && (
          <p className="text-sm text-muted-foreground">
            Presentation generated but no link was returned. Check the chat for details.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default SlidePreview;
