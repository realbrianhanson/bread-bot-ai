import { useState, KeyboardEvent, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceInputButton } from '@/components/chat/VoiceInputButton';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const ChatInput = ({ onSend, disabled = false, isStreaming = false, onStop }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + ' ' + text : text));
  }, []);

  const { isListening, interim, toggle, isSupported } = useVoiceInput(handleVoiceResult);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isBrowseCmd = input.trimStart().startsWith('/browse');

  return (
    <div className="space-y-1">
      {/* Voice interim badge */}
      {isListening && interim && (
        <div className="px-3 py-1 text-xs text-muted-foreground italic truncate">
          🎤 {interim}
        </div>
      )}

      <div className={cn(
        'flex items-end gap-3 p-3 rounded-2xl border transition-all duration-200',
        'bg-card/80 backdrop-blur-sm',
        disabled ? 'border-border/30' : 'border-border/60 focus-within:border-primary/50 focus-within:shadow-glow'
      )}>
        {/* Browse badge */}
        {isBrowseCmd && (
          <div className="shrink-0 mb-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-warm/10 border border-brand-warm/30">
            <Zap className="h-3 w-3 text-brand-warm" />
            <span className="text-[10px] font-medium text-brand-warm">Browser</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting…' : 'Message GarlicBread or type /browse to automate…'}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50',
            'min-h-[24px] max-h-[160px] py-0.5 leading-relaxed',
            disabled && 'opacity-50'
          )}
        />

        <VoiceInputButton isListening={isListening} isSupported={isSupported} onToggle={toggle} />

        {isStreaming ? (
          <Button
            onClick={onStop}
            size="icon"
            variant="destructive"
            className="h-8 w-8 shrink-0 rounded-xl"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0 rounded-xl transition-all duration-200',
              input.trim() && !disabled ? 'shadow-glow' : 'opacity-40'
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
