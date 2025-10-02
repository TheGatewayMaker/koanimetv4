import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Anime from "./pages/Anime";
import Discover from "./pages/Discover";
import Schedule from "./pages/Schedule";
import Watchlist from "./pages/Watchlist";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Watch from "./pages/Watch";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/anime/:id" element={<Anime />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/watch/:id" element={<Watch />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
