import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TournamentHeader from "@/components/tournament-header";
import MobileNav from "@/components/mobile-nav";
import TournamentSetup from "@/pages/tournament-setup";
import TournamentBracket from "@/pages/tournament-bracket";
import MatchTimer from "@/pages/match-timer";
import MatchKata from "@/pages/match-kata";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { Tournament } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TournamentSetup} />
      <Route path="/bracket" component={TournamentBracket} />
      <Route path="/timer" component={MatchTimer} />
      <Route path="/kata" component={MatchKata} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainContent() {
  const tournamentId = localStorage.getItem("currentTournamentId");

  const { data: tournament } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", tournamentId],
    enabled: !!tournamentId,
  });

  useEffect(() => {
    if (tournament) {
      document.documentElement.setAttribute("data-theme", tournament.type);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [tournament]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TournamentHeader />
      <main className="pt-4">
        <Router />
      </main>
      <MobileNav />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
