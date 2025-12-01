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
  onExecuteTask?: (task: string, projectId?: string) => void;
  onStopTask?: (taskId: string) => void;
  isStopping?: boolean;
  projectId?: string;
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
  isStopping = false,
  projectId,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTask]);

  const handleSendMessage = (content: string) => {
    // Check if it's a browser command
    if (content.trim().startsWith('/browse ')) {
      const task = content.replace('/browse ', '').trim();
      if (task && onExecuteTask) {
        onExecuteTask(task, projectId);
      }
    } else {
      onSendMessage(content);
    }
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
          
          {/* Browser Task Status */}
          {currentTask && (
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
                isStopping={isStopping}
              />
            </div>
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