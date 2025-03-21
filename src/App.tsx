import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAnalytics } from "./hooks/use-analytics";
import { AuthProvider } from "./contexts/AuthContext";
import { CampaignProvider } from "./contexts/CampaignContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

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
const AdminEmailMigration = lazy(() => import("./pages/AdminEmailMigration"));

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
    <ErrorBoundary>
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
                      <ErrorBoundary>
                        <CampaignProvider>
                          <Index />
                        </CampaignProvider>
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="/:slug" 
                    element={
                      <ErrorBoundary>
                        <CampaignProvider>
                          <Index />
                        </CampaignProvider>
                      </ErrorBoundary>
                    } 
                  />
                  {/* Add ErrorBoundary to other routes */}
                  <Route 
                    path="/:slug/thank-you" 
                    element={
                      <ErrorBoundary>
                        <CampaignProvider>
                          <ThankYou />
                        </CampaignProvider>
                      </ErrorBoundary>
                    } 
                  />
                  <Route path="/thank-you" element={<ErrorBoundary><ThankYou /></ErrorBoundary>} />
                  <Route path="/test-landing" element={<ErrorBoundary><TestLanding /></ErrorBoundary>} />
                  <Route path="/admin/login" element={<ErrorBoundary><AdminLogin /></ErrorBoundary>} />
                  <Route path="/terms" element={<ErrorBoundary><Terms /></ErrorBoundary>} />
                  <Route 
                    path="/rules" 
                    element={
                      <ErrorBoundary>
                        <CampaignProvider>
                          <Rules />
                        </CampaignProvider>
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="/:slug/rules" 
                    element={
                      <ErrorBoundary>
                        <CampaignProvider>
                          <Rules />
                        </CampaignProvider>
                      </ErrorBoundary>
                    } 
                  />
                  <Route path="/tech-stack" element={<ErrorBoundary><TechStack /></ErrorBoundary>} />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <Admin />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin/campaigns"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <AdminCampaigns />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/entries"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <AdminEntries />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/webhooks"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <AdminWebhookStatus />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/campaign/:id"
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <AdminCampaignPreview />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/email-migration"
                    element={
                      <ProtectedRoute>
                        <AdminEmailMigration />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/docs" element={<ErrorBoundary><Documentation /></ErrorBoundary>} />
                  <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
