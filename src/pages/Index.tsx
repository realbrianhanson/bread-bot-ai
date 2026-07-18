import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Globe, Code, FileStack, ArrowRight, Sparkles, Shield, Zap, Bot, CheckCircle2, Clock, Wand2, Layers, MousePointer2 } from "lucide-react";
import { GarlicLogo } from "@/components/ui/logo-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, type Variants } from "framer-motion";
import heroVisual from "@/assets/hero-visual.jpg";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const features = [
    { icon: Globe, title: "Browser automation", description: "Agents that navigate, click, fill forms, and extract data from any site — hands-free." },
    { icon: Wand2, title: "App generation", description: "Describe what you want. Get a working web app with a live preview and one-click publish." },
    { icon: FileStack, title: "Structured extraction", description: "Turn any page into clean rows. Export CSVs, populate databases, build datasets." },
    { icon: Bot, title: "Multi-step agents", description: "Chain reasoning, tools, and browsers to complete workflows that span dozens of steps." },
    { icon: Shield, title: "Secure by default", description: "Row-level database security, encrypted secrets, isolated sandboxes per run." },
    { icon: Zap, title: "Publish anywhere", description: "Ship to a garlicbread.ai subdomain or connect your own custom domain in a click." },
  ];

  const steps = [
    { icon: MousePointer2, step: "01", title: "Describe the outcome", desc: "Type what you need in plain English — a scraper, a landing page, a full app, a scheduled agent." },
    { icon: Bot, step: "02", title: "Watch it build live", desc: "Follow the agent as it browses, writes code, and iterates. Take over any time you want." },
    { icon: Layers, step: "03", title: "Publish and iterate", desc: "Ship to production in one click. Edit with a follow-up prompt. Version history keeps you safe." },
  ];

  const proofPoints = [
    { label: "Real browsers, not scrapers", desc: "Handles JS-rendered sites, logins, and multi-step flows." },
    { label: "Your data stays yours", desc: "Isolated per-user storage, encrypted secrets, RLS end-to-end." },
    { label: "Bring your own domain", desc: "Publish agents and pages under your brand, TLS handled." },
  ];

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Helmet>
        <title>GarlicBread.ai — AI Browser Automation & Code Generation</title>
        <meta name="description" content="AI agents that navigate the web, extract data, run code, and build apps for you. Free tier available." />
        <link rel="canonical" href="https://garlicbread.ai/" />
        <meta property="og:title" content="GarlicBread.ai — AI Browser Automation & Code Generation" />
        <meta property="og:description" content="AI agents that navigate the web, extract data, run code, and build apps for you." />
        <meta property="og:url" content="https://garlicbread.ai/" />
        <meta property="og:image" content="https://garlicbread.ai/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GarlicBread.ai — AI Browser Automation & Code Generation" />
        <meta name="twitter:description" content="AI agents that navigate the web, extract data, run code, and build apps for you." />
        <meta name="twitter:image" content="https://garlicbread.ai/og-image.png" />
      </Helmet>

      {/* Warm ambient background */}
      <div aria-hidden className="absolute inset-0 mesh-gradient" />
      <div aria-hidden className="absolute inset-0 dot-grid opacity-[0.15]" />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[80rem] h-[40rem] rounded-full bg-primary/10 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-12 py-5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <GarlicLogo size={28} />
          <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">GarlicBread.ai</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-muted-foreground hover:text-foreground">
            Pricing
          </Button>
          <Button onClick={() => navigate("/auth")} className="shadow-soft hover:shadow-glow">
            Sign in
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-10 md:pt-20 pb-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-medium mb-6 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Live browsers · Real code · One platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display font-semibold text-[2.75rem] sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-foreground mb-6"
            >
              The AI workshop
              <br />
              for people who <span className="gradient-text italic">actually ship</span>.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
              GarlicBread runs real browsers, writes real code, and publishes real apps from a single prompt. Warm, opinionated, built for operators who want output — not another chat window.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-base px-7 h-12 shadow-glow hover:shadow-glow-lg group"
              >
                Start building free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-base px-7 h-12"
              >
                See how it works
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free tier, no card</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Custom domains</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Own your data</span>
            </motion.div>
          </motion.div>

          {/* Product visual mock */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-brand-warm/20 to-transparent rounded-[2rem] blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-heavy overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-surface-elevated/60">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-brand-warm/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
                <div className="ml-3 text-[11px] text-muted-foreground font-mono">garlicbread.ai / builder</div>
              </div>
              {/* Body */}
              <div className="grid grid-cols-[130px_1fr] h-[360px]">
                <div className="border-r border-border/50 p-3 space-y-1.5 bg-surface-sunken/40">
                  {['Dashboard','Builder','Agents','Workflows','Leads','Settings'].map((l, i) => (
                    <div key={l} className={`text-[11px] px-2 py-1.5 rounded-md ${i===1 ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground'}`}>{l}</div>
                  ))}
                </div>
                <div className="relative">
                  <img
                    src={heroVisual}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                    width={1600}
                    height={1200}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="relative h-full flex flex-col justify-end p-5 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="glass-strong rounded-xl p-3 flex items-start gap-2.5"
                    >
                      <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-[12px] leading-relaxed text-foreground/90">
                        Building your dashboard… scaffolding routes, wiring auth, styling with your brand tokens.
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                      className="glass-strong rounded-xl p-3 flex items-center gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-[12px] text-foreground/90">Preview ready — <span className="text-primary underline underline-offset-2">open live app ↗</span></span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="relative z-10 px-6 md:px-12 pb-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 md:p-8 grid md:grid-cols-3 gap-6"
        >
          {proofPoints.map((p) => (
            <div key={p.label} className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-display font-medium text-foreground text-[15px]">{p.label}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{p.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground mb-3">
            One workshop. <span className="gradient-text">Every surface.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From browser control to app generation, GarlicBread hands you the full toolchain in one clean interface.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group relative p-7 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-medium transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 shadow-xs">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-medium mb-4">
            <Clock className="w-3 h-3" />
            How it works
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground mb-3">Prompt to production in three moves.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative p-7 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="font-display font-semibold text-3xl text-primary/80">{item.step}</div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <h3 className="font-display font-semibold text-foreground text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto relative rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden p-10 md:p-14 text-center"
        >
          <div className="absolute inset-0 mesh-gradient opacity-60" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Skip the manual work. <span className="gradient-text">Ship the outcome.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">Free while you explore. Upgrade when you're ready to run agents on a schedule and publish on your own domain.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-base px-8 h-12 shadow-glow hover:shadow-glow-lg group">
                Start building free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")} className="text-base px-8 h-12">
                View pricing
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 pb-12 border-t border-border/40 pt-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <GarlicLogo size={22} />
            <span className="font-display font-semibold text-foreground">GarlicBread.ai</span>
            <span className="text-xs text-muted-foreground ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <a href="/pricing" className="hover:text-foreground story-link">Pricing</a>
            <a href="/terms" className="hover:text-foreground story-link">Terms</a>
            <a href="/privacy" className="hover:text-foreground story-link">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
