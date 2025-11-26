import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/hooks/useChat';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading,
  isStreaming,
  onSendMessage,
  onStopStreaming,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-pulse">●</div>
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 bg-background/30 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={onSendMessage}
            disabled={isLoading}
            isStreaming={isStreaming}
            onStop={onStopStreaming}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;