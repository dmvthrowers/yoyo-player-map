import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomePage from "@/spa-pages/HomePage";
import MapPage from "@/spa-pages/MapPage";
import PlayersPage from "@/spa-pages/PlayersPage";
import SubmitPage from "@/spa-pages/SubmitPage";
import ProfilePage from "@/spa-pages/ProfilePage";
import ReportPage from "@/spa-pages/ReportPage";
import ContactPage from "@/spa-pages/ContactPage";
import PrivacyPage from "@/spa-pages/legal/PrivacyPage";
import TermsPage from "@/spa-pages/legal/TermsPage";
import SecurityPage from "@/spa-pages/legal/SecurityPage";
import StatusPage from "@/spa-pages/StatusPage";
import VerifyPage from "@/spa-pages/VerifyPage";
import NotFoundPage from "@/spa-pages/NotFoundPage";

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
          <Route path="/verify" component={VerifyPage} />
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
