import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound.tsx";

import { CloudGate } from "./shared/components/CloudGate";
import { getAllPublicRoutes, getAllAdminRoutes } from "./shared/moduleRegistry";

const queryClient = new QueryClient();

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
          </CloudGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
