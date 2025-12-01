import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import TaskStatus from './TaskStatus';
import LiveBrowserView from './LiveBrowserView';
import { Message } from '@/hooks/useChat';
import { BrowserTask } from '@/hooks/useBrowserTask';

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
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTask]);

  const handleSendMessage = (content: string) => {
    const trimmedContent = content.trim();
    
    // Check if it's a browser command (with or without space after /browse)
    if (trimmedContent.startsWith('/browse')) {
      const task = trimmedContent.replace(/^\/browse\s*/, '').trim();
      if (task && onExecuteTask) {
        console.log('[ChatContainer] Executing browser task:', task);
        onExecuteTask(task, projectId, selectedProfileId || undefined);
        return; // Don't send to chat AI
      }
    }
    
    // Regular message - send to chat AI
    onSendMessage(content);
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto"
      >
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">Ask me anything or use a command like /browse</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <TypingIndicator />
          )}
          
          {/* Browser Task Status - only show if not hiding preview */}
          {currentTask && !hideTaskPreview && (
            <div className="space-y-3">
              <TaskStatus 
                status={currentTask.status} 
                message={currentTask.error_message}
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
              />
            </div>
          )}
          
          {/* Show just task status if preview is hidden */}
          {currentTask && hideTaskPreview && (
            <TaskStatus 
              status={currentTask.status} 
              message={currentTask.error_message}
            />
          )}
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/30 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading || isExecutingTask}
            isStreaming={isStreaming}
            onStop={onStopStreaming}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;