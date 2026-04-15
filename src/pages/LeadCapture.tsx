import { useState } from 'react';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Globe, Bot, Zap, Shield, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { GarlicLogo } from '@/components/ui/logo-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LeadCapture() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('leads').insert({ email: email.trim(), name: name.trim() || null });
    setLoading(false);

    if (error) {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setSubmitted(true);
  };

  const benefits = [
    { icon: Globe, label: "Browser Automation", desc: "Control any website with AI agents" },
    { icon: Bot, label: "Smart AI Agents", desc: "Intelligent task execution & monitoring" },
    { icon: Zap, label: "Instant Results", desc: "Ship automations in seconds, not days" },
    { icon: Shield, label: "Enterprise Ready", desc: "Secure, scalable, and reliable" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden bg-background">
        <AuroraBackground />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <GarlicLogo size={32} />
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-fade-in">
              <span className="text-foreground">Stop doing</span><br />
              <span className="gradient-text">repetitive</span><br />
              <span className="text-foreground">work manually.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              Let AI browser agents handle your web tasks — scraping, form filling, data extraction, and more — while you focus on what matters.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {benefits.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm animate-slide-up"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">© 2026 GarlicBread.ai · Powered by AI</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <GarlicLogo size={32} />
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

          {submitted ? (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">You're on the list!</h2>
              <p className="text-muted-foreground">We'll notify you as soon as early access opens. Keep an eye on your inbox.</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Get early access</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Join the waitlist and be the first to automate your workflow.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 shadow-glow" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Join Waitlist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-6">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
