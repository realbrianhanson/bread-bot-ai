import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import TaskStatus from './TaskStatus';
import LiveBrowserView from './LiveBrowserView';
import OrchestrationProgress from './OrchestrationProgress';
import GHLTemplateGallery from './GHLTemplateGallery';
import FirecrawlResults, { FirecrawlResult } from './FirecrawlResults';
import { MessageFeedback, detectPositiveSentiment } from './MessageFeedback';
import { Message } from '@/hooks/useChat';
import { BrowserTask } from '@/hooks/useBrowserTask';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowDown, Sparkles, Terminal, Search, FileText, Loader2, LayoutGrid, Pencil, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { hasCodeBlocks, extractCodeFromResponse } from '@/lib/validateWebsite';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  onSendMessage: (content: string, options?: { ghlMode?: boolean; extraContext?: string }) => void;
  onStopStreaming: () => void;
  currentTask?: BrowserTask | null;
  isExecutingTask?: boolean;
  onExecuteTask?: (task: string, projectId?: string, profileId?: string) => void;
  onStopTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  isStopping?: boolean;
  isPausing?: boolean;
  isResuming?: boolean;
  projectId?: string;
  selectedProfileId?: string | null;
  hideTaskPreview?: boolean;
  onSlashCommand?: (command: string) => void;
  onInspire?: (url: string, content: string, ghlMode: boolean) => void;
  isInspirationLoading?: boolean;
  activeCode?: { html: string; css: string; js: string } | null;
  onClearActiveCode?: () => void;
  codeHistoryIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const TASK_SOURCE_URL_REGEX = /https?:\/\/[^\s"'`<>]+/g;

const extractTaskSourceUrls = (value: unknown, urls: Set<string> = new Set()): string[] => {
  if (!value) return Array.from(urls);

  if (typeof value === 'string') {
    const matches = value.match(TASK_SOURCE_URL_REGEX) || [];
    matches.forEach((match) => urls.add(match.replace(/[),.;]+$/, '')));
    return Array.from(urls);
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractTaskSourceUrls(item, urls));
    return Array.from(urls);
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => extractTaskSourceUrls(item, urls));
  }

  return Array.from(urls);
};

