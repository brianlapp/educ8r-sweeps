
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import TestLanding from "./pages/TestLanding";
import Admin from "./pages/Admin";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/test-landing" element={<TestLanding />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
