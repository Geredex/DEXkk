import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [selectedPreset, setSelectedPreset] = useState(120);
  
  // Timer presets in seconds
  const timerPresets = [
    { label: "30 seconds", value: 30 },
    { label: "1 minute", value: 60 },
    { label: "2 minutes", value: 120 },
    { label: "3 minutes", value: 180 },
    { label: "5 minutes", value: 300 },
    { label: "10 minutes", value: 600 },
  ];

  // Sound alert functions
  const playStartSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playWarningSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + i * 0.2);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.15);
      
      oscillator.start(audioContext.currentTime + i * 0.2);
      oscillator.stop(audioContext.currentTime + i * 0.2 + 0.15);
    }
  };

  const playEndSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < 5; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + i * 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.2);
      
      oscillator.start(audioContext.currentTime + i * 0.1);
      oscillator.stop(audioContext.currentTime + i * 0.1 + 0.2);
    }
  };

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
    mutationFn: async (data: { 
      player1Score: number; 
      player2Score: number;
      player1Ippon?: number;
      player1Wazari?: number;
      player1Yuko?: number;
      player1Warnings?: number;
      player1Senshu?: boolean;
      player2Ippon?: number;
      player2Wazari?: number;
      player2Yuko?: number;
      player2Warnings?: number;
      player2Senshu?: boolean;
    }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/score`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
    },
  });

  const completeMatchMutation = useMutation({
    mutationFn: async (data: { 
      winnerId: string; 
      player1Score: number; 
      player2Score: number;
      player1Ippon?: number;
      player1Wazari?: number;
      player1Yuko?: number;
      player1Warnings?: number;
      player1Senshu?: boolean;
      player2Ippon?: number;
      player2Wazari?: number;
      player2Yuko?: number;
      player2Warnings?: number;
      player2Senshu?: boolean;
    }) => {
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

  // Timer management with sound alerts
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playEndSound();
            toast({
              title: "Time's Up!",
              description: "The match timer has ended.",
            });
            return 0;
          }
          
          // Warning sounds at 30, 10, and 5 seconds
          if (prev === 31 || prev === 11 || prev === 6) {
            playWarningSound();
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
    playStartSound();
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(selectedPreset);
  };

  const handlePresetChange = (preset: number) => {
    setSelectedPreset(preset);
    setTimerSeconds(preset);
    setIsTimerRunning(false);
  };

  const handleSenshuToggle = (playerNumber: 1 | 2) => {
    const currentData = {
      player1Score: match.player1Score || 0,
      player2Score: match.player2Score || 0,
      player1Ippon: match.player1Ippon || 0,
      player1Wazari: match.player1Wazari || 0,
      player1Yuko: match.player1Yuko || 0,
      player1Warnings: match.player1Warnings || 0,
      player1Senshu: match.player1Senshu || false,
      player2Ippon: match.player2Ippon || 0,
      player2Wazari: match.player2Wazari || 0,
      player2Yuko: match.player2Yuko || 0,
      player2Warnings: match.player2Warnings || 0,
      player2Senshu: match.player2Senshu || false,
    };

    if (playerNumber === 1) {
      currentData.player1Senshu = !currentData.player1Senshu;
      if (currentData.player1Senshu) {
        currentData.player2Senshu = false; // Only one player can have senshu
      }
    } else {
      currentData.player2Senshu = !currentData.player2Senshu;
      if (currentData.player2Senshu) {
        currentData.player1Senshu = false; // Only one player can have senshu
      }
    }

    updateScoreMutation.mutate(currentData);
  };

  const handleKarateScore = (playerNumber: 1 | 2, scoreType: 'ippon' | 'wazari' | 'yuko' | 'warning', increment: boolean = true) => {
    const currentData = {
      player1Score: match.player1Score || 0,
      player2Score: match.player2Score || 0,
      player1Ippon: match.player1Ippon || 0,
      player1Wazari: match.player1Wazari || 0,
      player1Yuko: match.player1Yuko || 0,
      player1Warnings: match.player1Warnings || 0,
      player1Senshu: match.player1Senshu || false,
      player2Ippon: match.player2Ippon || 0,
      player2Wazari: match.player2Wazari || 0,
      player2Yuko: match.player2Yuko || 0,
      player2Warnings: match.player2Warnings || 0,
      player2Senshu: match.player2Senshu || false,
    };

    const change = increment ? 1 : -1;
    
    if (playerNumber === 1) {
      switch (scoreType) {
        case 'ippon':
          currentData.player1Ippon = Math.max(0, currentData.player1Ippon + change);
          break;
        case 'wazari':
          currentData.player1Wazari = Math.max(0, currentData.player1Wazari + change);
          break;
        case 'yuko':
          currentData.player1Yuko = Math.max(0, currentData.player1Yuko + change);
          break;
        case 'warning':
          currentData.player1Warnings = Math.max(0, currentData.player1Warnings + change);
          break;
      }
    } else {
      switch (scoreType) {
        case 'ippon':
          currentData.player2Ippon = Math.max(0, currentData.player2Ippon + change);
          break;
        case 'wazari':
          currentData.player2Wazari = Math.max(0, currentData.player2Wazari + change);
          break;
        case 'yuko':
          currentData.player2Yuko = Math.max(0, currentData.player2Yuko + change);
          break;
        case 'warning':
          currentData.player2Warnings = Math.max(0, currentData.player2Warnings + change);
          break;
      }
    }

    // Calculate total score based on karate scoring system
    // Ippon = 3 points, Wazari = 2 points, Yuko = 1 point
    currentData.player1Score = (currentData.player1Ippon * 3) + (currentData.player1Wazari * 2) + currentData.player1Yuko;
    currentData.player2Score = (currentData.player2Ippon * 3) + (currentData.player2Wazari * 2) + currentData.player2Yuko;
    
    updateScoreMutation.mutate(currentData);

    // Check for elimination due to 5 warnings
    if (currentData.player1Warnings >= 5) {
      setTimeout(() => {
        toast({
          title: "Player Eliminated!",
          description: `${player1?.name || "Player 1"} has been eliminated due to 5 warnings.`,
          variant: "destructive",
        });
        // Auto-complete match with player 2 as winner
        completeMatchMutation.mutate({
          winnerId: match.player2Id!,
          player1Score: currentData.player1Score,
          player2Score: currentData.player2Score,
          player1Ippon: currentData.player1Ippon,
          player1Wazari: currentData.player1Wazari,
          player1Yuko: currentData.player1Yuko,
          player1Warnings: currentData.player1Warnings,
          player1Senshu: currentData.player1Senshu,
          player2Ippon: currentData.player2Ippon,
          player2Wazari: currentData.player2Wazari,
          player2Yuko: currentData.player2Yuko,
          player2Warnings: currentData.player2Warnings,
          player2Senshu: currentData.player2Senshu,
        });
      }, 1000);
    } else if (currentData.player2Warnings >= 5) {
      setTimeout(() => {
        toast({
          title: "Player Eliminated!",
          description: `${player2?.name || "Player 2"} has been eliminated due to 5 warnings.`,
          variant: "destructive",
        });
        // Auto-complete match with player 1 as winner
        completeMatchMutation.mutate({
          winnerId: match.player1Id!,
          player1Score: currentData.player1Score,
          player2Score: currentData.player2Score,
          player1Ippon: currentData.player1Ippon,
          player1Wazari: currentData.player1Wazari,
          player1Yuko: currentData.player1Yuko,
          player1Warnings: currentData.player1Warnings,
          player1Senshu: currentData.player1Senshu,
          player2Ippon: currentData.player2Ippon,
          player2Wazari: currentData.player2Wazari,
          player2Yuko: currentData.player2Yuko,
          player2Warnings: currentData.player2Warnings,
          player2Senshu: currentData.player2Senshu,
        });
      }, 1000);
    }
  };

  const handleEndMatch = () => {
    const player1Score = match.player1Score || 0;
    const player2Score = match.player2Score || 0;
    const player1Senshu = match.player1Senshu || false;
    const player2Senshu = match.player2Senshu || false;
    
    let winnerId: string;
    
    if (player1Score === player2Score) {
      // Check for senshu (tie-breaker)
      if (player1Senshu && !player2Senshu) {
        winnerId = match.player1Id!;
        toast({
          title: "Senshu Victory!",
          description: `${player1?.name || "Player 1"} wins by senshu (first point scored).`,
        });
      } else if (player2Senshu && !player1Senshu) {
        winnerId = match.player2Id!;
        toast({
          title: "Senshu Victory!",
          description: `${player2?.name || "Player 2"} wins by senshu (first point scored).`,
        });
      } else {
        toast({
          title: "Error",
          description: "Match cannot end in a tie. Please adjust scores or assign senshu to the player who scored first.",
          variant: "destructive",
        });
        return;
      }
    } else {
      winnerId = player1Score > player2Score ? match.player1Id! : match.player2Id!;
    }
    
    completeMatchMutation.mutate({
      winnerId,
      player1Score,
      player2Score,
      player1Ippon: match.player1Ippon || undefined,
      player1Wazari: match.player1Wazari || undefined,
      player1Yuko: match.player1Yuko || undefined,
      player1Warnings: match.player1Warnings || undefined,
      player1Senshu: match.player1Senshu || undefined,
      player2Ippon: match.player2Ippon || undefined,
      player2Wazari: match.player2Wazari || undefined,
      player2Yuko: match.player2Yuko || undefined,
      player2Warnings: match.player2Warnings || undefined,
      player2Senshu: match.player2Senshu || undefined,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* Score & Timer Header */}
          <div className="flex justify-between items-center mb-8 gap-4">
            {/* Player 1 Score Display */}
            <div className={`flex-1 rounded-xl p-4 text-center relative ${
              player1?.beltColor === "red" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
            }`}>
              {match.player1Senshu && (
                <div data-testid="badge-player1-senshu" className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  SENSHU
                </div>
              )}
              <div className="text-sm font-medium opacity-90 uppercase tracking-wider">{player1?.name || "Player 1"}</div>
              <div data-testid="text-player1-score-large" className="text-6xl font-black">
                {match.player1Score || 0}
              </div>
            </div>

            {/* Timer Center Piece */}
            <div className="flex-[1.5] text-center">
              <div className="bg-gray-900 rounded-2xl p-6 shadow-xl mb-4 border-2 border-gray-800">
                <div
                  data-testid="text-timer-display"
                  className="text-7xl font-bold text-white font-mono tracking-tighter"
                >
                  {formatTime(timerSeconds)}
                </div>
              </div>
              <div className="flex justify-center space-x-2">
                <Button
                  data-testid="button-start-timer"
                  onClick={handleStartTimer}
                  disabled={isTimerRunning || timerSeconds === 0}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                  size="sm"
                >
                  <i className="fas fa-play mr-2"></i>Start
                </Button>
                <Button
                  data-testid="button-pause-timer"
                  onClick={handlePauseTimer}
                  disabled={!isTimerRunning}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-md"
                  size="sm"
                >
                  <i className="fas fa-pause mr-2"></i>Pause
                </Button>
                <Button
                  data-testid="button-reset-timer"
                  onClick={handleResetTimer}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                  size="sm"
                >
                  <i className="fas fa-redo mr-2"></i>Reset
                </Button>
              </div>
            </div>

            {/* Player 2 Score Display */}
            <div className={`flex-1 rounded-xl p-4 text-center relative ${
              player2?.beltColor === "red" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
            }`}>
              {match.player2Senshu && (
                <div data-testid="badge-player2-senshu" className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  SENSHU
                </div>
              )}
              <div className="text-sm font-medium opacity-90 uppercase tracking-wider">{player2?.name || "Player 2"}</div>
              <div data-testid="text-player2-score-large" className="text-6xl font-black">
                {match.player2Score || 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Player 1 Scoring */}
            <div className={`score-section rounded-xl p-6 ${
              player1?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player1-name" className={`text-xl font-semibold mb-4 text-center ${
                player1?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player1?.name || "Player 1"} ({player1?.beltColor?.toUpperCase() || "RED"})
              </h3>
              
              {/* Total Score Display */}
              <div data-testid="text-player1-score" className={`text-4xl font-bold mb-4 text-center ${
                player1?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {match.player1Score || 0} points
              </div>

              {/* Karate Scoring Buttons */}
              <div className="space-y-3">
                {/* Ippon */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Ippon (3pt):</span>
                    <span data-testid="text-player1-ippon" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">
                      {match.player1Ippon || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-ippon1"
                      onClick={() => handleKarateScore(1, 'ippon', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-ippon1"
                      onClick={() => handleKarateScore(1, 'ippon', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Wazari */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Wazari (2pt):</span>
                    <span data-testid="text-player1-wazari" className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">
                      {match.player1Wazari || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-wazari1"
                      onClick={() => handleKarateScore(1, 'wazari', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-wazari1"
                      onClick={() => handleKarateScore(1, 'wazari', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Yuko */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Yuko (1pt):</span>
                    <span data-testid="text-player1-yuko" className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                      {match.player1Yuko || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-yuko1"
                      onClick={() => handleKarateScore(1, 'yuko', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-yuko1"
                      onClick={() => handleKarateScore(1, 'yuko', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Warnings */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Warnings:</span>
                    <span data-testid="text-player1-warnings" className={`px-2 py-1 rounded font-bold ${
                      (match.player1Warnings || 0) >= 4 
                        ? "bg-red-200 text-red-900 border border-red-300" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {match.player1Warnings || 0}/5
                    </span>
                    {(match.player1Warnings || 0) >= 4 && (
                      <span className="text-xs text-red-600 font-semibold">
                        ⚠️ DANGER
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-warnings1"
                      onClick={() => handleKarateScore(1, 'warning', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-warnings1"
                      onClick={() => handleKarateScore(1, 'warning', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Senshu */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Senshu (1st point):</span>
                    <span data-testid="text-player1-senshu" className={`px-3 py-1 rounded font-bold ${
                      match.player1Senshu 
                        ? "bg-purple-200 text-purple-900 border-2 border-purple-400" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {match.player1Senshu ? "✓ YES" : "NO"}
                    </span>
                  </div>
                  <Button
                    data-testid="button-toggle-senshu1"
                    onClick={() => handleSenshuToggle(1)}
                    disabled={updateScoreMutation.isPending}
                    className={`${
                      match.player1Senshu 
                        ? "bg-purple-500 hover:bg-purple-600" 
                        : "bg-gray-400 hover:bg-gray-500"
                    } text-white px-4 py-2 text-sm font-semibold`}
                    size="sm"
                  >
                    Toggle
                  </Button>
                </div>
              </div>
            </div>

            {/* Player 2 Scoring */}
            <div className={`score-section rounded-xl p-6 ${
              player2?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player2-name" className={`text-xl font-semibold mb-4 text-center ${
                player2?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player2?.name || "Player 2"} ({player2?.beltColor?.toUpperCase() || "BLUE"})
              </h3>
              
              {/* Total Score Display */}
              <div data-testid="text-player2-score" className={`text-4xl font-bold mb-4 text-center ${
                player2?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {match.player2Score || 0} points
              </div>

              {/* Karate Scoring Buttons */}
              <div className="space-y-3">
                {/* Ippon */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Ippon (3pt):</span>
                    <span data-testid="text-player2-ippon" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">
                      {match.player2Ippon || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-ippon2"
                      onClick={() => handleKarateScore(2, 'ippon', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-ippon2"
                      onClick={() => handleKarateScore(2, 'ippon', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Wazari */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Wazari (2pt):</span>
                    <span data-testid="text-player2-wazari" className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">
                      {match.player2Wazari || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-wazari2"
                      onClick={() => handleKarateScore(2, 'wazari', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-wazari2"
                      onClick={() => handleKarateScore(2, 'wazari', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Yuko */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Yuko (1pt):</span>
                    <span data-testid="text-player2-yuko" className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                      {match.player2Yuko || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-yuko2"
                      onClick={() => handleKarateScore(2, 'yuko', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-yuko2"
                      onClick={() => handleKarateScore(2, 'yuko', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Warnings */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Warnings:</span>
                    <span data-testid="text-player2-warnings" className={`px-2 py-1 rounded font-bold ${
                      (match.player2Warnings || 0) >= 4 
                        ? "bg-red-200 text-red-900 border border-red-300" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {match.player2Warnings || 0}/5
                    </span>
                    {(match.player2Warnings || 0) >= 4 && (
                      <span className="text-xs text-red-600 font-semibold">
                        ⚠️ DANGER
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-warnings2"
                      onClick={() => handleKarateScore(2, 'warning', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-warnings2"
                      onClick={() => handleKarateScore(2, 'warning', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Senshu */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Senshu (1st point):</span>
                    <span data-testid="text-player2-senshu" className={`px-3 py-1 rounded font-bold ${
                      match.player2Senshu 
                        ? "bg-purple-200 text-purple-900 border-2 border-purple-400" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {match.player2Senshu ? "✓ YES" : "NO"}
                    </span>
                  </div>
                  <Button
                    data-testid="button-toggle-senshu2"
                    onClick={() => handleSenshuToggle(2)}
                    disabled={updateScoreMutation.isPending}
                    className={`${
                      match.player2Senshu 
                        ? "bg-purple-500 hover:bg-purple-600" 
                        : "bg-gray-400 hover:bg-gray-500"
                    } text-white px-4 py-2 text-sm font-semibold`}
                    size="sm"
                  >
                    Toggle
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Settings & Sound Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Timer Presets & Custom Time */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Timer Presets</h3>
                <div className="grid grid-cols-3 gap-3">
                  {timerPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      data-testid={`button-preset-${preset.value}`}
                      onClick={() => handlePresetChange(preset.value)}
                      disabled={isTimerRunning}
                      variant={selectedPreset === preset.value ? "default" : "outline"}
                      className={`text-sm ${
                        selectedPreset === preset.value 
                          ? "bg-tournament-500 hover:bg-tournament-600 text-white" 
                          : "hover:bg-gray-100"
                      }`}
                      size="sm"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <i className="fas fa-clock mr-2 text-tournament-500"></i>Custom Match Time
                </h4>
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Minutes</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      className="h-10 w-16 text-center font-bold text-lg"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const mins = parseInt(e.target.value) || 0;
                      const secs = timerSeconds % 60;
                      const total = (mins * 60) + secs;
                      setTimerSeconds(total);
                      setSelectedPreset(total);
                    }}
                      value={Math.floor(timerSeconds / 60)}
                    />
                  </div>
                  <span className="text-2xl font-bold mt-4">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Seconds</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      className="h-10 w-16 text-center font-bold text-lg"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const mins = Math.floor(timerSeconds / 60);
                      const secs = parseInt(e.target.value) || 0;
                      const total = (mins * 60) + (secs % 60);
                      setTimerSeconds(total);
                      setSelectedPreset(total);
                    }}
                      value={timerSeconds % 60}
                    />
                  </div>
                  <Button 
                    variant="outline"
                    className="mt-4 h-10 px-4 hover:bg-tournament-50 hover:text-tournament-600 hover:border-tournament-300 transition-colors"
                    onClick={() => {
                      setIsTimerRunning(false);
                      toast({
                        title: "Time Set",
                        description: `Match time set to ${formatTime(timerSeconds)}`,
                      });
                    }}
                  >
                    Set
                  </Button>
                </div>
              </div>
            </div>

            {/* Sound Alerts & Rules Info */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 h-full">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                  <i className="fas fa-volume-up mr-2"></i>Sound Alerts & Rules
                </h4>
                <div className="text-xs text-blue-700 space-y-2">
                  <div className="flex items-start">
                    <span className="mr-2">🔔</span>
                    <span><strong>Start:</strong> Single beep when timer starts</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">⚠️</span>
                    <span><strong>Warnings:</strong> Triple beep at 30s, 10s, 5s remaining</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">🔚</span>
                    <span><strong>End:</strong> Five beeps when time is up</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-start font-semibold text-red-700">
                      <i className="fas fa-exclamation-triangle mr-2 mt-0.5"></i>
                      <span>Player is automatically eliminated at 5 warnings</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Match Actions */}
          <div className="flex justify-center space-x-4">
            <Button
              data-testid="button-end-match"
              onClick={handleEndMatch}
              disabled={completeMatchMutation.isPending}
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
