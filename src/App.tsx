import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import VirtualTryOnLoader from "@/components/ui/VirtualTryOnLoader";

// Lazy Load Pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const MasterPanel = lazy(() => import("./pages/MasterPanel"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Vitrine = lazy(() => import("./pages/Vitrine"));
const DirectTryOn = lazy(() => import("./pages/DirectTryOn"));
const ModelCreationPage = lazy(() => import("./pages/ModelCreationPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<VirtualTryOnLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/vitrine/:slug" element={<Vitrine />} />
              <Route path="/provador/:glassId" element={<DirectTryOn />} />
              <Route
                path="/master"
                element={
                  <ProtectedRoute allowedRoles={['master']}>
                    <MasterPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'master']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/model-creation"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'master']}>
                    <ModelCreationPage />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
