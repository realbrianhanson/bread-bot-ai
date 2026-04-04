import { Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Copy, Check, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import CodeExecutionResult from './CodeExecutionResult';
import SandboxComputerView from './SandboxComputerView';
import FileAttachment from './FileAttachment';
import SlidePreview from './SlidePreview';

const MermaidDiagram = lazy(() => import('./MermaidDiagram'));

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
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

          {/* Screenshots */}
          {message.metadata?.screenshots && message.metadata.screenshots.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {message.metadata.screenshots.map((screenshot: string, idx: number) => (
                <img key={idx} src={screenshot} alt={`Screenshot ${idx + 1}`} className="rounded-lg border border-border/50 w-full" />
              ))}
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