const buildBrowserTaskContext = (task?: BrowserTask | null) => {
  if (!task) return null;

  const hasMeaningfulOutput =
    Boolean(task.taskSummary?.trim()) ||
    Boolean(task.error_message?.trim()) ||
    Boolean(task.extractedData && Object.keys(task.extractedData).length > 0);

  if (!hasMeaningfulOutput) return null;

  const sections: string[] = [];

  if (task.taskDescription?.trim()) {
    sections.push(`Original browser task: ${task.taskDescription.trim()}`);
  }

  if (task.taskSummary?.trim()) {
    sections.push(`Task summary:\n${task.taskSummary.trim().slice(0, 1000)}`);
  }

  if (task.extractedData && Object.keys(task.extractedData).length > 0) {
    sections.push(`Extracted data:\n${JSON.stringify(task.extractedData, null, 2).slice(0, 1200)}`);
  }

  if (task.error_message?.trim() && task.status !== 'completed') {
    sections.push(`Task error:\n${task.error_message.trim().slice(0, 500)}`);
  }

  const sourceUrls = extractTaskSourceUrls([
    task.liveUrl,
    task.actions,
    task.steps,
    task.extractedData,
    task.taskSummary,
    task.deliverables,
  ]).slice(0, 12);

  if (sourceUrls.length > 0) {
    sections.push(`Possible source URLs:\n${sourceUrls.map((url, index) => `${index + 1}. ${url}`).join('\n')}`);
  }

  if (sections.length === 0) return null;

  return `[RECENT BROWSER TASK]\nStatus: ${task.status}\n\n${sections.join('\n\n')}`;
};
const ChatContainer = ({
  messages,
  isLoading,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  currentTask,
  isExecutingTask,
  onExecuteTask,
  onStopTask,
  onPauseTask,
  onResumeTask,
  isStopping = false,
  isPausing = false,
  isResuming = false,
  projectId,
  selectedProfileId,
  hideTaskPreview = false,
  onSlashCommand,
  onInspire,
  isInspirationLoading,
  activeCode,
  onClearActiveCode,
  codeHistoryIndex,
  canUndo: _canUndo,
  canRedo: _canRedo,
  onUndo: _onUndo,
  onRedo: _onRedo,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const orchestrator = useOrchestrator();
  const [firecrawlResults, setFirecrawlResults] = useState<FirecrawlResult[]>([]);
  const [isFirecrawling, setIsFirecrawling] = useState(false);
  const [firecrawlStatus, setFirecrawlStatus] = useState('');
  const [inputPrefill, setInputPrefill] = useState('');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const isGhlMode = typeof window !== 'undefined' && localStorage.getItem('ghl-mode') === 'true';
  const [offeredTemplateIds, setOfferedTemplateIds] = useState<Set<string>>(new Set());

  // Detect which assistant messages should show template suggestion due to positive follow-up
  const sentimentTriggeredIds = new Set<string>();
  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user' && detectPositiveSentiment(msg.content)) {
      // Find the preceding assistant message with code
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === 'assistant' && hasCodeBlocks(messages[j].content)) {
          sentimentTriggeredIds.add(messages[j].id);
          break;
        }
      }
    }
  }

  const handleOffered = useCallback((id: string) => {
    setOfferedTemplateIds((prev) => new Set(prev).add(id));
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTask, firecrawlResults]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  /* ---- Firecrawl helpers ---- */
  const handleScrape = useCallback(async (url: string) => {
    setIsFirecrawling(true);
    setFirecrawlStatus(`Scraping ${url}…`);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url, options: { formats: ['markdown'] } },
      });
      if (error) throw error;

      const md = data?.data?.markdown || data?.markdown || '';
      const title = data?.data?.metadata?.title || data?.metadata?.title || '';
      const wordCount = md ? md.split(/\s+/).length : 0;

      const result: FirecrawlResult = { type: 'scrape', url, title, markdown: md, wordCount };
      setFirecrawlResults((prev) => [...prev, result]);

      // Persist as a message so the AI has context for follow-ups
      const summaryContent = `📄 **Scraped: ${title || url}**\n- URL: ${url}\n- Words: ${wordCount}\n\n${md.slice(0, 3000)}${md.length > 3000 ? '\n\n…(truncated)' : ''}`;
      onSendMessage(summaryContent, { ghlMode: false });

    } catch (err: any) {
      toast({ title: 'Scrape failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsFirecrawling(false);
      setFirecrawlStatus('');
    }
  }, [onSendMessage]);

  const handleCrawl = useCallback(async (url: string) => {
    setIsFirecrawling(true);
    setFirecrawlStatus(`Crawling ${url}…`);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-crawl', {
        body: { url },
      });
      if (error) throw error;

      const pages = (data?.data || []).map((p: any) => ({
        url: p.metadata?.sourceURL || p.url || '',
        title: p.metadata?.title || '',
      }));
      const result: FirecrawlResult = { type: 'crawl', url, pages, total: data?.total || pages.length };
      setFirecrawlResults((prev) => [...prev, result]);

      // Persist as a message so the AI has context for follow-ups
      const pagesList = pages.slice(0, 20).map((p: any, i: number) => `${i + 1}. ${p.title || p.url} - ${p.url}`).join('\n');
      const summaryContent = `🕷️ **Crawled: ${url}**\nFound ${pages.length} pages:\n\n${pagesList}`;
      onSendMessage(summaryContent, { ghlMode: false });
    } catch (err: any) {
      toast({ title: 'Crawl failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsFirecrawling(false);
      setFirecrawlStatus('');
    }
  }, [onSendMessage]);

  const handleSearch = useCallback(async (query: string) => {
    setIsFirecrawling(true);
    setFirecrawlStatus(`Searching "${query}"…`);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-search', {
        body: { query },
      });
      if (error) throw error;

      const results = (data?.data || []).map((r: any) => ({
        url: r.url || '',
        title: r.title || r.metadata?.title || '',
        description: r.description || '',
      }));
      const result: FirecrawlResult = { type: 'search', query, results };
      setFirecrawlResults((prev) => [...prev, result]);

      // Persist as a message so the AI has context for follow-ups
      const resultsList = results.slice(0, 10).map((r: any, i: number) => `${i + 1}. **${r.title || r.url}**\n   ${r.url}\n   ${r.description || ''}`).join('\n\n');
      const summaryContent = `🔍 **Search results for "${query}"** (${results.length} results):\n\n${resultsList}`;
      onSendMessage(summaryContent, { ghlMode: false });
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsFirecrawling(false);
      setFirecrawlStatus('');
    }
  }, [onSendMessage]);

  const handleSendToAI = useCallback((content: string) => {
    onSendMessage(content);
  }, [onSendMessage]);

  const handleSaveAsFile = useCallback(async (content: string, title: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-file', {
        body: { type: 'markdown', content, title, filename: title.replace(/\s+/g, '-').toLowerCase() },
      });
      if (error) throw error;
      if (data?.fileUrl) {
        window.open(data.fileUrl, '_blank');
        toast({ title: 'File created', description: data.filename });
      }
    } catch (err: any) {
      toast({ title: 'File generation failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  }, []);

  const handleSendMessage = (content: string, options?: { ghlMode?: boolean; extraContext?: string }) => {
    const trimmedContent = content.trim();
    
    if (trimmedContent.startsWith('/browse')) {
      const task = trimmedContent.replace(/^\/browse\s*/, '').trim();
      if (task && onExecuteTask) {
        onExecuteTask(task, projectId, selectedProfileId || undefined);
        return;
      }
      if (!task) return;
    }

    // Firecrawl commands
    const scrapeMatch = trimmedContent.match(/^\/scrape\s+(.+)/i);
    if (scrapeMatch) {
      handleScrape(scrapeMatch[1].trim());
      return;
    }
    const crawlMatch = trimmedContent.match(/^\/crawl\s+(.+)/i);
    if (crawlMatch) {
      handleCrawl(crawlMatch[1].trim());
      return;
    }
    const searchMatch = trimmedContent.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      handleSearch(searchMatch[1].trim());
      return;
    }

    // Route /research and /deep commands to orchestrator
    const researchMatch = trimmedContent.match(/^\/(research|deep)\s+(.+)/s);
    if (researchMatch) {
      const query = researchMatch[2].trim();
      if (query) {
        onSendMessage(content, options);
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        orchestrator.orchestrate(query, history);
        return;
      }
    }
    
    // Handle /document command — generate an HTML document from gathered research
    const documentMatch = trimmedContent.match(/^\/document\s*(.*)/i);
    if (documentMatch) {
      const topic = documentMatch[1].trim() || 'Research Report';
      if (firecrawlResults.length > 0) {
        // Build context from all gathered results
        const allContext = firecrawlResults.map((r) => {
          if (r.type === 'scrape') return `[SCRAPED: ${r.url}]\nTitle: ${r.title || 'Untitled'}\n${(r.markdown || '').slice(0, 4000)}`;
          if (r.type === 'search') return `[SEARCH: "${r.query}"]\n${r.results.map((s, i) => `${i + 1}. ${s.title} - ${s.url}\n   ${s.description || ''}`).join('\n')}`;
          if (r.type === 'crawl') return `[CRAWL: ${r.url}]\n${r.pages.map((p, i) => `${i + 1}. ${p.title || p.url}`).join('\n')}`;
          return '';
        }).filter(Boolean).join('\n\n---\n\n');

        const docPrompt = `Create a professional, well-formatted HTML document titled "${topic}" using the following research data. Make it look like a polished report with a clean header, organized sections with headings, bullet points, and a summary. Use inline CSS for styling (modern typography, good spacing, professional colors). Output as three code blocks: html, css, javascript.\n\nRESEARCH DATA:\n${allContext}`;
        onSendMessage(docPrompt, options);
      } else {
        const docPrompt = `Create a professional, well-formatted HTML document titled "${topic}". Make it look like a polished report with a clean header, organized sections with headings, bullet points, and a summary. Use inline CSS for styling (modern typography, good spacing, professional colors). Output as three code blocks: html, css, javascript.`;
        onSendMessage(docPrompt, options);
      }
      return;
    }

    const contextParts: string[] = [];
    const browserTaskContext = !trimmedContent.startsWith('/') ? buildBrowserTaskContext(currentTask) : null;

    if (browserTaskContext) {
      contextParts.push(browserTaskContext);
    }

    if (!trimmedContent.startsWith('/')) {
      for (const r of firecrawlResults) {
        if (r.type === 'scrape' && r.markdown) {
          contextParts.push(`[SCRAPED PAGE: ${r.url}]\nTitle: ${r.title || 'Untitled'}\n\n${r.markdown.slice(0, 6000)}`);
        } else if (r.type === 'search') {
          const searchResults = r.results.map((s, i) => `${i + 1}. ${s.title || s.url} - ${s.url}\n   ${s.description || ''}`).join('\n');
          contextParts.push(`[SEARCH RESULTS: "${r.query}"]\n${searchResults}`);
        } else if (r.type === 'crawl') {
          const crawlPages = r.pages.map((p, i) => `${i + 1}. ${p.title || p.url} - ${p.url}`).join('\n');
          contextParts.push(`[CRAWL RESULTS: ${r.url}]\n${r.pages.length} pages found:\n${crawlPages}`);
        } else if (r.type === 'browse') {
          contextParts.push(`[BROWSED: ${r.url}]\nTitle: ${r.title || 'Unknown'}\n${r.description || ''}\n${r.extractedData ? JSON.stringify(r.extractedData, null, 2) : ''}`);
        }
      }
    }

    if (!trimmedContent.startsWith('/') && contextParts.length > 0) {
      const extraContext = `The user is asking a follow-up question about work already done in this chat. Use the context below to answer accurately, and mention the source URLs if they ask where the data came from.\n\n${contextParts.join('\n\n---\n\n')}`;
      onSendMessage(trimmedContent, { ...options, extraContext });
      return;
    }

    onSendMessage(content, options);
  };

  const quickCommands = [
    { label: 'Chat with AI', hint: 'Ask me anything', icon: Sparkles },
    { label: '/browse', hint: 'Automate a website', icon: Terminal },
    { label: '/scrape', hint: 'Scrape a webpage', icon: FileText },
    { label: '/search', hint: 'Web search', icon: Search },
    { label: '/research', hint: 'Deep research with AI', icon: Search },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background/40 to-background/60 backdrop-blur-sm rounded-lg overflow-hidden relative">
      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 p-4 overflow-y-auto scroll-smooth">
        <div className="space-y-3.5 max-w-3xl mx-auto pb-4">
          {isLoading && messages.length === 0 && firecrawlResults.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Loading chat history…</p>
            </motion.div>
          ) : messages.length === 0 && firecrawlResults.length === 0 ? (
            isGhlMode ? (
              <GHLTemplateGallery
                inline
                onSelectTemplate={(prompt) => {
                  setInputPrefill(prompt);
                  if (prompt) {
                    // Auto-send template prompts
                    handleSendMessage(prompt);
                  }
                }}
              />
            ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center text-center py-16 px-4"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse-glow" />
                <span className="relative text-4xl block">🧄</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">How can I help?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">Ask me anything, or use a command to get started.</p>
              
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {quickCommands.map((cmd) => (
                  <button
                    key={cmd.label}
                    onClick={() => {}}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-primary/30 hover:bg-card/80 transition-all group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <cmd.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{cmd.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{cmd.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
            )
          ) : (
            <>
              {messages.map((message) => {
                const msgHasCode = message.role === 'assistant' && hasCodeBlocks(message.content);
                const codeFiles = msgHasCode ? extractCodeFromResponse(message.content) : {};
                return (
                  <div key={message.id}>
                    <ChatMessage
                      message={message}
                      onInsertImage={activeCode ? (imageUrl: string) => {
                        const imgTag = `<img src="${imageUrl}" alt="AI generated" style="width:100%;max-width:800px;border-radius:8px;margin:1rem auto;display:block;" />`;
                        void imgTag;
                        onSendMessage(`I've inserted the image into the page`, { ghlMode: false });
                      } : undefined}
                      onRegenerateImage={(prompt: string) => {
                        handleSendMessage(`/image ${prompt}`);
                      }}
                    />
                    <MessageFeedback
                      messageId={message.id}
                      messageContent={message.content}
                      isAssistant={message.role === 'assistant'}
                      hasCode={msgHasCode}
                      codeFiles={codeFiles}
                      sentimentTriggered={sentimentTriggeredIds.has(message.id)}
                      offeredIds={offeredTemplateIds}
                      onOffered={handleOffered}
                    />
                  </div>
                );
              })}
              <AnimatePresence>
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && <TypingIndicator />}
              </AnimatePresence>
            </>
          )}

          {/* Firecrawl results */}
          {firecrawlResults.map((result, i) => (
            <FirecrawlResults
              key={`fc-${i}`}
              result={result}
              onSendToAI={handleSendToAI}
              onScrapeUrl={handleScrape}
              onSaveAsFile={handleSaveAsFile}
            />
          ))}

          {/* Firecrawl loading */}
          {isFirecrawling && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-3 rounded-xl border border-border/40 bg-card/60">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">{firecrawlStatus}</span>
            </motion.div>
          )}

          {/* Orchestration progress */}
          {orchestrator.status !== 'idle' && (
            <OrchestrationProgress
              status={orchestrator.status}
              currentStep={orchestrator.currentStep}
              toolChain={orchestrator.toolChain}
              finalResult={orchestrator.finalResult}
              error={orchestrator.error}
              generatedFiles={orchestrator.generatedFiles}
              onFollowUp={(action) => {
                if (action === 'refine') onSendMessage('Please refine and improve the previous research result.');
                else if (action === 'save') handleSaveAsFile(orchestrator.finalResult, 'research-report');
                else if (action === 'deeper') onSendMessage('/research Go deeper on the previous topic with more detail and sources.');
              }}
            />
          )}

          {currentTask && !hideTaskPreview && (
            <div className="space-y-3">
              <TaskStatus
                status={currentTask.status}
                message={currentTask.error_message}
                currentPhase={currentTask.currentPhase}
                duration={currentTask.duration}
              />
              <LiveBrowserView
                liveUrl={currentTask.liveUrl}
                status={currentTask.status}
                screenshots={currentTask.screenshots}
                actions={currentTask.actions}
                steps={currentTask.steps}
                taskId={currentTask.id}
                onStopTask={onStopTask}
                onPauseTask={onPauseTask}
                onResumeTask={onResumeTask}
                isStopping={isStopping}
                isPausing={isPausing}
                isResuming={isResuming}
                interventionReason={currentTask.interventionReason}
                interventionMessage={currentTask.interventionMessage}
                currentPhase={currentTask.currentPhase}
                deliverables={currentTask.deliverables}
                extractedData={currentTask.extractedData}
                taskSummary={currentTask.taskSummary}
              />
            </div>
          )}

          {currentTask && hideTaskPreview && (
            <TaskStatus
              status={currentTask.status}
              message={currentTask.error_message}
              currentPhase={currentTask.currentPhase}
              duration={currentTask.duration}
            />
          )}
        </div>
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 right-4"
          >
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="h-9 w-9 rounded-full shadow-glow bg-card/90 backdrop-blur-sm hover:bg-card border border-border/50"
              variant="outline"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GHL Template gallery slide-up */}
      <AnimatePresence>
        {showTemplateGallery && isGhlMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="shrink-0 overflow-hidden border-t border-border/30 max-h-[50%] overflow-y-auto"
          >
            <GHLTemplateGallery
              onSelectTemplate={(prompt) => {
                setShowTemplateGallery(false);
                if (prompt) {
                  handleSendMessage(prompt);
                } else {
                  setInputPrefill('');
                }
              }}
              onClose={() => setShowTemplateGallery(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {isGhlMode && messages.length > 0 && (
            <div className="flex justify-center mb-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[10px] border-border/40 bg-card/60 hover:bg-card/80"
                onClick={() => setShowTemplateGallery((s) => !s)}
              >
                <LayoutGrid className="h-3 w-3" />
                {showTemplateGallery ? 'Hide Templates' : 'Browse Templates'}
              </Button>
            </div>
          )}
          {activeCode && (
            <div className="flex items-center justify-center mb-2">
              <div className="inline-flex items-center gap-1.5 bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium">
                <Pencil className="h-3 w-3" />
                <span>Editing v{(codeHistoryIndex ?? 0) + 1}</span>
                <button
                  onClick={() => onClearActiveCode?.()}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading || isExecutingTask || isFirecrawling}
            isStreaming={isStreaming}
            onStop={onStopStreaming}
            onSlashCommand={onSlashCommand}
            onInspire={onInspire}
            isInspirationLoading={isInspirationLoading}
            prefill={inputPrefill}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
