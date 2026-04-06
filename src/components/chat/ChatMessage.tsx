import { Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Copy, Check, Bot, User, CheckCircle2, Sparkles, AlertTriangle, Download, ImagePlus, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import CodeExecutionResult from './CodeExecutionResult';
import SandboxComputerView from './SandboxComputerView';
import FileAttachment from './FileAttachment';
import SlidePreview from './SlidePreview';
import AuditResults from './AuditResults';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MermaidDiagram = lazy(() => import('./MermaidDiagram'));

interface ChatMessageProps {
  message: Message;
  onInsertImage?: (imageUrl: string) => void;
  onRegenerateImage?: (prompt: string) => void;
}

const ChatMessage = ({ message, onInsertImage, onRegenerateImage }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showTime, setShowTime] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const timestamp = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('flex gap-2.5 group', isUser ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start', 'max-w-[82%]')}>
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-glow'
              : 'bg-card border border-border/60 text-foreground rounded-tl-sm shadow-soft'
          )}
        >
          {isUser ? (
            <div>
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              {message.metadata?.files && (
                <div className="mt-2 space-y-1">
                  {(message.metadata.files as Array<{ name: string; size: number; type: string; url?: string; preview?: string }>).map((f, i) => (
                    <FileAttachment
                      key={i}
                      file={{ ...f, thumbnailUrl: f.type?.startsWith('image/') ? f.url : undefined }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-headings:mt-3 prose-headings:mb-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const codeId = `${message.id}-${codeString.substring(0, 20)}`;
                    const isInline = !className;

                    if (!isInline && match && match[1] === 'mermaid') {
                      return (
                        <Suspense fallback={<div className="animate-pulse bg-muted h-32 rounded-lg" />}>
                          <MermaidDiagram chart={codeString} />
                        </Suspense>
                      );
                    }

                    return !isInline && match ? (
                      <div className="relative group/code my-2 rounded-xl overflow-hidden border border-border/50">
                        {/* Language label + copy */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220_13%_14%)] border-b border-border/30">
                          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{match[1]}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(codeString, codeId)}
                          >
                            {copiedCode === codeId ? (
                              <><Check className="h-3 w-3 mr-1" />Copied</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1" />Copy</>
                            )}
                          </Button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8125rem', background: 'hsl(220 13% 11%)' }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs font-mono text-foreground/90" {...rest}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Code execution results — full computer view */}
          {message.metadata?.type === 'code_execution' && (
            <div className="mt-3 -mx-4 -mb-3">
              <SandboxComputerView
                code={message.metadata.code}
                language={message.metadata.language || 'python'}
                status={message.metadata.stderr && !message.metadata.stdout ? 'failed' : 'completed'}
                output={{
                  stdout: message.metadata.stdout || '',
                  stderr: message.metadata.stderr || '',
                  result: message.metadata.result || '',
                }}
                executionTime={message.metadata.executionTime}
                files={message.metadata.files}
              />
            </div>
          )}

          {/* Slides generation preview */}
          {message.metadata?.type === 'slides_generation' && (
            <SlidePreview
              title={message.metadata.title || 'Presentation'}
              numSlides={message.metadata.numSlides}
              gammaUrl={message.metadata.gammaUrl}
              status="completed"
            />
          )}

          {/* CRO Audit results */}
          {message.metadata?.type === 'cro_audit' && (
            <AuditResults
              content={message.content}
              url={message.metadata.auditUrl || ''}
            />
          )}

          {/* AI Generated Image */}
          {message.metadata?.type === 'ai_image' && message.metadata.imageUrl && (
            <div className="mt-3 space-y-2">
              <img
                src={message.metadata.imageUrl}
                alt={message.metadata.prompt || 'AI generated image'}
                className="w-full rounded-lg border border-border/50"
                loading="lazy"
              />
              <div className="flex flex-wrap gap-1.5">
                {onInsertImage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onInsertImage(message.metadata.imageUrl)}
                  >
                    <ImagePlus className="h-3 w-3" />
                    Insert into Page
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = message.metadata.imageUrl;
                    a.download = `ai-image-${Date.now()}.png`;
                    a.click();
                  }}
                >
                  <Download className="h-3 w-3" />
                  Download PNG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={async () => {
                    try {
                      const resp = await fetch(message.metadata.imageUrl);
                      const blob = await resp.blob();
                      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                      toast({ title: 'Image copied to clipboard' });
                    } catch {
                      navigator.clipboard.writeText(message.metadata.imageUrl);
                      toast({ title: 'Image URL copied' });
                    }
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copy Image
                </Button>
                {onRegenerateImage && message.metadata.prompt && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onRegenerateImage(message.metadata.prompt)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Generate Variation
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Image generating skeleton */}
          {message.metadata?.type === 'image_generating' && (
            <div className="mt-3 w-full h-48 rounded-lg bg-muted/50 animate-pulse flex items-center justify-center">
              <div className="text-center space-y-2">
                <Sparkles className="h-6 w-6 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Generating image...</p>
              </div>
            </div>
          )}

          {/* Screenshots */}
          {message.metadata?.screenshots && message.metadata.screenshots.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {message.metadata.screenshots.map((screenshot: string, idx: number) => (
                <img key={idx} src={screenshot} alt={`Screenshot ${idx + 1}`} className="rounded-lg border border-border/50 w-full" />
              ))}
            </div>
          )}

          {/* Design validation badge */}
          {message.metadata?.validation && (
            <div className="mt-2 flex items-center gap-1.5">
              {message.metadata.validation.passed && !message.metadata.validation.autoFixed && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5">
                  <CheckCircle2 className="h-3 w-3" />
                  Design validated
                </Badge>
              )}
              {message.metadata.validation.autoFixed && message.metadata.validation.retryPassed && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-primary/30 text-primary bg-primary/5">
                  <Sparkles className="h-3 w-3" />
                  Auto-improved
                </Badge>
              )}
              {message.metadata.validation.autoFixed && !message.metadata.validation.retryPassed && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                  <AlertTriangle className="h-3 w-3" />
                  Review contrast
                </Badge>
              )}
              {!message.metadata.validation.passed && !message.metadata.validation.autoFixed && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                  <AlertTriangle className="h-3 w-3" />
                  Review contrast
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className={cn('text-[10px] text-muted-foreground/50 px-1 transition-opacity duration-200', showTime ? 'opacity-100' : 'opacity-0')}>
            {timestamp}
          </span>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;
