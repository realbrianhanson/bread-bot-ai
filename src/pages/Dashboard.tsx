import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-primary">
      {/* Header */}
      <header className="border-b border-white/10 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">🧄 GarlicBread.ai</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-white hover:bg-white/10"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-2xl p-8 mb-6 border border-white/20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Welcome to GarlicBread.ai</h2>
              <p className="text-muted-foreground mb-6">
                Create AI-powered browser automations, generate code, and build applications
              </p>
              <p className="text-sm text-muted-foreground">
                Logged in as: {user?.email}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <h3 className="font-semibold mb-2">🌐 Web Automation</h3>
              <p className="text-sm text-muted-foreground">
                Automate web browsing tasks and data extraction
              </p>
            </div>
            <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <h3 className="font-semibold mb-2">💻 Code Generation</h3>
              <p className="text-sm text-muted-foreground">
                Generate React components, scripts, and full apps
              </p>
            </div>
            <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <h3 className="font-semibold mb-2">📁 File Processing</h3>
              <p className="text-sm text-muted-foreground">
                Upload, process, and generate files automatically
              </p>
            </div>
          </div>

          {/* Chat Interface Placeholder */}
          <div className="glass-strong rounded-2xl p-6 border border-white/20">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">AI chat interface coming soon...</p>
              <p className="text-sm">This will be where you interact with the AI agent</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
