import { lazy, Suspense } from "react";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Route, Routes } from "react-router-dom";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { AuthProvider } from "./features/auth/contexts/AuthContext";
  import { CampusProvider } from "./features/campus/contexts/CampusContext";
  import { ProtectedRoute, PublicRoute } from "./features/auth/components/RouteGuards";
  import { AdminRoute } from "./features/admin/components/AdminRoute";
  import ErrorBoundary from "./components/ErrorBoundary";
  import { ScrollToTop } from "./components/ScrollToTop";
  import { CommandMenu } from "./components/CommandMenu";
  import { CartProvider } from "./features/marketplace/contexts/CartContext";
  import { PageTracker } from "./components/PageTracker";

  // Deferred — not needed for first paint
  const CartSidebar = lazy(() => import("./components/CartSidebar").then(m => ({ default: m.CartSidebar })));
  const InstallPrompt = lazy(() => import("./components/InstallPrompt").then(m => ({ default: m.InstallPrompt })));
  const Footer = lazy(() => import("./components/Footer").then(m => ({ default: m.Footer })));

  const Index = lazy(() => import("./features/static/pages/Home.tsx"));
  const Marketplace = lazy(() => import("./features/marketplace/pages/Marketplace.tsx"));
  const MarketCampus = lazy(() => import("./features/marketplace/pages/MarketCampus.tsx"));
  const ProductDetail = lazy(() => import("./features/marketplace/pages/ProductDetail.tsx"));
  const Services = lazy(() => import("./features/services/pages/Services.tsx"));
  const ServiceDetail = lazy(() => import("./features/services/pages/ServiceDetail.tsx"));
  const Dashboard = lazy(() => import("./features/dashboard/pages/Dashboard.tsx"));
  const NewListing = lazy(() => import("./features/marketplace/pages/NewListing.tsx"));
  const EditListing = lazy(() => import("./features/marketplace/pages/EditListing.tsx"));
  const SignIn = lazy(() => import("./features/auth/pages/SignIn.tsx"));
  const CompleteSignup = lazy(() => import("./features/auth/pages/CompleteSignup.tsx"));
  const Admin = lazy(() => import("./features/admin/pages/AdminDashboard.tsx"));
  const UserProfile = lazy(() => import("./features/user/pages/UserProfile.tsx"));
  const About = lazy(() => import("./features/static/pages/About.tsx"));
  const ContactUs = lazy(() => import("./features/static/pages/ContactUs.tsx"));
  const NotFound = lazy(() => import("./features/static/pages/NotFound.tsx"));
  const CampusDetail = lazy(() => import("./features/campus/pages/CampusDetail.tsx"));
  const BusinessDetail = lazy(() => import("./features/business/pages/BusinessDetail.tsx"));
  const HostelDetail = lazy(() => import("./features/hostel/pages/HostelDetail.tsx"));
  const NotificationsPage = lazy(() => import("./features/notifications/pages/NotificationsPage.tsx"));
  const CheckoutPage = lazy(() => import("./features/marketplace/pages/CheckoutPage.tsx"));
  const OrderHistoryPage = lazy(() => import("./features/dashboard/pages/OrderHistoryPage.tsx"));

  function PageLoader() {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading…</p>
      </div>
    );
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 2, retry: 1, refetchOnWindowFocus: false },
    },
  });

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <CampusProvider>
              <CartProvider>
                <CommandMenu />
                <Suspense fallback={null}><CartSidebar /></Suspense>
                <Toaster />
                <Sonner />
                <ScrollToTop />
                <PageTracker />
                <Suspense fallback={null}><InstallPrompt /></Suspense>
                <div className="flex flex-col min-h-screen">
                  <main className="flex-grow flex flex-col">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/marketplace/:category" element={<Marketplace />} />
                        <Route path="/market/:campusSlug" element={<MarketCampus />} />
                        <Route path="/product/:slug" element={<ProductDetail />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/service/:slug" element={<ServiceDetail />} />
                        <Route path="/campus/:campusSlug" element={<CampusDetail />} />
                        <Route path="/business/:businessSlug" element={<BusinessDetail />} />
                        <Route path="/hostels/:campus" element={<HostelDetail />} />
                        <Route path="/hostels/:campus/:hostelType" element={<HostelDetail />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/user/:username" element={<UserProfile />} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/dashboard/new" element={<ProtectedRoute><NewListing /></ProtectedRoute>} />
                        <Route path="/dashboard/edit/:type/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
                        <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
                        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                        <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
                        <Route path="/complete-signup" element={<ProtectedRoute><CompleteSignup /></ProtectedRoute>} />
                        <Route path="/admin" element={<AdminRoute><ErrorBoundary><Admin /></ErrorBoundary></AdminRoute>} />
                        <Route path="/contact" element={<ContactUs />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Suspense fallback={<div className="h-48" />}><Footer /></Suspense>
                </div>
              </CartProvider>
            </CampusProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  export default App;
  