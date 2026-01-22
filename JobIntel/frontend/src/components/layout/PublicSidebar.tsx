import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bookmark,
  Bell,
  Settings,
  User,
  MessageCircle,
  Crown,
  ChevronLeft,
  Menu,
  Zap,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Briefcase, label: 'Browse Jobs', path: '/jobs' },
  { icon: Zap, label: 'Matched Jobs', path: '/matched-jobs' },
  { icon: Sparkles, label: '✨ Best Fit Jobs', path: '/best-fit-jobs', badge: 'NEW' },
  { icon: Briefcase, label: 'All Jobs', path: '/all-jobs' },
  { icon: FileText, label: 'My Applications', path: '/applications' },
  { icon: Bookmark, label: 'Saved Jobs', path: '/saved' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Crown, label: 'Premium', path: '/pricing' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface PublicSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PublicSidebar({ collapsed = false, onToggleCollapse }: PublicSidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Fetch matched jobs for sidebar
  useEffect(() => {
    if (!user?.id) return;

    const fetchMatches = async () => {
      try {
        setLoadingMatches(true);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/ai/best-fit-jobs/${user.id}?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const jobs = Array.isArray(data) ? data : (data.data || []);
          setMatchedJobs(jobs.slice(0, 10));
        }
      } catch (e) {
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchMatches();
    const iv = setInterval(fetchMatches, 30000); // Refresh every 30 seconds
    return () => clearInterval(iv);
  }, [user?.id]);

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <span className="text-white font-bold text-sm">JI</span>
              </div>
              <span className="font-bold text-foreground">JobIntel</span>
            </div>
          )}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <Badge className="bg-yellow-500 text-white text-xs ml-2 h-5 px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            );
          })}

          {/* Matched Jobs Section */}
          {!collapsed && matchedJobs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Target className="h-4 w-4" />
                <span>Your Matches ({matchedJobs.length})</span>
              </div>
              <div className="space-y-1">
                {matchedJobs.map((job: any, idx: number) => (
                  <NavLink
                    key={job.jobId || idx}
                    to={`/matched-jobs?jobId=${job.jobId}`}
                    className={cn(
                      'flex items-start gap-2 rounded-lg px-3 py-2 text-xs transition-colors group',
                      'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 flex-shrink-0 text-green-500" />
                        <span className="font-medium truncate">{job.title || `Match ${idx + 1}`}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Badge variant="outline" className="text-xs h-5 px-1">
                          {job.matchScore || 65}/100
                        </Badge>
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
              <NavLink
                to="/matched-jobs"
                className="flex items-center justify-center gap-2 mt-3 px-3 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>View All Matches</span>
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}