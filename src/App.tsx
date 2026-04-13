import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Footer } from "./components/Footer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";
import { ScrollToTop } from "./components/ScrollToTop";

const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Services = lazy(() => import("./pages/Services"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewListing = lazy(() => import("./pages/NewListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const SignIn = lazy(() => import("./pages/SignIn"));
const CompleteSignup = lazy(() => import("./pages/CompleteSignup"));
const Admin = lazy(() => import("./pages/Admin"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const About = lazy(() => import("./pages/About"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Requests = lazy(() => import("./pages/Requests"));
const Request = lazy(() => import("./pages/Request"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// 🔴 2. HANDLE REDIRECT USING AUTH STATE (CORRECT APPROACH)
// Centralized Auth Redirect Handler
const AuthRedirectHandler = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

  useEffect(() => {
    // 🔴 7. DEBUG (MANDATORY)
    console.log("[AuthRedirectHandler] Check:", { user: user?.email, isLoading, path: location.pathname });

    if (!isLoading && user) {
      const email = user.email?.trim().toLowerCase();
      const isAdmin = email === ADMIN_EMAIL.toLowerCase();

      // 🔴 5. PREVENT INFINITE REDIRECT LOOP
      if (isAdmin && location.pathname !== "/admin" && (location.pathname === "/signin" || location.pathname === "/signup")) {
        console.log("[AuthRedirectHandler] Admin detected on auth page, redirecting to /admin");
        navigate("/admin", { replace: true });
      } else if (!isAdmin && location.pathname === "/signin") {
        console.log("[AuthRedirectHandler] User detected on auth page, redirecting to /dashboard");
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AuthRedirectHandler />
            <Toaster />
            <Sonner />
            <ScrollToTop />
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow flex flex-col">
                <Suspense fallback={<div className="flex-grow flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/service/:id" element={<ServiceDetail />} />
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/request" element={<Request />} />
                    <Route path="/user/:id" element={<UserProfile />} />
                    
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/new" element={<ProtectedRoute><NewListing /></ProtectedRoute>} />
                    <Route path="/dashboard/edit/:type/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
                    
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/complete-signup" element={<CompleteSignup />} />
                    
                    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
  
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<ContactUs />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
