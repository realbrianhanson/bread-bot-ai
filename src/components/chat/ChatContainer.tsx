import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import TaskStatus from './TaskStatus';
import LiveBrowserView from './LiveBrowserView';
import OrchestrationProgress from './OrchestrationProgress';
import { Message } from '@/hooks/useChat';
import { BrowserTask } from '@/hooks/useBrowserTask';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import { Button } from '@/components/ui/button';
import { ArrowDown, Sparkles, Terminal, Search } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
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
}

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
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const orchestrator = useOrchestrator();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTask]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const handleSendMessage = (content: string) => {
    const trimmedContent = content.trim();
    
    if (trimmedContent.startsWith('/browse')) {
      const task = trimmedContent.replace(/^\/browse\s*/, '').trim();
      if (task && onExecuteTask) {
        onExecuteTask(task, projectId, selectedProfileId || undefined);
        return;
      }
      if (!task) return; // Don't send empty /browse as chat
    }
    
    onSendMessage(content);
  };

  const quickCommands = [
    { label: 'Chat with AI', hint: 'Ask me anything', icon: Sparkles },
    { label: '/browse', hint: 'Automate a website', icon: Terminal },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background/40 to-background/60 backdrop-blur-sm rounded-lg overflow-hidden relative">
      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 p-4 overflow-y-auto scroll-smooth">
        <div className="space-y-3.5 max-w-3xl mx-auto pb-4">
          {messages.length === 0 ? (
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
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <AnimatePresence>
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && <TypingIndicator />}
              </AnimatePresence>
            </>
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

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading || isExecutingTask}
            isStreaming={isStreaming}
            onStop={onStopStreaming}
            onSlashCommand={onSlashCommand}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
