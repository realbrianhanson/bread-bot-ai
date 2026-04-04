import { useState, KeyboardEvent, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceInputButton } from '@/components/chat/VoiceInputButton';

interface ChatInputProps {
  onSend: (content: string, options?: { ghlMode?: boolean }) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onSlashCommand?: (command: string) => void;
}

const SLASH_COMMANDS = [
  { cmd: "/browse", label: "Browser automation", icon: "🌐" },
  { cmd: "/scrape", label: "Scrape a webpage", icon: "📄" },
  { cmd: "/crawl", label: "Crawl a website", icon: "🕷️" },
  { cmd: "/search", label: "Web search", icon: "🔍" },
  { cmd: "/research", label: "Deep research with AI", icon: "🔬" },
  { cmd: "/deep", label: "Deep analysis", icon: "🧠" },
  { cmd: "/plan", label: "AI task planner", icon: "🧠" },
  { cmd: "/schedule", label: "Open scheduled tasks", icon: "⏰" },
  { cmd: "/template", label: "Open templates", icon: "📋" },
  { cmd: "/history", label: "Open task history", icon: "📜" },
  { cmd: "/workflow", label: "Open workflows", icon: "🔀" },
  { cmd: "/results", label: "Open results", icon: "📊" },
  { cmd: "/webhooks", label: "Open webhooks", icon: "🔗" },
];

const ChatInput = ({ onSend, disabled = false, isStreaming = false, onStop, onSlashCommand }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [ghlMode, setGhlMode] = useState(() => localStorage.getItem('ghl-mode') === 'true');
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

  // Slash command detection
  const matchingCommands = input.startsWith("/")
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input.split(" ")[0].toLowerCase()))
    : [];

  useEffect(() => {
    const shouldShow = input.startsWith("/") && !input.includes(" ") && matchingCommands.length > 0;
    setShowSlashMenu(shouldShow);
    if (shouldShow) setSelectedSlashIndex(0);
  }, [input, matchingCommands.length]);

  const handleSlashSelect = (cmd: string) => {
    const uiCommands = ["/schedule", "/template", "/history", "/workflow", "/results", "/webhooks"];
    if (uiCommands.includes(cmd)) {
      onSlashCommand?.(cmd);
      setInput("");
      setShowSlashMenu(false);
      return;
    }
    setInput(cmd + " ");
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const toggleGhlMode = () => {
    setGhlMode((prev) => {
      const next = !prev;
      localStorage.setItem('ghl-mode', String(next));
      return next;
    });
  };

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim(), { ghlMode });
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashIndex((i) => Math.min(i + 1, matchingCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        handleSlashSelect(matchingCommands[selectedSlashIndex].cmd);
        return;
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isBrowseCmd = input.trimStart().startsWith('/browse');
  const isPlanCmd = input.trimStart().startsWith('/plan');

  return (
    <div className="space-y-1 relative">
      {/* Slash command menu */}
      {showSlashMenu && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {matchingCommands.map((cmd, i) => (
            <button
              key={cmd.cmd}
              onClick={() => handleSlashSelect(cmd.cmd)}
              className={cn(
                "w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm transition-colors",
                i === selectedSlashIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
            >
              <span className="text-base">{cmd.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-primary">{cmd.cmd}</span>
                <span className="text-muted-foreground text-xs ml-2">{cmd.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

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
        {isPlanCmd && (
          <div className="shrink-0 mb-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
            <span className="text-[10px]">🧠</span>
            <span className="text-[10px] font-medium text-primary">Planner</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting…' : 'Message GarlicBread or type / for commands…'}
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
