import { Link, useLocation } from "react-router-dom";
import { Search, Bell, User, Globe, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

export const WebHeader = () => {
  const { pathname } = useLocation();
  const navItems = [
    { label: "Hotel", path: "/hotel" },
    { label: "Shuttle", path: "/shuttle" },
    { label: "Ride", path: "/ride" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-gradient-hero text-primary-foreground shadow-elevated">
      <div className="container flex items-center justify-between gap-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">PYU-GO</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
            <Globe className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Masuk</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
