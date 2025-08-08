import { Link, useLocation } from "wouter";
import { Bold } from "lucide-react";

export default function TournamentHeader() {
  const [location] = useLocation();

  const getNavButtonClass = (path: string) => {
    const isActive = location === path;
    return `px-4 py-2 rounded-lg font-medium transition-colors ${
      isActive
        ? "text-tournament-600 bg-tournament-50"
        : "text-gray-600 hover:text-tournament-600"
    }`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-tournament-500 p-2 rounded-lg">
              <Bold className="text-white h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DEX</h1>
            <span className="text-sm text-gray-500 hidden sm:block">
              Shito Ryu Karate Tournament Manager
            </span>
          </div>
          <nav className="hidden sm:flex space-x-4">
            <Link href="/" className={getNavButtonClass("/")}>
              <i className="fas fa-plus mr-2"></i>New Tournament
            </Link>
            <Link href="/bracket" className={getNavButtonClass("/bracket")}>
              <i className="fas fa-sitemap mr-2"></i>Bracket
            </Link>
            <Link href="/timer" className={getNavButtonClass("/timer")}>
              <i className="fas fa-stopwatch mr-2"></i>Timer
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
