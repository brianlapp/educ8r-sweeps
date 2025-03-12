import React, { useEffect, useState } from 'react';
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

// Add the new import for AdminCampaignContent
import AdminCampaignContent from "@/pages/AdminCampaignContent";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-react-ts-shadcn">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/thank-you" element={<ThankYou />} />

          {/* Dynamic route for campaign slugs */}
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

          {/* Update the routes section to include our new page */}
          <Route path="/admin/campaign-content" element={
            <ProtectedRoute>
              <AdminCampaignContent />
            </ProtectedRoute>
          } />

          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
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


// A wrapper for <Route> that redirects to the login page
// if you're not yet authenticated.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useSession();

  if (!session) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default App;
