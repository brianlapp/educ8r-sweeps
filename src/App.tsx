
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import TestLanding from "./pages/TestLanding";
import Admin from "./pages/Admin";
import AdminWebhookStatus from "./pages/AdminWebhookStatus";
import AdminLogin from "./pages/AdminLogin";
import Documentation from "./pages/Documentation";
import Terms from "./pages/Terms";
import Rules from "./pages/Rules";
import TechStack from "./pages/TechStack";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
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
                path="/admin/webhooks"
                element={
                  <ProtectedRoute>
                    <AdminWebhookStatus />
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
