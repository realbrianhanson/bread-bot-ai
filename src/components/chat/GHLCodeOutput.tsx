import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Copy, Check, Rocket, Monitor, Tablet, Smartphone, RefreshCw,
  Maximize2, X, ChevronRight, Info,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GHLCodeOutputProps {
  code: string;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const DEPLOY_STEPS = [
  { icon: '🌐', title: 'Open your GHL dashboard', desc: 'Go to Sites → Funnels or Websites' },
  { icon: '📄', title: 'Select your funnel page', desc: 'Click Edit Page on the target page' },
  { icon: '➕', title: 'Add Custom Code element', desc: 'Click + icon → Drag "Custom Code" onto the page' },
  { icon: '📋', title: 'Paste the code', desc: 'Click the Custom Code element → Paste the copied code' },
  { icon: '↔️', title: 'Set to Full Width', desc: 'Remove all padding, set section to Full Width' },
  { icon: '💾', title: 'Save & Preview', desc: 'Click Save → Preview your page' },
];

const GHLCodeOutput = ({ code }: GHLCodeOutputProps) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [copied, setCopied] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied! Paste into GHL Custom Code element');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  const viewportButtons: { key: ViewportSize; icon: typeof Monitor; label: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop' },
    { key: 'tablet', icon: Tablet, label: 'Tablet' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="absolute inset-0 flex flex-col bg-[hsl(222_47%_8%)]">
      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-[hsl(222_47%_10%)] shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground/80">GHL Preview</span>
          <Badge className="text-[9px] h-4 gap-1 bg-accent/15 text-accent border-accent/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            GHL Mode
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Viewport toggle */}
          <div className="flex items-center rounded-lg border border-border/30 bg-background/10 p-0.5 mr-1">
            {viewportButtons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewport(key)}
                className={cn(
                  'h-6 w-6 rounded-md flex items-center justify-center transition-all',
                  viewport === key
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                )}
                title={label}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={() => setIframeKey((k) => k + 1)}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={handleFullscreen}>
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ---- Preview iframe ---- */}
      <div className="flex-1 relative overflow-hidden flex items-start justify-center bg-[hsl(222_20%_12%)] p-4">
        <div
          className="relative bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: '100%',
            height: '100%',
          }}
        >
          <iframe
            ref={iframeRef}
            key={iframeKey}
            srcDoc={code}
            title="GHL Preview"
            sandbox="allow-scripts"
            className="w-full h-full border-0"
            style={{ background: '#ffffff' }}
          />
        </div>
      </div>

      {/* ---- Bottom action bar ---- */}
      <div className="shrink-0 border-t border-border/20 bg-[hsl(222_47%_10%)] px-3 py-2 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-border/30 bg-background/10 hover:bg-background/20"
          onClick={() => setShowCode((s) => !s)}
        >
          {showCode ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          {showCode ? 'Hide Code' : 'View Code'}
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs transition-all',
            copied
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-border/30 bg-background/10 hover:bg-background/20'
          )}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy Code'}
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_12px_hsl(var(--accent)/0.3)] font-semibold"
          onClick={() => setShowDeploy(true)}
        >
          <Rocket className="h-3 w-3" />
          Deploy to GHL
        </Button>
      </div>

      {/* ---- Code panel (slide up) ---- */}
      <AnimatePresence>
        {showCode && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '40%' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="shrink-0 overflow-hidden border-t border-border/20"
          >
            <div className="h-full overflow-auto">
              <SyntaxHighlighter
                language="html"
                style={oneDark as any}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: '0.75rem',
                  background: 'hsl(222 47% 8%)',
                  minHeight: '100%',
                }}
                showLineNumbers
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Deploy modal ---- */}
      <Dialog open={showDeploy} onOpenChange={setShowDeploy}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-accent" />
              Deploy to GoHighLevel
            </DialogTitle>
            <DialogDescription>Follow these steps to add your page to GHL</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {DEPLOY_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Step {i + 1}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mt-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-accent">Pro tip:</span> Replace placeholder images with your own. Replace the GHL Form placeholder with your actual form embed code.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeploy(false)}>
              Close
            </Button>
            <Button size="sm" className="flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { handleCopy(); setShowDeploy(false); }}>
              <Copy className="h-3 w-3" /> Copy Code & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GHLCodeOutput;
