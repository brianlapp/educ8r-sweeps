import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import TestLanding from "./pages/TestLanding";
import Admin from "./pages/Admin";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminEntries from "./pages/AdminEntries";
import AdminWebhookStatus from "./pages/AdminWebhookStatus";
import AdminCampaignPreview from "./pages/AdminCampaignPreview";
import AdminLogin from "./pages/AdminLogin";
import Documentation from "./pages/Documentation";
import Terms from "./pages/Terms";
import Rules from "./pages/Rules";
import TechStack from "./pages/TechStack";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { CampaignProvider } from "./contexts/CampaignContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAnalytics } from "./hooks/use-analytics";
import "./App.css";

// Create a client
const queryClient = new QueryClient();

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
              <Route path="/rules" element={<Rules />} />
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
          </Router>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
