import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppProvider } from "@/context/AppContext";
import Camera from "@/pages/Camera";
import Crop from "@/pages/Crop";
import Result from "@/pages/Result";
import Header from "@/components/Header";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Camera} />
      <Route path="/crop" component={Crop} />
      <Route path="/result" component={Result} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <div className="max-w-md mx-auto min-h-screen flex flex-col bg-gray-50">
            <Header />
            <Toaster />
            <Router />
          </div>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
