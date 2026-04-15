import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookTemplate, Globe, FileText, Search, ShoppingCart, Briefcase,
  BarChart3, Shield, Megaphone, PenTool, Users, Rocket, Mail,
  Newspaper, MapPin, Star, TrendingUp, Zap, Eye, Code,
} from "lucide-react";
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
  // Scraping
  { id: "scrape-ecommerce", name: "E-commerce Price Scraper", description: "Scrape product prices and details from any e-commerce site", prompt: "/browse Go to the e-commerce website and scrape all product names, prices, and images from the first 3 pages", icon: ShoppingCart, category: "Scraping" },
  { id: "lead-search", name: "Lead Generator", description: "Search and extract business leads from directories", prompt: "/browse Search for businesses in the specified industry and location, extract their contact information including name, phone, email, and address", icon: Search, category: "Scraping" },
  { id: "job-scraper", name: "Job Listing Scraper", description: "Scrape job postings from job boards", prompt: "/browse Search for job listings matching my criteria and extract the title, company, salary range, location, and application URL", icon: Briefcase, category: "Scraping" },
  { id: "review-scraper", name: "Review Aggregator", description: "Scrape and summarize customer reviews", prompt: "/browse Go to the product page and scrape all customer reviews including rating, text, date, and reviewer name. Summarize the key themes.", icon: Star, category: "Scraping" },
  { id: "social-scraper", name: "Social Media Scraper", description: "Extract posts and engagement data from social profiles", prompt: "/browse Navigate to the social media profile and extract the latest 20 posts with their engagement metrics (likes, comments, shares)", icon: Users, category: "Scraping" },

  // Automation
  { id: "form-filler", name: "Form Auto-Filler", description: "Automatically fill out web forms with provided data", prompt: "/browse Fill out the registration form with the following details", icon: FileText, category: "Automation" },
  { id: "job-apply", name: "Job Application Helper", description: "Navigate job boards and help apply to positions", prompt: "/browse Go to the job board and search for relevant positions matching my criteria, then help me apply", icon: Briefcase, category: "Automation" },
  { id: "email-outreach", name: "Email Outreach Prep", description: "Find contact info and draft personalized outreach emails", prompt: "/browse Find the decision-maker contact information for the company and draft a personalized outreach email based on their recent activity", icon: Mail, category: "Automation" },
  { id: "data-entry", name: "Data Entry Bot", description: "Automate repetitive data entry across web apps", prompt: "/browse Log into the web application and enter the following data rows into the specified form fields", icon: Zap, category: "Automation" },

  // Monitoring
  { id: "site-monitor", name: "Website Monitor", description: "Check a website for changes and capture screenshots", prompt: "/browse Navigate to the website, take a screenshot, and check for any content changes since the last visit", icon: Globe, category: "Monitoring" },
  { id: "price-monitor", name: "Price Drop Tracker", description: "Monitor product prices for drops", prompt: "/browse Check the product page and report the current price. Compare it with the previous price and notify if there's a drop", icon: TrendingUp, category: "Monitoring" },
  { id: "competitor-monitor", name: "Competitor Tracker", description: "Monitor competitor websites for changes", prompt: "/browse Visit the competitor's website and document any new products, pricing changes, or feature updates since the last check", icon: Eye, category: "Monitoring" },

  // Research & SEO
  { id: "seo-audit", name: "SEO Site Audit", description: "Analyze a site's SEO health and get recommendations", prompt: "/audit https://example.com — Run a full SEO and conversion audit, checking meta tags, page speed, mobile-friendliness, and content quality", icon: BarChart3, category: "Research & SEO" },
  { id: "competitor-analysis", name: "Competitor Analysis", description: "Deep-dive analysis of a competitor's online presence", prompt: "/compete https://competitor.com — Analyze the competitor's landing page, messaging, design patterns, and conversion elements. Build a superior version.", icon: Shield, category: "Research & SEO" },
  { id: "keyword-research", name: "Keyword Research", description: "Find high-value keywords for your niche", prompt: "/search Find the top 20 keywords and search trends for [your niche] including search volume estimates and competition level", icon: Search, category: "Research & SEO" },
  { id: "backlink-finder", name: "Backlink Opportunity Finder", description: "Find websites that could link to your content", prompt: "/crawl https://example.com — Analyze the site and find 10 relevant websites that could provide quality backlinks, including their contact info", icon: Globe, category: "Research & SEO" },

  // Content & Design
  { id: "blog-post", name: "Blog Post Generator", description: "Generate a full blog post on any topic", prompt: "Write a comprehensive, SEO-optimized blog post about [topic]. Include an engaging introduction, 5 key sections with subheadings, practical examples, and a conclusion with a call to action.", icon: PenTool, category: "Content & Design" },
  { id: "product-launch", name: "Product Launch Page", description: "Generate a high-converting product launch landing page", prompt: "Build a stunning product launch landing page for [product name]. Include a hero section with compelling headline, feature highlights, social proof section, pricing, and a strong CTA.", icon: Rocket, category: "Content & Design" },
  { id: "newsletter", name: "Newsletter Template", description: "Create an email newsletter layout", prompt: "Design an HTML email newsletter template for [brand/topic]. Include a header with logo area, featured article section, 3 story cards, and a footer with social links.", icon: Newspaper, category: "Content & Design" },
  { id: "local-biz", name: "Local Business Page", description: "Build a page for a local business", prompt: "Create a professional landing page for a local [business type] in [location]. Include services, hours, location map embed, testimonials, and a contact form.", icon: MapPin, category: "Content & Design" },
  { id: "saas-landing", name: "SaaS Landing Page", description: "Generate a SaaS product landing page", prompt: "Build a modern SaaS landing page with a hero section, 3 key features with icons, how-it-works steps, pricing table, FAQ accordion, and sign-up CTA.", icon: Code, category: "Content & Design" },
  { id: "ad-copy", name: "Ad Copy Generator", description: "Generate high-converting ad copy variants", prompt: "Write 5 variations of ad copy for [product/service] targeting [audience]. Include headline (max 30 chars), description (max 90 chars), and a CTA for each.", icon: Megaphone, category: "Content & Design" },
];

interface TaskTemplatesPanelProps {
  onSelectTemplate: (prompt: string) => void;
}

export function TaskTemplatesPanel({ onSelectTemplate }: TaskTemplatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.prompt);
    setOpen(false);
  };

  const filtered = search.trim()
    ? defaultTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : defaultTemplates;

  const categories = [...new Set(filtered.map((t) => t.category))];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <BookTemplate className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5" />
            Task Templates
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-6 pr-4">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
                <div className="space-y-2">
                  {filtered
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
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No templates match your search</div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
