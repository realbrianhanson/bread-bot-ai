import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import LeadCapture from "./pages/LeadCapture";
import SharedPreview from "./pages/SharedPreview";
import PublishedPage from "./pages/PublishedPage";
import WorkflowsPage from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import AppBuilder from "./pages/AppBuilder";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    // Preserve the intended destination so /auth can send the user back
    // after a successful sign-in instead of dumping them on /dashboard.
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  return <>{children}</>;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="page-enter h-full w-full">{children}</div>;
}

function AnimatedRoutes() {
  return (
    <Routes>
        <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
        <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
        <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
        <Route path="/lead" element={<PageWrapper><LeadCapture /></PageWrapper>} />
        <Route path="/preview/:shareId" element={<SharedPreview />} />
        <Route path="/p/:slug" element={<PublishedPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageWrapper><Dashboard /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageWrapper><Settings /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflows"
          element={
            <ProtectedRoute>
              <PageWrapper><WorkflowsPage /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflows/:id"
          element={
            <ProtectedRoute>
              <PageWrapper><WorkflowEditor /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder"
          element={
            <ProtectedRoute>
              <PageWrapper><AppBuilder /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PageWrapper><Admin /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
