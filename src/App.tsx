import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound.tsx";

import { CloudGate } from "./shared/components/CloudGate";
import { getAllPublicRoutes, getAllAdminRoutes } from "./shared/moduleRegistry";

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => {
  const publicRoutes = getAllPublicRoutes();
  const adminRoutes = getAllAdminRoutes();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CloudGate>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />

                {publicRoutes.map((r) => (
                  <Route key={`pub:${r.path}`} path={r.path} element={r.element} />
                ))}
                {adminRoutes.map((r) => (
                  <Route key={`adm:${r.path}`} path={r.path} element={r.element} />
                ))}

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CloudGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
