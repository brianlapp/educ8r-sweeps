
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import TestLanding from "./pages/TestLanding";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Documentation from "./pages/Documentation";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/test-landing" element={<TestLanding />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/terms" element={<Terms />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route path="/docs" element={<Documentation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
