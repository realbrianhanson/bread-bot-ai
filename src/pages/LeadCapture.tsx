import { useEffect } from 'react';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Globe, Bot, Zap, Shield } from 'lucide-react';
import { GarlicLogo } from '@/components/ui/logo-icon';

export default function LeadCapture() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.aiforbusiness.com/js/form_embed.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const benefits = [
    { icon: Globe, label: "Browser Automation", desc: "Control any website with AI agents" },
    { icon: Bot, label: "Smart AI Agents", desc: "Intelligent task execution & monitoring" },
    { icon: Zap, label: "Instant Results", desc: "Ship automations in seconds, not days" },
    { icon: Shield, label: "Enterprise Ready", desc: "Secure, scalable, and reliable" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding & Value Props */}
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
              <span className="text-foreground">Stop doing</span>
              <br />
              <span className="gradient-text">repetitive</span>
              <br />
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

      {/* Right: GHL Embed Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[500px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <GarlicLogo size={32} />
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Get early access</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Join the waitlist and be the first to automate your workflow.</p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
            <iframe
              src="https://api.aiforbusiness.com/widget/form/KJTBsm8Nc9pXe8ZG7O5y"
              style={{ width: '100%', height: '524px', border: 'none', borderRadius: '4px' }}
              id="inline-KJTBsm8Nc9pXe8ZG7O5y"
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-trigger-value=""
              data-activation-type="alwaysActivated"
              data-activation-value=""
              data-deactivation-type="neverDeactivate"
              data-deactivation-value=""
              data-form-name="AIS List"
              data-height="524"
              data-layout-iframe-id="inline-KJTBsm8Nc9pXe8ZG7O5y"
              data-form-id="KJTBsm8Nc9pXe8ZG7O5y"
              title="AIS List"
            />
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
