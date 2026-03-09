import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Bot, Zap, Globe } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message || 'Failed to sign in');
    else toast.success('Welcome back!');
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const { error } = await signUp(email, password, fullName);
    if (error) toast.error(error.message || 'Failed to sign up');
    else toast.success('Account created successfully!');
    setIsLoading(false);
  };

  const capabilities = [
    { icon: Globe, label: "Browser Automation", desc: "Control any website" },
    { icon: Bot, label: "AI Agents", desc: "Intelligent task execution" },
    { icon: Zap, label: "Instant Deploy", desc: "Ship in seconds" },
  ];

  return (
    <div className="min-h-screen flex dark">
      {/* Left: Visual Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden mesh-gradient">
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-rose/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-emerald/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧄</span>
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-fade-in">
              <span className="text-foreground">Automate</span>
              <br />
              <span className="gradient-text">anything</span>
              <br />
              <span className="text-foreground">on the web.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              AI-powered browser agents that scrape, fill forms, extract data, and build apps — while you watch in real time.
            </p>

            {/* Capability cards */}
            <div className="flex flex-col gap-3">
              {capabilities.map((cap, i) => (
                <div
                  key={cap.label}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm animate-slide-up"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <cap.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{cap.label}</p>
                    <p className="text-xs text-muted-foreground">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground/60">
            © 2026 GarlicBread.ai · Powered by AI
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background relative">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

        <div className="w-full max-w-[400px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <span className="text-3xl">🧄</span>
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your account or create a new one
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
              <TabsTrigger value="signin" className="font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="font-medium">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    disabled={isLoading}
                    className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-medium shadow-glow hover:shadow-glow-lg transition-all duration-300 group" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    disabled={isLoading}
                    className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    disabled={isLoading}
                    className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-medium shadow-glow hover:shadow-glow-lg transition-all duration-300 group" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-center text-muted-foreground mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
