import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import PlayersPage from "@/pages/PlayersPage";
import SubmitPage from "@/pages/SubmitPage";
import ProfilePage from "@/pages/ProfilePage";
import ReportPage from "@/pages/ReportPage";
import ContactPage from "@/pages/ContactPage";
import PrivacyPage from "@/pages/legal/PrivacyPage";
import TermsPage from "@/pages/legal/TermsPage";
import SecurityPage from "@/pages/legal/SecurityPage";
import StatusPage from "@/pages/StatusPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40">
        <Navigation />
      </header>
      <main id="main-content" className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/map" component={MapPage} />
          <Route path="/players" component={PlayersPage} />
          <Route path="/submit" component={SubmitPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/report" component={ReportPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/legal/privacy" component={PrivacyPage} />
          <Route path="/legal/terms" component={TermsPage} />
          <Route path="/legal/security" component={SecurityPage} />
          <Route path="/status" component={StatusPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
