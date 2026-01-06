import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Globe, Code, FileStack, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Globe,
      title: "Web Automation",
      description: "Automate browser tasks and extract data from any website",
    },
    {
      icon: Code,
      title: "Code Generation",
      description: "Generate React apps, scripts, and components instantly",
    },
    {
      icon: FileStack,
      title: "File Processing",
      description: "Upload, transform, and generate files automatically",
    },
  ];

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Hero Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      {/* Content */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <header className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="text-4xl md:text-5xl block mb-2">🧄</span>
            <span className="bg-gradient-to-r from-primary via-primary to-[hsl(var(--gradient-to))] bg-clip-text text-transparent">
              GarlicBread.ai
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Create AI-powered browser automations, generate code, and build applications with ease
          </p>

          <div className="flex gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 shadow-elegant hover:shadow-glow transition-all duration-300 group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </header>

        {/* Features Grid */}
        <nav className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group glass-strong rounded-2xl p-8 border border-border/30 hover:border-primary/50 transition-all duration-300 hover:shadow-elegant animate-slide-up cursor-default"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-semibold text-xl text-foreground mb-3">
                {feature.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </nav>
      </section>
    </main>
  );
};

export default Index;
