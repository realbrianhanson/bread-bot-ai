import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Bot, Zap, Globe, Wheat } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signIn(formData.get('email') as string, formData.get('password') as string);
    if (error) toast.error(error.message || 'Failed to sign in');
    else toast.success('Welcome back!');
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signUp(formData.get('email') as string, formData.get('password') as string, formData.get('fullName') as string);
    if (error) toast.error(error.message || 'Failed to sign up');
    else toast.success('Account created successfully!');
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error('Google sign-in failed. Please try again.');
      }
    } catch {
      toast.error('Google sign-in failed. Please try again.');
    }
    setIsGoogleLoading(false);
  };

  const capabilities = [
    { icon: Globe, label: "Browser Automation", desc: "Control any website" },
    { icon: Bot, label: "AI Agents", desc: "Intelligent task execution" },
    { icon: Zap, label: "Instant Deploy", desc: "Ship in seconds" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Visual Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-background">
        <AuroraBackground />
        <div className="absolute inset-0 dot-grid opacity-30" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <Wheat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

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

          <p className="text-xs text-muted-foreground/60">© 2026 GarlicBread.ai · Powered by AI</p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        
        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <Wheat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">GarlicBread.ai</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in to your account or create a new one</p>
          </div>

          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-11 mb-6 font-medium border-border hover:bg-secondary/80 transition-colors"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or continue with email</span>
            </div>
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
                  <Input id="signin-email" name="email" type="email" placeholder="you@example.com" required disabled={isLoading} className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <Input id="signin-password" name="password" type="password" required disabled={isLoading} className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors" />
                </div>
                <Button type="submit" className="w-full h-11 font-medium shadow-glow hover:shadow-glow-lg transition-all duration-300 group" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Sign In<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                  <Input id="signup-name" name="fullName" type="text" placeholder="Jane Doe" required disabled={isLoading} className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required disabled={isLoading} className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input id="signup-password" name="password" type="password" required disabled={isLoading} className="h-11 bg-secondary/50 border-border focus:border-primary transition-colors" />
                </div>
                <Button type="submit" className="w-full h-11 font-medium shadow-glow hover:shadow-glow-lg transition-all duration-300 group" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Create Account<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>}
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
