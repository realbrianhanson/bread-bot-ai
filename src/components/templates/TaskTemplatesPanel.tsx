import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookTemplate, Globe, FileText, Search, ShoppingCart, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: React.ElementType;
  category: string;
}

const defaultTemplates: Template[] = [
  {
    id: "scrape-ecommerce",
    name: "E-commerce Price Scraper",
    description: "Scrape product prices and details from any e-commerce site",
    prompt: "/browse Go to the e-commerce website and scrape all product names, prices, and images from the first 3 pages",
    icon: ShoppingCart,
    category: "Scraping",
  },
  {
    id: "form-filler",
    name: "Form Auto-Filler",
    description: "Automatically fill out web forms with provided data",
    prompt: "/browse Fill out the registration form with the following details",
    icon: FileText,
    category: "Automation",
  },
  {
    id: "lead-search",
    name: "Lead Generator",
    description: "Search and extract business leads from directories",
    prompt: "/browse Search for businesses in the specified industry and location, extract their contact information",
    icon: Search,
    category: "Scraping",
  },
  {
    id: "job-apply",
    name: "Job Application Helper",
    description: "Navigate job boards and help apply to positions",
    prompt: "/browse Go to the job board and search for relevant positions matching my criteria",
    icon: Briefcase,
    category: "Automation",
  },
  {
    id: "site-monitor",
    name: "Website Monitor",
    description: "Check a website for changes and capture screenshots",
    prompt: "/browse Navigate to the website, take a screenshot, and check for any content changes",
    icon: Globe,
    category: "Monitoring",
  },
];

interface TaskTemplatesPanelProps {
  onSelectTemplate: (prompt: string) => void;
}

export function TaskTemplatesPanel({ onSelectTemplate }: TaskTemplatesPanelProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.prompt);
    setOpen(false);
  };

  const categories = [...new Set(defaultTemplates.map((t) => t.category))];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <BookTemplate className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5" />
            Task Templates
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
              <div className="space-y-2">
                {defaultTemplates
                  .filter((t) => t.category === cat)
                  .map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border border-border/50 transition-all",
                          "hover:border-primary/30 hover:bg-primary/5 group"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{template.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
