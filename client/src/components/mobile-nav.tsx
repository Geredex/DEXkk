import { Link, useLocation } from "wouter";

export default function MobileNav() {
  const [location] = useLocation();

  const getNavButtonClass = (path: string) => {
    const isActive = location === path;
    return `flex flex-col items-center py-3 transition-colors ${
      isActive
        ? "text-tournament-600 bg-tournament-50"
        : "text-gray-600"
    }`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-50">
      <div className="grid grid-cols-3 gap-1">
        <Link href="/" className={getNavButtonClass("/")}>
          <i className="fas fa-plus text-xl mb-1"></i>
          <span className="text-xs">Setup</span>
        </Link>
        <Link href="/bracket" className={getNavButtonClass("/bracket")}>
          <i className="fas fa-sitemap text-xl mb-1"></i>
          <span className="text-xs">Bracket</span>
        </Link>
        <Link href="/timer" className={getNavButtonClass("/timer")}>
          <i className="fas fa-stopwatch text-xl mb-1"></i>
          <span className="text-xs">Timer</span>
        </Link>
      </div>
    </div>
  );
}
