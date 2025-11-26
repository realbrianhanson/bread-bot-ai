import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-primary p-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl font-bold text-white mb-4">🧄 GarlicBread.ai</h1>
        <p className="text-xl text-white/90 mb-8">
          Create AI-powered browser automations, generate code, and build applications with ease
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6"
          >
            Get Started
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">🌐</div>
            <h3 className="font-semibold text-white mb-2">Web Automation</h3>
            <p className="text-sm text-white/70">
              Automate browser tasks and extract data from any website
            </p>
          </div>
          <div className="glass rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">💻</div>
            <h3 className="font-semibold text-white mb-2">Code Generation</h3>
            <p className="text-sm text-white/70">
              Generate React apps, scripts, and components instantly
            </p>
          </div>
          <div className="glass rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">📁</div>
            <h3 className="font-semibold text-white mb-2">File Processing</h3>
            <p className="text-sm text-white/70">
              Upload, transform, and generate files automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
