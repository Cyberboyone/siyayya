import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  useSEO({
    title: "Page Not Found",
    description: "The page you are looking for could not be found on Siyayya.",
    noindex: true,
  });
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-md py-24 text-center">
        <div className="rounded-2xl border border-border/50 bg-card/50 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <span className="text-4xl font-black text-primary">404</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono break-all">
            {location.pathname}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="h-4 w-4" /> Go Home
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <ArrowLeft className="h-4 w-4" /> Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
