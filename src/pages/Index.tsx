import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Globe, Code, FileStack, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
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
  ];

  const stats = [
    { value: "10K+", label: "Tasks Completed" },
    { value: "99.9%", label: "Uptime" },
    { value: "<2s", label: "Avg Response" },
  ];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
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
          <Button variant="outline" onClick={() => navigate("/auth")} className="border-border/60 hover:bg-primary/10 hover:border-primary/40 transition-all">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 md:pt-28 pb-20">
        {/* Badge */}
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
            onClick={() => navigate("/auth")}
            className="text-base px-8 h-12 border-border/60 hover:bg-primary/5 hover:border-primary/30"
          >
            View Demo
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

      {/* Features */}
      <section className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative p-8 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-primary/30 hover:shadow-glow transition-all duration-500 animate-slide-up"
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              {/* Accent gradient */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-6 pb-20 text-center">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
            <Shield className="w-3.5 h-3.5" />
            Enterprise-grade security
            <span className="text-border">·</span>
            <Zap className="w-3.5 h-3.5" />
            99.9% uptime
          </div>
          <p className="text-xs text-muted-foreground/50">© 2026 GarlicBread.ai</p>
        </div>
      </section>
    </main>
  );
};

export default Index;
