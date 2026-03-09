import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Settings,
  Moon,
  Sun,
  MessageSquarePlus,
  LayoutDashboard,
  CreditCard,
  Globe,
  FileText,
  Zap,
} from "lucide-react";

interface CommandPaletteProps {
  onNewConversation?: () => void;
  onQuickStart?: (prompt: string) => void;
}

export function CommandPalette({ onNewConversation, onQuickStart }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/pricing"))}>
            <CreditCard className="mr-2 h-4 w-4" />
            Pricing
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => onNewConversation?.())}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Conversation
          </CommandItem>
          <CommandItem onSelect={() => run(() => onQuickStart?.("/browse Scrape leads from a website"))}>
            <Globe className="mr-2 h-4 w-4" />
            Quick: Scrape Leads
          </CommandItem>
          <CommandItem onSelect={() => run(() => onQuickStart?.("/browse Fill out a form automatically"))}>
            <FileText className="mr-2 h-4 w-4" />
            Quick: Fill a Form
          </CommandItem>
          <CommandItem onSelect={() => run(() => onQuickStart?.("Build me a landing page"))}>
            <Zap className="mr-2 h-4 w-4" />
            Quick: Build Landing Page
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
            {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
            {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
