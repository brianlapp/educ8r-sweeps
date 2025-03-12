
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAnalytics } from "./hooks/use-analytics";
import { AuthProvider } from "./contexts/AuthContext";
import { CampaignProvider } from "./contexts/CampaignContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

// Create a client
const queryClient = new QueryClient();

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const TestLanding = lazy(() => import("./pages/TestLanding"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCampaigns = lazy(() => import("./pages/AdminCampaigns"));
const AdminEntries = lazy(() => import("./pages/AdminEntries"));
const AdminWebhookStatus = lazy(() => import("./pages/AdminWebhookStatus"));
const AdminCampaignPreview = lazy(() => import("./pages/AdminCampaignPreview"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Terms = lazy(() => import("./pages/Terms"));
const Rules = lazy(() => import("./pages/Rules"));
const TechStack = lazy(() => import("./pages/TechStack"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin-slow w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

// Route change tracker component
function RouteChangeTracker() {
  const location = useLocation();
  const analytics = useAnalytics();
  
  useEffect(() => {
    // Track page view on route change
    analytics.trackPageView();
    
    // Track engagement on new page
    analytics.trackEvent('page_engagement', {
      path: location.pathname
    });
  }, [location.pathname, analytics]);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <Router>
            <RouteChangeTracker />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <CampaignProvider>
                      <Index />
                    </CampaignProvider>
                  } 
                />
                <Route 
                  path="/:slug" 
                  element={
                    <CampaignProvider>
                      <Index />
                    </CampaignProvider>
                  } 
                />
                <Route 
                  path="/:slug/thank-you" 
                  element={
                    <CampaignProvider>
                      <ThankYou />
                    </CampaignProvider>
                  } 
                />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/test-landing" element={<TestLanding />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/terms" element={<Terms />} />
                <Route 
                  path="/rules" 
                  element={
                    <CampaignProvider>
                      <Rules />
                    </CampaignProvider>
                  } 
                />
                <Route 
                  path="/:slug/rules" 
                  element={
                    <CampaignProvider>
                      <Rules />
                    </CampaignProvider>
                  } 
                />
                <Route path="/tech-stack" element={<TechStack />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/admin/campaigns"
                  element={
                    <ProtectedRoute>
                      <AdminCampaigns />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/entries"
                  element={
                    <ProtectedRoute>
                      <AdminEntries />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/webhooks"
                  element={
                    <ProtectedRoute>
                      <AdminWebhookStatus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/campaign/:id"
                  element={
                    <ProtectedRoute>
                      <AdminCampaignPreview />
                    </ProtectedRoute>
                  }
                />
                <Route path="/docs" element={<Documentation />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
