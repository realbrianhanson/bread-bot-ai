import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Sparkles, Globe, Code, FileText } from "lucide-react";
import ChatContainer from "@/components/chat/ChatContainer";
import { useChat } from "@/hooks/useChat";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { messages, isLoading, isStreaming, sendMessage, stopStreaming } = useChat();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const quickActions = [
    {
      icon: Globe,
      title: "Web Automation",
      description: "Automate browser tasks",
      prompt: "/browse Navigate to example.com and take a screenshot",
    },
    {
      icon: Code,
      title: "Code Generation",
      description: "Generate code snippets",
      prompt: "Help me write a React component for a user profile card",
    },
    {
      icon: FileText,
      title: "File Processing",
      description: "Process and analyze files",
      prompt: "Help me analyze a CSV file with sales data",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold gradient-text">GarlicBread.ai</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Sidebar - Quick Actions */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-panel p-4 rounded-lg">
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground">
                Quick Actions
              </h2>
              <div className="space-y-2">
                {quickActions.map((action, idx) => (
                  <Card
                    key={idx}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-border/50"
                    onClick={() => sendMessage(action.prompt)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {action.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="glass-panel p-4 rounded-lg">
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
                Welcome
              </h2>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-9">
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              onSendMessage={sendMessage}
              onStopStreaming={stopStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;