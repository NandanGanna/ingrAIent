import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChefHat, 
  LayoutDashboard, 
  ShoppingBag, 
  Sparkles, 
  Bookmark, 
  BarChart3, 
  Menu, 
  X, 
  AlertTriangle,
  Leaf
} from 'lucide-react';
import { getPantry, getExpiryStatus, getSavedRecipes } from '../../utils/pantry';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pantryCount, setPantryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  // Sync badge counts
  useEffect(() => {
    function updateCounts() {
      const items = getPantry();
      setPantryCount(items.length);
      const expiring = items.filter(i => {
        const status = getExpiryStatus(i.expiry);
        return status && (status.level === 'today' || status.level === 'tomorrow' || status.level === 'soon');
      }).length;
      setExpiringCount(expiring);
      setSavedCount(getSavedRecipes().length);
    }

    updateCounts();
    const interval = setInterval(updateCounts, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    { 
      to: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      to: '/pantry', 
      label: 'My Pantry', 
      icon: ShoppingBag,
      badge: pantryCount > 0 ? pantryCount : null
    },
    { 
      to: '/discover', 
      label: 'Discover Recipes', 
      icon: Sparkles,
      badge: expiringCount > 0 ? `${expiringCount} urgent` : null,
      badgeUrgent: expiringCount > 0
    },
    { 
      to: '/saved', 
      label: 'Saved Recipes', 
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : null
    },
    { 
      to: '/insights', 
      label: 'Kitchen Insights', 
      icon: BarChart3,
      badge: null
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F7F1] text-[#242A25] font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-[#244C3A] text-white p-5 border-r border-[#1e3f30] sticky top-0 h-screen justify-between z-20">
        <div>
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-[#D9E9A5] flex items-center justify-center text-[#244C3A] shadow-md group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 fill-[#244C3A]" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight leading-none text-white">
                Ingr<span className="text-[#D9E9A5] font-extrabold">AI</span>ent
              </div>
              <span className="text-[10px] text-[#A8BDA5] uppercase tracking-wider block mt-1 font-medium">
                Kitchen Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#D9E9A5] text-[#244C3A] font-semibold shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#244C3A]' : 'text-[#A8BDA5]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      item.badgeUrgent
                        ? 'bg-rose-500 text-white'
                        : isActive
                        ? 'bg-[#244C3A] text-[#D9E9A5]'
                        : 'bg-white/20 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Expiry Alert Callout in Sidebar */}
        <div className="pt-4 border-t border-white/10">
          {expiringCount > 0 ? (
            <Link
              to="/discover"
              className="block p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs hover:bg-amber-500/25 transition-colors"
            >
              <div className="flex items-center gap-2 font-semibold text-amber-300 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{expiringCount} item{expiringCount > 1 ? 's' : ''} expiring soon</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Cook today to eliminate kitchen food waste!
              </p>
            </Link>
          ) : (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[#D9E9A5]" />
              <span>Pantry status healthy!</span>
            </div>
          )}

          <div className="mt-4 text-[11px] text-white/40 text-center">
            IngrAIent • Turn ingredients into inspiration.
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#244C3A] text-white flex items-center justify-between px-4 z-30 shadow-md">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D9E9A5] flex items-center justify-center text-[#244C3A]">
            <Leaf className="w-5 h-5 fill-[#244C3A]" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Ingr<span className="text-[#D9E9A5]">AI</span>ent
          </span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white/10 text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#244C3A] z-20 p-4 flex flex-col justify-between">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium ${
                    isActive
                      ? 'bg-[#D9E9A5] text-[#244C3A] font-semibold'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="text-xs text-white/50 text-center pb-6">
            IngrAIent • Turn ingredients into inspiration.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
