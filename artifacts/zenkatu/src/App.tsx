import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Perfil from "@/pages/perfil";
import ObraDetail from "@/pages/obra-detail";
import Generos from "@/pages/generos";
import GeneroDetail from "@/pages/genero-detail";
import Ranking from "@/pages/ranking";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminObras from "@/pages/admin-obras";
import AdminObrasForm from "@/pages/admin-obras-form";
import AdminEpisodios from "@/pages/admin-episodios";
import AdminGeneros from "@/pages/admin-generos";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAdmin, loading, setLocation, toast]);

  if (loading || !isAdmin) return null;

  return <Component />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/perfil" component={Perfil} />
        <Route path="/obra/:slug" component={ObraDetail} />
        <Route path="/generos" component={Generos} />
        <Route path="/genero/:slug" component={GeneroDetail} />
        <Route path="/ranking" component={Ranking} />

        {/* Admin Routes */}
        <Route path="/admin">
          <AdminRoute component={AdminDashboard} />
        </Route>
        <Route path="/admin/obras">
          <AdminRoute component={AdminObras} />
        </Route>
        <Route path="/admin/obras/:id">
          <AdminRoute component={AdminObrasForm} />
        </Route>
        <Route path="/admin/episodios/:obraId">
          <AdminRoute component={AdminEpisodios} />
        </Route>
        <Route path="/admin/generos">
          <AdminRoute component={AdminGeneros} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
