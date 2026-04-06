import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Copy, Check, Rocket, Monitor, Tablet, Smartphone, RefreshCw,
  Maximize2, X, ChevronRight, Info, Loader2, CheckCircle2,
  ExternalLink, RotateCcw, Globe, Link, Undo2, Redo2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBrowserProfiles } from '@/hooks/useBrowserProfiles';

type DeployStatus = 'idle' | 'deploying' | 'completed' | 'failed';

interface GHLCodeOutputProps {
  code: string;
  onExecuteTask?: (task: string, projectId?: string, profileId?: string) => Promise<string | undefined>;
  currentTaskScreenshots?: string[];
  isExecutingTask?: boolean;
  projectId?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPublish?: () => void;
  isPublishing?: boolean;
  publishedSlug?: string | null;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const MANUAL_DEPLOY_STEPS = [
  { icon: '🌐', title: 'Open your GHL dashboard', desc: 'Go to Sites → Funnels or Websites' },
  { icon: '📄', title: 'Select your funnel page', desc: 'Click Edit Page on the target page' },
  { icon: '➕', title: 'Add Custom Code element', desc: 'Click + icon → Drag "Custom Code" onto the page' },
  { icon: '📋', title: 'Paste the code', desc: 'Click the Custom Code element → Paste the copied code' },
  { icon: '↔️', title: 'Set to Full Width', desc: 'Remove all padding, set section to Full Width' },
  { icon: '💾', title: 'Save & Preview', desc: 'Click Save → Preview your page' },
];

const DEPLOY_PROGRESS_STEPS = [
  'Connecting to GHL...',
  'Navigating to funnel...',
  'Adding code element...',
  'Pasting code...',
  'Saving page...',
  'Deployment complete!',
];

const GHLCodeOutput = ({
  code,
  onExecuteTask,
  currentTaskScreenshots,
  isExecutingTask,
  projectId,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onPublish,
  isPublishing = false,
  publishedSlug,
}: GHLCodeOutputProps) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showManualDeploy, setShowManualDeploy] = useState(false);
  const [showAutoDeploy, setShowAutoDeploy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Deploy form state
  const [ghlUrl, setGhlUrl] = useState(() => localStorage.getItem('ghl-deploy-url') || '');
  const [funnelName, setFunnelName] = useState('');
  const [pageName, setPageName] = useState('');
  const [deployProfileId, setDeployProfileId] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle');
  const [deployStep, setDeployStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const { profiles, isLoading: profilesLoading } = useBrowserProfiles();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied! Paste into GHL Custom Code element');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  const handleSharePreview = async () => {
    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to share previews.'); return; }

      const titleMatch = code.match(/<title[^>]*>([^<]+)<\/title>/i) || code.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch?.[1]?.trim() || 'Untitled Page';

      // Check for existing share for this conversation (use projectId as conversation key)
      const conversationKey = projectId || undefined;
      let shareId: string;

      if (conversationKey) {
        const { data: existing } = await supabase
          .from('shared_previews')
          .select('share_id')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationKey)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('shared_previews')
            .update({ html_content: code, title })
            .eq('share_id', existing.share_id);
          shareId = existing.share_id;
        } else {
          const { data, error } = await supabase
            .from('shared_previews')
            .insert({ user_id: user.id, html_content: code, title, conversation_id: conversationKey })
            .select('share_id')
            .single();
          if (error) throw error;
          shareId = data.share_id;
        }
      } else {
        const { data, error } = await supabase
          .from('shared_previews')
          .insert({ user_id: user.id, html_content: code, title })
          .select('share_id')
          .single();
        if (error) throw error;
        shareId = data.share_id;
      }

      const shareUrl = `${window.location.origin}/preview/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      toast.success('Preview link copied!', { description: 'Anyone with this link can view your page.' });
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Failed to create share link.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleAutoDeploy = useCallback(async () => {
    if (!onExecuteTask) {
      toast.error('Browser automation is not available');
      return;
    }
    if (!ghlUrl.trim()) {
      toast.error('Please enter your GHL URL');
      return;
    }
    if (!funnelName.trim()) {
      toast.error('Please enter the funnel/website name');
      return;
    }
    if (!pageName.trim()) {
      toast.error('Please enter the page name');
      return;
    }

    // Persist the GHL URL for next time
    localStorage.setItem('ghl-deploy-url', ghlUrl.trim());

    setDeployStatus('deploying');
    setDeployStep(0);
    setShowAutoDeploy(false);

    // Simulate progress steps while the task runs
    const stepInterval = setInterval(() => {
      setDeployStep((prev) => Math.min(prev + 1, DEPLOY_PROGRESS_STEPS.length - 2));
    }, 8000);

    // Truncate code if extremely long to keep the prompt manageable
    const codeSnippet = code.length > 15000
      ? code.substring(0, 15000) + '\n<!-- CODE TRUNCATED FOR PROMPT -->'
      : code;

    const taskPrompt = `Navigate to ${ghlUrl.trim()}. Go to Sites, then find Funnels or Websites. Find the funnel or website called "${funnelName.trim()}". Click Edit on the page called "${pageName.trim()}". In the page builder, click the + icon to add a new element. Find and drag the "Custom Code" or "Custom JS/HTML" element into the page. Click on the Custom Code element to open its settings/editor. Paste the following HTML code into the Custom Code element:\n\n${codeSnippet}\n\nAfter pasting, click Save. Then click Preview to verify the page looks correct.`;

    try {
      await onExecuteTask(
        taskPrompt,
        projectId,
        deployProfileId || undefined
      );

      clearInterval(stepInterval);
      setDeployStep(DEPLOY_PROGRESS_STEPS.length - 1);
      setDeployStatus('completed');
      setShowSuccess(true);
    } catch (err: any) {
      clearInterval(stepInterval);
      setDeployStatus('failed');
      toast.error(err.message || 'Deployment failed');
    }
  }, [code, ghlUrl, funnelName, pageName, deployProfileId, onExecuteTask, projectId]);

  const handleDeployAnother = () => {
    setShowSuccess(false);
    setDeployStatus('idle');
    setDeployStep(0);
    setFunnelName('');
    setPageName('');
    setShowAutoDeploy(true);
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
          <div className="flex items-center gap-0.5 mr-1">
            <Button variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground/60 hover:text-foreground ${!canUndo ? 'opacity-30 pointer-events-none' : ''}`} onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground/60 hover:text-foreground ${!canRedo ? 'opacity-30 pointer-events-none' : ''}`} onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="h-3 w-3" />
            </Button>
          </div>
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

          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={handleSharePreview} disabled={isSharing}>
            {isSharing ? <Loader2 className="h-3 w-3 animate-spin" /> : shareCopied ? <Check className="h-3 w-3 text-green-500" /> : <Link className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={() => setIframeKey((k) => k + 1)}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={handleFullscreen}>
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ---- Deploy progress overlay ---- */}
      <AnimatePresence>
        {deployStatus === 'deploying' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-background/90 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="max-w-sm w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-accent animate-spin" />
                <span className="text-sm font-semibold text-foreground">Deploying to GHL...</span>
              </div>
              <div className="space-y-2">
                {DEPLOY_PROGRESS_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i < deployStep ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : i === deployStep ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-border/40 shrink-0" />
                    )}
                    <span className={cn(
                      'text-xs',
                      i <= deployStep ? 'text-foreground' : 'text-muted-foreground/50'
                    )}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Watch the browser live in the task panel. You can intervene if needed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Success overlay ---- */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="max-w-sm w-full mx-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Page Deployed to GHL!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your landing page has been added to "{funnelName}"
                </p>
              </div>

              {currentTaskScreenshots && currentTaskScreenshots.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-border/30">
                  <img
                    src={currentTaskScreenshots[currentTaskScreenshots.length - 1]}
                    alt="Final deployment screenshot"
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => {
                    const url = ghlUrl.startsWith('http') ? ghlUrl : `https://${ghlUrl}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View in GHL
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={handleDeployAnother}
                >
                  <RotateCcw className="h-3 w-3" />
                  Deploy Another
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-border/30 bg-background/10 hover:bg-background/20"
          onClick={() => setShowManualDeploy(true)}
        >
          <ChevronRight className="h-3 w-3" />
          Manual Steps
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
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs transition-all',
            shareCopied
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-border/30 bg-background/10 hover:bg-background/20'
          )}
          onClick={handleSharePreview}
          disabled={isSharing}
        >
          {isSharing ? <Loader2 className="h-3 w-3 animate-spin" /> : shareCopied ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
          {shareCopied ? 'Copied!' : 'Share'}
        </Button>

        <Button
          className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_12px_hsl(var(--accent)/0.3)] font-semibold"
          onClick={() => setShowAutoDeploy(true)}
          disabled={isExecutingTask}
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

      {/* ---- Manual deploy steps modal ---- */}
      <Dialog open={showManualDeploy} onOpenChange={setShowManualDeploy}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              Manual Deploy Steps
            </DialogTitle>
            <DialogDescription>Follow these steps to add your page to GHL manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {MANUAL_DEPLOY_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
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
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowManualDeploy(false)}>
              Close
            </Button>
            <Button size="sm" className="flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { handleCopy(); setShowManualDeploy(false); }}>
              <Copy className="h-3 w-3" /> Copy Code & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Auto deploy modal ---- */}
      <Dialog open={showAutoDeploy} onOpenChange={setShowAutoDeploy}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-accent" />
              Deploy to GoHighLevel
            </DialogTitle>
            <DialogDescription>
              Browser automation will navigate to your GHL funnel and paste the code automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ghl-url" className="text-xs font-medium">GHL Dashboard URL</Label>
              <Input
                id="ghl-url"
                placeholder="app.gohighlevel.com or your white-label domain"
                value={ghlUrl}
                onChange={(e) => setGhlUrl(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funnel-name" className="text-xs font-medium">Funnel / Website Name</Label>
              <Input
                id="funnel-name"
                placeholder="e.g., My Marketing Funnel"
                value={funnelName}
                onChange={(e) => setFunnelName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-name" className="text-xs font-medium">Page Name</Label>
              <Input
                id="page-name"
                placeholder="e.g., Landing Page or Step 1"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Browser Profile</Label>
              <Select
                value={deployProfileId || 'none'}
                onValueChange={(v) => setDeployProfileId(v === 'none' ? null : v)}
                disabled={profilesLoading}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select a profile with GHL login" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No profile (fresh session)</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Select a profile where you're already logged into GHL, or be ready to log in during the task.
              </p>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-start gap-2">
                <Globe className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Make sure you're logged into GHL in your browser profile. The automation will navigate to your funnel, add a Custom Code element, and paste the generated code.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAutoDeploy(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              onClick={handleAutoDeploy}
              disabled={!ghlUrl.trim() || !funnelName.trim() || !pageName.trim()}
            >
              <Rocket className="h-3 w-3" />
              Deploy Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GHLCodeOutput;
