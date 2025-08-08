import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Match, Player } from "@shared/schema";
import { formatTime } from "@/lib/tournament-logic";

export default function MatchTimer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [timerSeconds, setTimerSeconds] = useState(120); // 2 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const matchId = localStorage.getItem("currentMatchId");
  const tournamentId = localStorage.getItem("currentTournamentId");

  const { data: match } = useQuery<Match>({
    queryKey: ["/api/matches", matchId],
    enabled: !!matchId,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/tournaments", tournamentId, "players"],
    enabled: !!tournamentId,
  });

  const updateScoreMutation = useMutation({
    mutationFn: async (data: { player1Score: number; player2Score: number }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/score`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
    },
  });

  const completeMatchMutation = useMutation({
    mutationFn: async (data: { winnerId: string; player1Score: number; player2Score: number }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/complete`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
      toast({
        title: "Match Completed",
        description: "Match has been completed successfully.",
      });
      setLocation("/bracket");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete match",
        variant: "destructive",
      });
    },
  });

  // Timer management
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            toast({
              title: "Time's Up!",
              description: "The match timer has ended.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isTimerRunning, timerSeconds > 0]);

  if (!matchId || !match) {
    return (
      <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Match Selected</h2>
            <p className="text-gray-600 mb-6">Please select a match from the bracket.</p>
            <Button
              onClick={() => setLocation("/bracket")}
              className="bg-tournament-500 hover:bg-tournament-600"
            >
              Go to Bracket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(120);
  };

  const handleIncrementScore = (playerNumber: 1 | 2) => {
    const newPlayer1Score = playerNumber === 1 ? (match.player1Score || 0) + 1 : match.player1Score || 0;
    const newPlayer2Score = playerNumber === 2 ? (match.player2Score || 0) + 1 : match.player2Score || 0;
    
    updateScoreMutation.mutate({
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
    });
  };

  const handleDecrementScore = (playerNumber: 1 | 2) => {
    const currentPlayer1Score = match.player1Score || 0;
    const currentPlayer2Score = match.player2Score || 0;
    
    const newPlayer1Score = playerNumber === 1 ? Math.max(0, currentPlayer1Score - 1) : currentPlayer1Score;
    const newPlayer2Score = playerNumber === 2 ? Math.max(0, currentPlayer2Score - 1) : currentPlayer2Score;
    
    updateScoreMutation.mutate({
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
    });
  };

  const handleEndMatch = () => {
    const player1Score = match.player1Score || 0;
    const player2Score = match.player2Score || 0;
    
    if (player1Score === player2Score) {
      toast({
        title: "Error",
        description: "Match cannot end in a tie. Please adjust scores.",
        variant: "destructive",
      });
      return;
    }
    
    const winnerId = player1Score > player2Score ? match.player1Id! : match.player2Id!;
    
    completeMatchMutation.mutate({
      winnerId,
      player1Score,
      player2Score,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* Current Match Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Timer</h2>
            <div className="bg-tournament-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-tournament-700 mb-1">Current Match</div>
              <div className="text-2xl font-bold text-gray-900">
                <span data-testid="text-current-player1">{player1?.name || "Player 1"}</span>
                <span className="text-tournament-500 mx-4">VS</span>
                <span data-testid="text-current-player2">{player2?.name || "Player 2"}</span>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="bg-gray-900 rounded-2xl p-8 mb-6">
              <div
                data-testid="text-timer-display"
                className="text-8xl font-bold text-white font-mono"
              >
                {formatTime(timerSeconds)}
              </div>
              <div className="text-gray-400 text-lg mt-2">Match Time</div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center space-x-4 mb-8">
              <Button
                data-testid="button-start-timer"
                onClick={handleStartTimer}
                disabled={isTimerRunning || timerSeconds === 0}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-play mr-3"></i>Start
              </Button>
              <Button
                data-testid="button-pause-timer"
                onClick={handlePauseTimer}
                disabled={!isTimerRunning}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-pause mr-3"></i>Pause
              </Button>
              <Button
                data-testid="button-reset-timer"
                onClick={handleResetTimer}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-redo mr-3"></i>Reset
              </Button>
            </div>
          </div>

          {/* Score Tracking */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Player 1 Score */}
            <div className="score-section bg-blue-50 rounded-xl p-6 text-center">
              <h3 data-testid="text-player1-name" className="text-xl font-semibold text-blue-800 mb-4">
                {player1?.name || "Player 1"}
              </h3>
              <div data-testid="text-player1-score" className="text-6xl font-bold text-blue-600 mb-4">
                {match.player1Score || 0}
              </div>
              <div className="flex justify-center space-x-3">
                <Button
                  data-testid="button-decrement-score1"
                  onClick={() => handleDecrementScore(1)}
                  disabled={updateScoreMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full text-xl font-bold"
                  size="sm"
                >
                  <i className="fas fa-minus"></i>
                </Button>
                <Button
                  data-testid="button-increment-score1"
                  onClick={() => handleIncrementScore(1)}
                  disabled={updateScoreMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white w-12 h-12 rounded-full text-xl font-bold"
                  size="sm"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>
            </div>

            {/* Player 2 Score */}
            <div className="score-section bg-red-50 rounded-xl p-6 text-center">
              <h3 data-testid="text-player2-name" className="text-xl font-semibold text-red-800 mb-4">
                {player2?.name || "Player 2"}
              </h3>
              <div data-testid="text-player2-score" className="text-6xl font-bold text-red-600 mb-4">
                {match.player2Score || 0}
              </div>
              <div className="flex justify-center space-x-3">
                <Button
                  data-testid="button-decrement-score2"
                  onClick={() => handleDecrementScore(2)}
                  disabled={updateScoreMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full text-xl font-bold"
                  size="sm"
                >
                  <i className="fas fa-minus"></i>
                </Button>
                <Button
                  data-testid="button-increment-score2"
                  onClick={() => handleIncrementScore(2)}
                  disabled={updateScoreMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white w-12 h-12 rounded-full text-xl font-bold"
                  size="sm"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>
            </div>
          </div>

          {/* Match Actions */}
          <div className="flex justify-center space-x-4">
            <Button
              data-testid="button-end-match"
              onClick={handleEndMatch}
              disabled={completeMatchMutation.isPending || (match.player1Score || 0) === (match.player2Score || 0)}
              className="bg-tournament-500 hover:bg-tournament-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
              size="lg"
            >
              <i className="fas fa-flag-checkered mr-3"></i>End Match
            </Button>
            <Button
              data-testid="button-back-bracket"
              onClick={() => setLocation("/bracket")}
              variant="outline"
              className="px-8 py-4 text-lg font-semibold shadow-lg"
              size="lg"
            >
              <i className="fas fa-arrow-left mr-3"></i>Back to Bracket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
