import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus, ShoppingCart, Video, Calendar, CheckCircle,
  PlayCircle, Clock, BarChart, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageType {
  id: string;
  title: string;
  icon: typeof UserPlus;
  description: string;
  prompt: string;
}

const PAGE_TYPES: PageType[] = [
  { id: "lead", title: "Lead Capture", icon: UserPlus, description: "Opt-in page with form, headline, social proof", prompt: "Create a GHL Lead Capture landing page for [blank]. The target audience is [blank] and the main offer is [blank]." },
  { id: "sales", title: "Sales Page", icon: ShoppingCart, description: "Long-form sales page with testimonials, features, CTA", prompt: "Create a GHL Sales landing page for [blank]. The target audience is [blank] and the main offer is [blank]." },
  { id: "webinar", title: "Webinar Registration", icon: Video, description: "Event signup with countdown, speaker bio, agenda", prompt: "Create a GHL Webinar Registration landing page for [blank]. The target audience is [blank] and the main offer is [blank]." },
  { id: "booking", title: "Booking Page", icon: Calendar, description: "Calendar embed with trust builders and CTA", prompt: "Create a GHL Booking landing page for [blank]. The target audience is [blank] and the main offer is [blank]." },
  { id: "thankyou", title: "Thank You Page", icon: CheckCircle, description: "Post-conversion page with next steps", prompt: "Create a GHL Thank You page for [blank]. The target audience is [blank] and the next step is [blank]." },
  { id: "vsl", title: "VSL Page", icon: PlayCircle, description: "Video sales letter with headline, video embed, CTA below", prompt: "Create a GHL VSL (Video Sales Letter) landing page for [blank]. The target audience is [blank] and the main offer is [blank]." },
  { id: "coming", title: "Coming Soon", icon: Clock, description: "Pre-launch page with email capture and countdown", prompt: "Create a GHL Coming Soon landing page for [blank]. The launch date is [blank] and the product is [blank]." },
  { id: "casestudy", title: "Case Study", icon: BarChart, description: "Results showcase with stats, story, and CTA", prompt: "Create a GHL Case Study landing page for [blank]. The client is [blank] and the key result is [blank]." },
  { id: "custom", title: "Custom", icon: Pencil, description: "Describe your page from scratch", prompt: "" },
];

interface GHLPageTypeSelectorProps {
  onSelectPrompt: (prompt: string) => void;
}

const GHLPageTypeSelector = ({ onSelectPrompt }: GHLPageTypeSelectorProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (pt: PageType) => {
    setSelected(pt.id);
    onSelectPrompt(pt.prompt);
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 w-full max-w-2xl mx-auto">
      <Badge className="text-[10px] h-5 gap-1 bg-accent/15 text-accent border-accent/30 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        GHL Mode
      </Badge>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">What kind of page?</h3>
      <p className="text-xs text-muted-foreground -mt-2">Pick a template to get a starter prompt, then customize it.</p>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-2 w-full mt-1">
        {PAGE_TYPES.map((pt) => {
          const Icon = pt.icon;
          const isSelected = selected === pt.id;
          return (
            <motion.button
              key={pt.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(pt)}
              className={cn(
                "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-card/60 hover:border-primary/30 hover:bg-primary/[0.03]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium text-foreground leading-tight">{pt.title}</span>
              <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{pt.description}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default GHLPageTypeSelector;
