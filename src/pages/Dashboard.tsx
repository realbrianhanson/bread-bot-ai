import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Sparkles, MessageSquarePlus, ChevronLeft, ChevronRight } from "lucide-react";
import ChatContainer from "@/components/chat/ChatContainer";
import ConversationList from "@/components/chat/ConversationList";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const Dashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { messages, isLoading, isStreaming, sendMessage, stopStreaming } = useChat(activeConversationId || undefined);
  const {
    conversations,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useConversations();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNewConversation = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setActiveConversationId(newConv.id);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

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
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          {/* Conversation Sidebar */}
          <div 
            className={`transition-all duration-300 ${
              sidebarCollapsed ? 'w-0' : 'w-64'
            } overflow-hidden`}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={renameConversation}
            />
          </div>

          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="self-start mt-2 h-8 w-8"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Main Chat Area */}
          <div className="flex-1">
            {activeConversationId || messages.length > 0 ? (
              <ChatContainer
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                onSendMessage={sendMessage}
                onStopStreaming={stopStreaming}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Card className="max-w-md">
                  <CardHeader>
                    <CardTitle>Welcome to AI Assistant</CardTitle>
                    <CardDescription>
                      Start a new conversation or select an existing one from the sidebar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleNewConversation} className="w-full">
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;