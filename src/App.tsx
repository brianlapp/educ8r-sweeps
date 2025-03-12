
import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import LandingPage from "@/pages/LandingPage";
import ThankYou from "@/pages/ThankYou";
import Admin from "@/pages/Admin";
import Webhooks from "@/pages/Webhooks";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { CampaignProvider } from '@/contexts/CampaignContext';
import AdminCampaignContent from "@/pages/AdminCampaignContent";
import { Toaster } from "@/components/ui/toaster";

function App() {
  console.log("App component rendering");
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-react-ts-shadcn">
      <Router>
        <Routes>
          {/* Landing page routes */}
          <Route path="/" element={
            <CampaignProvider>
              <LandingPage />
            </CampaignProvider>
          } />
          
          {/* Thank you routes */}
          <Route path="/thank-you" element={
            <CampaignProvider>
              <ThankYou />
            </CampaignProvider>
          } />

          {/* Routes with slug parameter */}
          <Route path="/:slug" element={
            <CampaignProvider>
              <LandingPage />
            </CampaignProvider>
          } />
          <Route path="/thank-you/:slug" element={
            <CampaignProvider>
              <ThankYou />
            </CampaignProvider>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/webhooks" element={
            <ProtectedRoute>
              <Webhooks />
            </ProtectedRoute>
          } />
          <Route path="/admin/campaign-content" element={
            <ProtectedRoute>
              <AdminCampaignContent />
            </ProtectedRoute>
          } />

          {/* Auth and fallback routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

function LoginPage() {
  const session = useSession()
  const supabase = useSupabaseClient()

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-md w-96">
        {!session ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            redirectTo={`${window.location.origin}/admin`}
          />
        ) : (
          <Navigate to="/admin" />
        )}
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default App;
