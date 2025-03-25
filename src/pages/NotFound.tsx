
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Check if we're in an admin route
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Helmet>
        <title>Page Not Found | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="w-16 h-16 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-xl text-gray-700 mb-2">Oops! Page not found</p>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
          <br />
          <span className="text-sm text-gray-500 mt-1 block">
            URL: {location.pathname}
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/">
              Return to Home
            </Link>
          </Button>
          
          {isAdminRoute && (
            <Button asChild variant="outline">
              <Link to="/admin">
                Go to Admin Dashboard
              </Link>
            </Button>
          )}
          
          <Button asChild variant="ghost">
            <Link to="/admin/email-migration">
              Email Migration
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
