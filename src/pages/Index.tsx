import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Globe, Code, FileStack, ArrowRight, Sparkles, Shield, Zap, Play, Monitor, Bot, CheckCircle2 } from "lucide-react";
import { GarlicLogo } from "@/components/ui/logo-icon";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const features = [
    {
      icon: Globe,
      title: "Browser Automation",
      description: "AI agents that navigate, click, fill forms, and extract data from any website — hands-free.",
      accent: "from-primary/20 to-primary/5",
    },
    {
      icon: Code,
      title: "Code Generation",
      description: "Describe what you want. Get production-ready React apps, scripts, and components in seconds.",
      accent: "from-brand-warm/20 to-brand-warm/5",
    },
    {
      icon: FileStack,
      title: "Data Extraction",
      description: "Scrape structured data at scale. Export CSVs, fill databases, build datasets automatically.",
      accent: "from-brand-emerald/20 to-brand-emerald/5",
    },
    {
      icon: Bot,
      title: "Smart Agents",
      description: "Deploy AI agents that learn, adapt, and execute multi-step workflows autonomously.",
      accent: "from-primary/15 to-primary/5",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "End-to-end encryption, role-based access, and audit logs for mission-critical automation.",
      accent: "from-brand-warm/15 to-brand-warm/5",
    },
    {
      icon: Zap,
      title: "Instant Deploy",
      description: "One-click publishing. Ship landing pages, dashboards, and tools to production in seconds.",
      accent: "from-brand-emerald/15 to-brand-emerald/5",
    },
  ];

  const stats = [
    { value: "10K+", label: "Tasks Completed" },
    { value: "99.9%", label: "Uptime" },
    { value: "<2s", label: "Avg Response" },
    { value: "500+", label: "Active Users" },
  ];

  const demoSteps = [
    { step: "1", title: "Describe your task", desc: "Type what you need in plain English — scrape a site, generate a page, or automate a workflow." },
    { step: "2", title: "AI agent executes", desc: "Our agents browse the web, write code, and process data in real time while you watch." },
    { step: "3", title: "Get results instantly", desc: "Download data, preview generated pages, or deploy directly — all from one interface." },
  ];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <AuroraBackground />
      <div className="absolute inset-0 dot-grid opacity-30" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <GarlicLogo size={28} />
          <span className="text-lg font-bold tracking-tight text-foreground">GarlicBread.ai</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-muted-foreground hover:text-foreground">
            Pricing
          </Button>
          <Button variant="outline" onClick={() => navigate("/auth")} className="border-border/60 hover:bg-primary/10 hover:border-primary/40 transition-all">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 md:pt-28 pb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          Now with real-time browser streaming
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] max-w-5xl mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="text-foreground">Automate the web</span>
          <br />
          <span className="gradient-text">with AI agents</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Describe what you need. Our AI agents browse, scrape, fill forms, generate code, and deploy — all in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-base px-8 h-12 shadow-glow hover:shadow-glow-lg transition-all duration-500 group"
          >
            Start Automating
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-base px-8 h-12 border-border/60 hover:bg-primary/5 hover:border-primary/30"
          >
            <Play className="mr-2 h-4 w-4" />
            See How It Works
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 md:gap-12 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Everything you need to automate</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From browser control to code generation, one platform handles it all.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative p-8 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-primary/30 hover:shadow-glow transition-all duration-500 animate-slide-up"
              style={{ animationDelay: `${0.5 + index * 0.08}s` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo-section" className="relative z-10 px-6 md:px-12 pb-32 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Monitor className="w-3 h-3" />
            How it works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Three steps to automation</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">No code. No complex setup. Just describe what you need.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demoSteps.map((item, i) => (
            <div
              key={item.step}
              className="relative p-6 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: `${0.6 + i * 0.15}s` }}
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-4 text-primary font-bold text-lg">
                {item.step}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Mock terminal */}
        <div className="mt-12 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-accent/60" />
            <div className="w-3 h-3 rounded-full bg-primary/60" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">GarlicBread.ai</span>
          </div>
          <div className="p-6 font-mono text-sm space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-primary shrink-0">▸</span>
              <span className="text-foreground">/browse go to linkedin.com and find 10 AI startup founders</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Bot className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Launching browser agent... navigating to linkedin.com</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Found 10 profiles. Extracting names, titles, and company info...</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Done! Results exported to CSV. <span className="text-primary underline cursor-pointer">Download →</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Ready to stop doing things manually?</h2>
          <p className="text-lg text-muted-foreground mb-8">Join hundreds of teams automating their web tasks with AI agents.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base px-10 h-13 shadow-glow hover:shadow-glow-lg transition-all duration-500 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="text-base px-10 h-13 border-border/60 hover:bg-primary/5 hover:border-primary/30"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-12 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <Shield className="w-3.5 h-3.5" />
          Enterprise-grade security
          <span className="text-border">·</span>
          <Zap className="w-3.5 h-3.5" />
          99.9% uptime
        </div>
        <p className="text-xs text-muted-foreground/50">© 2026 GarlicBread.ai</p>
      </footer>
    </main>
  );
};

export default Index;
