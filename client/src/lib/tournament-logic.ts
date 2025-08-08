import { Match, Player } from "@shared/schema";

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getMatchTitle(match: Match, players: Player[]): string {
  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);
  
  if (!player1 || !player2) return "TBD vs TBD";
  return `${player1.name} vs ${player2.name}`;
}

export function getWinnerName(match: Match, players: Player[]): string {
  if (!match.winnerId) return "TBD";
  const winner = players.find(p => p.id === match.winnerId);
  return winner?.name || "TBD";
}

export function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semi Finals";
  if (round === totalRounds - 2) return "Quarter Finals";
  return `Round ${round}`;
}

export function getMatchStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "border-green-200 bg-green-50";
    case "in_progress":
      return "border-orange-200 bg-orange-50";
    case "pending":
    default:
      return "border-gray-200 bg-white";
  }
}

export function getMatchStatusText(status: string): { text: string; icon: string; color: string } {
  switch (status) {
    case "completed":
      return { text: "Complete", icon: "fas fa-check", color: "text-green-700 bg-green-50" };
    case "in_progress":
      return { text: "In Progress", icon: "fas fa-clock", color: "text-orange-700 bg-orange-50" };
    case "pending":
    default:
      return { text: "Pending", icon: "fas fa-hourglass", color: "text-gray-500 bg-gray-50" };
  }
}

export function canStartMatch(match: Match): boolean {
  return match.status === "pending" && match.player1Id && match.player2Id;
}

export function getNextMatch(matches: Match[]): Match | null {
  return matches.find(match => match.status === "pending" && match.player1Id && match.player2Id) || null;
}

export function getCurrentMatch(matches: Match[]): Match | null {
  return matches.find(match => match.status === "in_progress") || null;
}

export function getCompletedMatchesCount(matches: Match[]): number {
  return matches.filter(match => match.status === "completed").length;
}

export function getTotalMatchesCount(tournamentSize: number): number {
  return tournamentSize - 1; // Total matches in elimination tournament
}
