import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { Message } from '@/hooks/useChat';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
}

const ChatContainer = ({
  messages,
  isLoading,
  isStreaming,
  onSendMessage,
  onStopStreaming,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        </div>
      </div>

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