
import { LogOut, User } from "lucide-react";
import { Button } from "./button";
import { useLocation, useNavigate } from "react-router-dom";

export function SiteHeader({ showLogout = false }: { showLogout?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    if (showLogout) {
      navigate('/admin/login');
    }
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6" />
          <span className="text-xl font-semibold text-primary">Admin Portal</span>
        </div>
        {showLogout && (
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
